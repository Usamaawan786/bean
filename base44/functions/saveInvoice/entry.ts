import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Creates a Draft invoice together with its line items in one atomic call.
// Used for both new invoices and one-click clones (cloned_from carries the
// source invoice number). The total_amount is recomputed server-side from the
// line items so the header always matches the stored lines.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'manager', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { type, date, supplier_name, branch_name, comments, items, cloned_from } = body;
    if (!type || !date || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Missing required fields (type, date, items)' }, { status: 400 });
    }
    if (!['PURCHASE_INVOICE', 'EXPENDITURE_INVOICE'].includes(type)) {
      return Response.json({ error: 'Invalid invoice type' }, { status: 400 });
    }

    // Generate a readable, collision-resistant invoice number.
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const invoice_number = 'INV-' + yy + mm + dd + '-' + hh + mi + ss;

    const computedItems = items.map((it) => {
      const qty = Number(it.quantity) || 0;
      const cost = Number(it.unit_cost) || 0;
      return {
        item_id: it.item_id || '',
        item_name: it.item_name || '',
        unit: it.unit || '',
        unit_cost: cost,
        quantity: qty,
        line_total: Math.round(qty * cost * 100) / 100
      };
    });
    const total_amount = Math.round(
      computedItems.reduce((s, i) => s + i.line_total, 0) * 100
    ) / 100;

    const invoice = await base44.asServiceRole.entities.Invoice.create({
      invoice_number,
      type,
      date,
      supplier_name: supplier_name || '',
      branch_name: branch_name || '',
      comments: comments || '',
      total_amount,
      status: 'Draft',
      cloned_from: cloned_from || ''
    });

    await base44.asServiceRole.entities.InvoiceItem.bulkCreate(
      computedItems.map((it) => ({ ...it, invoice_id: invoice.id }))
    );

    return Response.json({ success: true, invoice_id: invoice.id, invoice_number, total_amount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}