import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function roundQty(n) {
  return Math.round(n * 1000) / 1000;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'manager', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { t0, t1, items } = await req.json();
    if (!t0 || !t1 || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 't0, t1 and items[] are required' }, { status: 400 });
    }

    const t0Date = new Date(t0);
    const t1Date = new Date(t1);
    const reports = [];

    for (const { inventory_item_id, actual_count } of items) {
      const item = await base44.asServiceRole.entities.InventoryItem.get(inventory_item_id);
      if (!item) continue;

      const allTx = await base44.asServiceRole.entities.InventoryTransaction.filter(
        { inventory_item_id },
        "-created_date",
        2000
      );

      let sumAfterT0 = 0;
      let purchases = 0;
      let salesDeductions = 0;
      let waste = 0;

      for (const tx of allTx) {
        const txDate = new Date(tx.created_date);
        if (txDate > t0Date) sumAfterT0 += tx.qty_change_base_unit;
        if (txDate >= t0Date && txDate <= t1Date) {
          if (tx.transaction_type === 'Purchase_Invoice') purchases += tx.qty_change_base_unit;
          else if (['Sales_Deduction', 'Modifier_Credit', 'Modifier_Debit'].includes(tx.transaction_type)) salesDeductions += tx.qty_change_base_unit;
          else if (tx.transaction_type === 'Waste_Log') waste += tx.qty_change_base_unit;
        }
      }

      const startingStock = (item.current_stock_base_qty || 0) - sumAfterT0;
      const theoretical = roundQty(startingStock + purchases + salesDeductions + waste);
      const actual = roundQty(Number(actual_count) || 0);
      const variance = roundQty(actual - theoretical);
      const mac = item.moving_average_cost || item.cost_per_base_unit || 0;
      const financialImpact = Math.abs(variance) * mac;

      const report = await base44.asServiceRole.entities.AuditReport.create({
        inventory_item_id,
        item_name: item.name,
        unit: item.base_unit,
        theoretical_stock: theoretical,
        actual_count: actual,
        variance,
        financial_impact_pkr: financialImpact,
        mac_used: mac,
        audit_window_t0: t0,
        audit_window_t1: t1,
        auditor_email: user.email
      });
      reports.push(report);

      if (variance !== 0) {
        // Atomic increment avoids clobbering any sale/purchase that lands on this item
        // between the read above and this write.
        await base44.asServiceRole.entities.InventoryTransaction.create({
          inventory_item_id,
          transaction_type: 'Manual_Audit_Adjustment',
          qty_change_base_unit: variance,
          unit_cost_at_time: mac,
          created_by: user.email,
          is_negative_flag: (item.current_stock_base_qty || 0) + variance < 0,
          notes: `Audit adjustment ${t0} to ${t1}`
        });
        await base44.asServiceRole.entities.InventoryItem.updateMany(
          { id: inventory_item_id },
          { $inc: { current_stock_base_qty: variance } }
        );
        const updated = await base44.asServiceRole.entities.InventoryItem.get(inventory_item_id);
        const negativeFlag = roundQty(updated.current_stock_base_qty || 0) < 0;
        if (negativeFlag !== updated.is_negative_flagged) {
          await base44.asServiceRole.entities.InventoryItem.update(inventory_item_id, { is_negative_flagged: negativeFlag });
        }
      }
    }

    return Response.json({ success: true, reports });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});