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

    const { inventory_item_id, qty_received_storage_units, cost_per_storage_unit_pkr, invoice_number, supplier } = await req.json();
    if (!inventory_item_id || !qty_received_storage_units || !cost_per_storage_unit_pkr) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const item = await base44.asServiceRole.entities.InventoryItem.get(inventory_item_id);
    if (!item) return Response.json({ error: 'Inventory item not found' }, { status: 404 });

    const conversionRate = item.conversion_rate || 1;
    const receivedBaseQty = roundQty(qty_received_storage_units * conversionRate);
    const newCostPerBase = cost_per_storage_unit_pkr / conversionRate;

    const currentStock = item.current_stock_base_qty || 0;
    const oldMAC = item.moving_average_cost || item.cost_per_base_unit || 0;
    const totalQtyAfter = currentStock + receivedBaseQty;
    const newMAC = totalQtyAfter > 0
      ? ((currentStock * oldMAC) + (receivedBaseQty * newCostPerBase)) / totalQtyAfter
      : newCostPerBase;

    await base44.asServiceRole.entities.PurchaseInvoice.create({
      inventory_item_id,
      qty_received_storage_units,
      cost_per_storage_unit_pkr,
      invoice_number: invoice_number || '',
      supplier: supplier || item.supplier || ''
    });

    await base44.asServiceRole.entities.InventoryTransaction.create({
      inventory_item_id,
      transaction_type: 'Purchase_Invoice',
      qty_change_base_unit: receivedBaseQty,
      unit_cost_at_time: newCostPerBase,
      created_by: user.email,
      is_negative_flag: false,
      notes: invoice_number ? `Invoice ${invoice_number}` : 'Purchase invoice'
    });

    // Atomic increment for the stock quantity so a concurrent sale/audit on the same
    // item can never be silently overwritten (lost update). The moving-average-cost
    // recalculation above still relies on the stock value read at the start of this
    // call; purchases are low-frequency/manual so this residual window is acceptable.
    await base44.asServiceRole.entities.InventoryItem.updateMany(
      { id: inventory_item_id },
      { $inc: { current_stock_base_qty: receivedBaseQty } }
    );

    const updated = await base44.asServiceRole.entities.InventoryItem.get(inventory_item_id);
    const newStock = roundQty(updated.current_stock_base_qty || 0);
    await base44.asServiceRole.entities.InventoryItem.update(inventory_item_id, {
      moving_average_cost: newMAC,
      is_negative_flagged: newStock < 0,
      ...(supplier ? { supplier } : {})
    });

    return Response.json({ success: true, new_stock: newStock, new_mac: newMAC });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});