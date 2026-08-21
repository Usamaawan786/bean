import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { applyPurchaseLine } from "../../shared/stockLedger.ts";

// Submits a Draft invoice: locks it as Submitted and, for PURCHASE_INVOICE,
// fires the stock-ledger trigger — one InventoryTransaction per line plus an
// atomic stock increment and Moving Average Cost recompute on each item.
// EXPENDITURE_INVOICE is record-only (no stock effect).

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'manager', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { invoice_id } = await req.json();
    if (!invoice_id) return Response.json({ error: 'Missing invoice_id' }, { status: 400 });

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });
    if (invoice.status === 'Submitted') {
      return Response.json({ error: 'Invoice already submitted' }, { status: 400 });
    }

    const items = await base44.asServiceRole.entities.InvoiceItem.filter({ invoice_id });
    if (!items.length) return Response.json({ error: 'Invoice has no line items' }, { status: 400 });

    const stockResults = [];
    if (invoice.type === 'PURCHASE_INVOICE') {
      for (const it of items) {
        if (!it.item_id || !(Number(it.quantity) > 0)) continue;
        const res = await applyPurchaseLine(base44, {
          inventory_item_id: it.item_id,
          qty_storage_units: Number(it.quantity),
          cost_per_storage_unit: Number(it.unit_cost),
          invoice_ref: invoice.invoice_number,
          created_by: user.email,
          notes: 'Invoice ' + invoice.invoice_number + ' — ' + it.item_name
        });
        stockResults.push(res);
      }
    }

    const total_amount = Math.round(
      items.reduce((s, i) => s + (Number(i.line_total) || 0), 0) * 100
    ) / 100;

    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      status: 'Submitted',
      submitted_at: new Date().toISOString(),
      submitted_by: user.email,
      submitted_by_name: user.full_name || user.email,
      total_amount
    });

    return Response.json({
      success: true,
      invoice_id,
      invoice_number: invoice.invoice_number,
      type: invoice.type,
      stock_updated: stockResults.length,
      stock_results: stockResults
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}