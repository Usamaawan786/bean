import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

function toPktParts(utcMs) {
  const pkt = new Date(utcMs + PKT_OFFSET_MS);
  const iso = pkt.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 19) };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'super_admin', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { start_date, end_date } = body;
    if (!start_date || !end_date) {
      return Response.json({ error: 'start_date and end_date are required (YYYY-MM-DD)' }, { status: 400 });
    }

    // Convert PKT date boundaries to UTC
    const startUTC = new Date(start_date + 'T00:00:00+05:00').toISOString();
    const endUTC = new Date(end_date + 'T23:59:59.999+05:00').toISOString();

    // Fetch all sales in range (paginated)
    const allSales = [];
    let cursor;
    let hasMore = true;
    while (hasMore) {
      const page = await base44.asServiceRole.entities.StoreSale.filter(
        { created_date: { $gte: startUTC, $lte: endUTC } },
        { sort: 'created_date', limit: 500, cursor, fields: ['bill_number', 'payment_method', 'subtotal', 'tax', 'total_amount', 'discount_amount', 'created_date', 'cashier_name', 'order_type'] }
      );
      allSales.push(...(page.items || []));
      cursor = page.next_cursor;
      hasMore = page.has_more;
    }

    // Build line items with PKT timestamps and effective tax rate
    const lineItems = allSales.map(s => {
      const createdMs = new Date(s.created_date).getTime();
      const { date, time } = toPktParts(createdMs);
      const subtotal = s.subtotal || 0;
      const tax = s.tax || 0;
      const rate = subtotal > 0 ? (tax / subtotal * 100) : 0;
      return {
        bill_number: s.bill_number || '',
        date,
        time,
        payment_method: s.payment_method || '',
        subtotal: +subtotal.toFixed(2),
        tax_rate: +rate.toFixed(2),
        tax_amount: +tax.toFixed(2),
        total: +(s.total_amount || 0).toFixed(2),
        discount_amount: +(s.discount_amount || 0).toFixed(2),
        order_type: s.order_type || '',
        cashier: s.cashier_name || ''
      };
    });

    // Summary by payment method
    const summaryMap = {};
    lineItems.forEach(item => {
      const pm = item.payment_method || 'Unknown';
      if (!summaryMap[pm]) summaryMap[pm] = { payment_method: pm, count: 0, subtotal: 0, tax: 0, total: 0 };
      const g = summaryMap[pm];
      g.count++;
      g.subtotal += item.subtotal;
      g.tax += item.tax_amount;
      g.total += item.total;
    });

    const summary = Object.values(summaryMap).map(g => ({
      payment_method: g.payment_method,
      count: g.count,
      subtotal: +g.subtotal.toFixed(2),
      tax: +g.tax.toFixed(2),
      total: +g.total.toFixed(2)
    }));

    const grandTotal = {
      count: lineItems.length,
      subtotal: +lineItems.reduce((a, b) => a + b.subtotal, 0).toFixed(2),
      tax: +lineItems.reduce((a, b) => a + b.tax_amount, 0).toFixed(2),
      total: +lineItems.reduce((a, b) => a + b.total, 0).toFixed(2)
    };

    return Response.json({
      period: { start_date, end_date, start_utc: startUTC, end_utc: endUTC },
      summary,
      grandTotal,
      lineItems,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('generatePraTaxReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}