import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    for (const row of recipeRows) {
      const deductQty = row.required_qty_base_unit * multiplier * (1 + (row.loss_pct || 0) / 100);
      const item = await base44.asServiceRole.entities.InventoryItem.get(row.inventory_item_id);
      if (!item) continue;
      const newStock = (item.current_stock_base_qty || 0) - deductQty;

      await base44.asServiceRole.entities.InventoryTransaction.create({
        inventory_item_id: row.inventory_item_id,
        transaction_type: 'Batch_Production_Debit',
        qty_change_base_unit: -deductQty,
        unit_cost_at_time: item.moving_average_cost || item.cost_per_base_unit || 0,
        batch_id,
        created_by: user.email,
        is_negative_flag: newStock < 0,
        notes: `Produced batch: ${batch.name}`
      });

      await base44.asServiceRole.entities.InventoryItem.update(row.inventory_item_id, {
        current_stock_base_qty: newStock,
        is_negative_flagged: newStock < 0
      });
    }

    const outputItem = await base44.asServiceRole.entities.InventoryItem.get(batch.output_inventory_item_id);
    const yieldQty = batch.batch_yield_qty_base_unit * multiplier;
    const newOutputStock = (outputItem?.current_stock_base_qty || 0) + yieldQty;

    await base44.asServiceRole.entities.InventoryTransaction.create({
      inventory_item_id: batch.output_inventory_item_id,
      transaction_type: 'Batch_Production_Credit',
      qty_change_base_unit: yieldQty,
      unit_cost_at_time: outputItem?.moving_average_cost || 0,
      batch_id,
      created_by: user.email,
      is_negative_flag: newOutputStock < 0,
      notes: `Produced batch: ${batch.name}`
    });

    await base44.asServiceRole.entities.InventoryItem.update(batch.output_inventory_item_id, {
      current_stock_base_qty: newOutputStock,
      is_negative_flagged: newOutputStock < 0
    });

    await base44.asServiceRole.entities.CompositeBatch.update(batch_id, {
      last_produced_at: new Date().toISOString()
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});