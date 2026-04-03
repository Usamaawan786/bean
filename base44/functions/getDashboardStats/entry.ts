import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!["admin", "super_admin", "manager"].includes(user?.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // PKT timezone offset: UTC+5
    const now = new Date();
    const pktOffset = 5 * 60 * 60 * 1000;
    const pktNow = new Date(now.getTime() + pktOffset);
    const todayStartPKT = new Date(Date.UTC(pktNow.getUTCFullYear(), pktNow.getUTCMonth(), pktNow.getUTCDate()));
    const weekStartPKT = new Date(todayStartPKT.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStartPKT = new Date(todayStartPKT.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all data via service role (no RLS, no limits)
    const [allSales, allCustomers, allExpenses] = await Promise.all([
      base44.asServiceRole.entities.StoreSale.list('-created_date', 10000),
      base44.asServiceRole.entities.Customer.list('-created_date', 10000),
      base44.asServiceRole.entities.Expense.list('-created_date', 2000),
    ]);

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

    return Response.json({
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
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});