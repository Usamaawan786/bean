import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!["admin", "super_admin", "manager"].includes(user?.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch (e) { body = {}; }
    const period = body.period || '7days';

    // PKT timezone offset: UTC+5
    const now = new Date();
    const pktOffset = 5 * 60 * 60 * 1000;
    const pktNow = new Date(now.getTime() + pktOffset);
    const todayStartPKT = new Date(Date.UTC(pktNow.getUTCFullYear(), pktNow.getUTCMonth(), pktNow.getUTCDate()));
    const weekStartPKT = new Date(todayStartPKT.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStartPKT = new Date(todayStartPKT.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all data via service role (no RLS, no limits)
    const [rawSales, allCustomers, allExpenses, allShifts] = await Promise.all([
      base44.asServiceRole.entities.StoreSale.list('-created_date', 10000),
      base44.asServiceRole.entities.Customer.list('-created_date', 10000),
      base44.asServiceRole.entities.Expense.list('-created_date', 2000),
      base44.asServiceRole.entities.Shift.list('-opened_at', 200),
    ]);

    // Launch cutoff (July 11, 2026 PKT): pre-launch sales remain in the DB
    // and are queryable via the Sales History tab, but are excluded from all
    // live KPIs (revenue, transactions, avg-order, charts, breakdowns).
    const LAUNCH_DATE = new Date('2026-07-11T00:00:00+05:00');
    const allSales = rawSales.filter(s => new Date(s.created_date) >= LAUNCH_DATE);

    // Segment sales by time period
    const todaySales = allSales.filter(s => new Date(s.created_date) >= todayStartPKT);
    const weekSales = allSales.filter(s => new Date(s.created_date) >= weekStartPKT);
    const monthSales = allSales.filter(s => new Date(s.created_date) >= monthStartPKT);
    const monthExpenses = allExpenses.filter(e => new Date(e.created_date) >= monthStartPKT);

    const sum = (arr, key) => arr.reduce((s, x) => s + (x[key] || 0), 0);

    // Total customers
    const totalCustomers = allCustomers.length;
    const newCustomersToday = allCustomers.filter(c => new Date(c.created_date) >= todayStartPKT).length;
    const newCustomersWeek = allCustomers.filter(c => new Date(c.created_date) >= weekStartPKT).length;

    // Revenue metrics
    const todayRevenue = sum(todaySales, 'total_amount');
    const weekRevenue = sum(weekSales, 'total_amount');
    const monthRevenue = sum(monthSales, 'total_amount');
    const allTimeRevenue = sum(allSales, 'total_amount');

    // Today's stats
    const todayTransactions = todaySales.length;
    const todayAvgOrder = todayTransactions > 0 ? todayRevenue / todayTransactions : 0;
    const todayItemsSold = todaySales.reduce((s, sale) =>
      s + (sale.items?.reduce((a, i) => a + (i.quantity || 0), 0) || 0), 0);

    // Month stats
    const monthTransactions = monthSales.length;
    const monthAvgOrder = monthTransactions > 0 ? monthRevenue / monthTransactions : 0;
    const monthExpenseTotal = sum(monthExpenses, 'amount');
    const monthNetProfit = monthRevenue - monthExpenseTotal;

    // All-time stats
    const allTimeTransactions = allSales.length;
    const allTimeAvgOrder = allTimeTransactions > 0 ? allTimeRevenue / allTimeTransactions : 0;
    const allTimeExpenses = sum(allExpenses, 'amount');
    const allTimeProfit = allTimeRevenue - allTimeExpenses;

    // Payment method breakdown (all time)
    const paymentBreakdown = {};
    allSales.forEach(s => {
      const m = s.payment_method || 'Cash';
      paymentBreakdown[m] = (paymentBreakdown[m] || 0) + 1;
    });

    // Scanned bills
    const scannedTotal = allSales.filter(s => s.is_scanned).length;
    const scanRate = allTimeTransactions > 0 ? ((scannedTotal / allTimeTransactions) * 100).toFixed(1) : 0;

    // Tier breakdown
    const tierBreakdown = {};
    allCustomers.forEach(c => {
      const tier = c.tier || 'Bronze';
      tierBreakdown[tier] = (tierBreakdown[tier] || 0) + 1;
    });

    // Top products (all time)
    const productMap = {};
    allSales.forEach(sale => {
      sale.items?.forEach(item => {
        if (!item.product_name) return;
        if (!productMap[item.product_name]) productMap[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
        productMap[item.product_name].quantity += item.quantity || 0;
        productMap[item.product_name].revenue += (item.price || 0) * (item.quantity || 0);
      });
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Hourly breakdown (today PKT)
    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, orders: 0, revenue: 0 }));
    todaySales.forEach(s => {
      const salePKT = new Date(new Date(s.created_date).getTime() + pktOffset);
      const h = salePKT.getUTCHours();
      hourly[h].orders += 1;
      hourly[h].revenue += s.total_amount || 0;
    });

    // Daily revenue for last 30 days
    const dailyMap = {};
    monthSales.forEach(sale => {
      const salePKT = new Date(new Date(sale.created_date).getTime() + pktOffset);
      const d = `${salePKT.getUTCFullYear()}-${String(salePKT.getUTCMonth() + 1).padStart(2,'0')}-${String(salePKT.getUTCDate()).padStart(2,'0')}`;
      if (!dailyMap[d]) dailyMap[d] = { date: d, revenue: 0, orders: 0 };
      dailyMap[d].revenue += sale.total_amount || 0;
      dailyMap[d].orders += 1;
    });
    const dailyRevenue = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Shift-wise summary — group sales by shift_id (the active shift gets a
    // running tally; closed shifts are frozen). Only post-launch sales are
    // counted so KPIs stay consistent with the rest of the dashboard.
    const shiftSalesMap = {};
    allSales.forEach(s => {
      const sid = s.shift_id;
      if (!sid) return;
      if (!shiftSalesMap[sid]) shiftSalesMap[sid] = { count: 0, revenue: 0, cash: 0, card: 0 };
      shiftSalesMap[sid].count += 1;
      shiftSalesMap[sid].revenue += Number(s.total_amount) || 0;
      if (s.payment_method === 'Cash') shiftSalesMap[sid].cash += Number(s.total_amount) || 0;
      if (s.payment_method === 'Card') shiftSalesMap[sid].card += Number(s.total_amount) || 0;
    });
    const shiftSummary = allShifts.map(shift => {
      const agg = shiftSalesMap[shift.id] || { count: 0, revenue: 0, cash: 0, card: 0 };
      return {
        shift_id: shift.id,
        shift_type: shift.shift_type,
        status: shift.status,
        opened_by_name: shift.opened_by_name || shift.opened_by,
        opened_at: shift.opened_at,
        closed_at: shift.closed_at,
        opening_float: Number(shift.opening_float || 0),
        closing_float: Number(shift.closing_float || 0),
        counter: shift.counter,
        transactions: agg.count,
        revenue: agg.revenue,
        cash: agg.cash,
        card: agg.card
      };
    }).sort((a, b) => (b.opened_at || '').localeCompare(a.opened_at || ''));

    // ---- Period-scoped metrics (dashboard time-range selector) ----
    const PERIOD_LABELS = {
      today: 'Today', yesterday: 'Yesterday',
      '7days': 'Last 7 Days', '30days': 'Last 30 Days',
      '90days': 'Last 90 Days', all: 'All Time'
    };
    const periodLabel = PERIOD_LABELS[period] || 'Last 7 Days';
    let periodStart, periodEnd = null;
    if (period === 'today') {
      periodStart = todayStartPKT;
    } else if (period === 'yesterday') {
      periodStart = new Date(todayStartPKT.getTime() - 1 * 86400000);
      periodEnd = todayStartPKT;
    } else if (period === '7days') {
      periodStart = new Date(todayStartPKT.getTime() - 7 * 86400000);
    } else if (period === '30days') {
      periodStart = new Date(todayStartPKT.getTime() - 30 * 86400000);
    } else if (period === '90days') {
      periodStart = new Date(todayStartPKT.getTime() - 90 * 86400000);
    } else {
      periodStart = LAUNCH_DATE;
    }
    const inPeriod = (d) => {
      const dt = new Date(d);
      if (dt < periodStart) return false;
      if (periodEnd && dt >= periodEnd) return false;
      return true;
    };
    const periodSales = allSales.filter(s => inPeriod(s.created_date));
    const periodExpenses = allExpenses.filter(e => inPeriod(e.created_date));
    const periodRevenue = sum(periodSales, 'total_amount');
    const periodTransactions = periodSales.length;
    const periodAvgOrder = periodTransactions > 0 ? periodRevenue / periodTransactions : 0;
    const periodItemsSold = periodSales.reduce((s, sale) =>
      s + (sale.items?.reduce((a, i) => a + (i.quantity || 0), 0) || 0), 0);
    const periodExpenseTotal = sum(periodExpenses, 'amount');
    const periodNetProfit = periodRevenue - periodExpenseTotal;

    const periodPayment = {};
    periodSales.forEach(s => {
      const m = s.payment_method || 'Cash';
      periodPayment[m] = (periodPayment[m] || 0) + 1;
    });

    const periodProductMap = {};
    periodSales.forEach(sale => {
      sale.items?.forEach(item => {
        if (!item.product_name) return;
        if (!periodProductMap[item.product_name]) periodProductMap[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
        periodProductMap[item.product_name].quantity += item.quantity || 0;
        periodProductMap[item.product_name].revenue += (item.price || 0) * (item.quantity || 0);
      });
    });
    const periodTopProducts = Object.values(periodProductMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    let periodTimeline = [];
    if (period === 'today' || period === 'yesterday') {
      const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, orders: 0, revenue: 0 }));
      periodSales.forEach(s => {
        const salePKT = new Date(new Date(s.created_date).getTime() + pktOffset);
        const h = salePKT.getUTCHours();
        buckets[h].orders += 1;
        buckets[h].revenue += s.total_amount || 0;
      });
      periodTimeline = buckets.filter((_, i) => i >= 7 && i <= 23).map(b => ({ date: b.hour, revenue: b.revenue, orders: b.orders }));
    } else {
      const map = {};
      periodSales.forEach(sale => {
        const salePKT = new Date(new Date(sale.created_date).getTime() + pktOffset);
        const d = `${salePKT.getUTCFullYear()}-${String(salePKT.getUTCMonth() + 1).padStart(2, '0')}-${String(salePKT.getUTCDate()).padStart(2, '0')}`;
        if (!map[d]) map[d] = { date: d, revenue: 0, orders: 0 };
        map[d].revenue += sale.total_amount || 0;
        map[d].orders += 1;
      });
      periodTimeline = Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ date: d.date.slice(5), revenue: d.revenue, orders: d.orders }));
    }

    return Response.json({
      // Period-scoped (driven by selector)
      period: {
        label: periodLabel,
        revenue: periodRevenue,
        transactions: periodTransactions,
        avgOrder: periodAvgOrder,
        itemsSold: periodItemsSold,
        expenses: periodExpenseTotal,
        netProfit: periodNetProfit,
        topProducts: periodTopProducts,
        paymentBreakdown: periodPayment,
        timeline: periodTimeline,
      },

      // Customer stats
      totalCustomers,
      newCustomersToday,
      newCustomersWeek,
      tierBreakdown,

      // Revenue
      todayRevenue,
      weekRevenue,
      monthRevenue,
      allTimeRevenue,

      // Transaction counts
      todayTransactions,
      weekTransactions: weekSales.length,
      monthTransactions,
      allTimeTransactions,

      // Average order values
      todayAvgOrder,
      monthAvgOrder,
      allTimeAvgOrder,

      // Items sold
      todayItemsSold,

      // Expenses & profit
      monthExpenseTotal,
      monthNetProfit,
      allTimeExpenses,
      allTimeProfit,

      // Scan/rewards
      scannedTotal,
      scanRate: parseFloat(scanRate),

      // Breakdowns for charts
      paymentBreakdown,
      topProducts,
      hourly: hourly.filter((_, i) => i >= 7 && i <= 23),
      dailyRevenue,
      shiftSummary,
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});