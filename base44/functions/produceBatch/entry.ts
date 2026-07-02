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

    const { batch_id, multiplier = 1 } = await req.json();
    if (!batch_id) return Response.json({ error: 'batch_id is required' }, { status: 400 });

    const batch = await base44.asServiceRole.entities.CompositeBatch.get(batch_id);
    if (!batch) return Response.json({ error: 'Batch not found' }, { status: 404 });

    const recipeRows = await base44.asServiceRole.entities.Recipe.filter({ composite_batch_id: batch_id });

    async function applyDelta(inventoryItemId, qtyChangeRaw, transactionType, notes) {
      const qtyChange = roundQty(qtyChangeRaw);
      const item = await base44.asServiceRole.entities.InventoryItem.get(inventoryItemId);
      if (!item) return;

      await base44.asServiceRole.entities.InventoryTransaction.create({
        inventory_item_id: inventoryItemId,
        transaction_type: transactionType,
        qty_change_base_unit: qtyChange,
        unit_cost_at_time: item.moving_average_cost || item.cost_per_base_unit || 0,
        batch_id,
        created_by: user.email,
        is_negative_flag: (item.current_stock_base_qty || 0) + qtyChange < 0,
        notes
      });

      // Atomic increment avoids lost updates if multiple batches/sales touch this item at once.
      await base44.asServiceRole.entities.InventoryItem.updateMany(
        { id: inventoryItemId },
        { $inc: { current_stock_base_qty: qtyChange } }
      );

      const updated = await base44.asServiceRole.entities.InventoryItem.get(inventoryItemId);
      const negativeFlag = roundQty(updated.current_stock_base_qty || 0) < 0;
      if (negativeFlag !== updated.is_negative_flagged) {
        await base44.asServiceRole.entities.InventoryItem.update(inventoryItemId, { is_negative_flagged: negativeFlag });
      }
    }

    for (const row of recipeRows) {
      const deductQty = row.required_qty_base_unit * multiplier * (1 + (row.loss_pct || 0) / 100);
      await applyDelta(row.inventory_item_id, -deductQty, 'Batch_Production_Debit', `Produced batch: ${batch.name}`);
    }

    const yieldQty = batch.batch_yield_qty_base_unit * multiplier;
    await applyDelta(batch.output_inventory_item_id, yieldQty, 'Batch_Production_Credit', `Produced batch: ${batch.name}`);

    await base44.asServiceRole.entities.CompositeBatch.update(batch_id, {
      last_produced_at: new Date().toISOString()
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});