// Shared stock-ledger helper used by invoice submission (and reusable by any
// purchase-style backend function). Applies a received quantity to an
// InventoryItem: writes an InventoryTransaction, atomically increments stock,
// and recomputes the Moving Average Cost (MAC) per base unit.

export function roundQty(n) {
  return Math.round(n * 1000) / 1000;
}

export async function applyPurchaseLine(base44, opts) {
  const {
    inventory_item_id,
    qty_storage_units,
    cost_per_storage_unit,
    invoice_ref,
    created_by,
    notes
  } = opts;

  const item = await base44.asServiceRole.entities.InventoryItem.get(inventory_item_id);
  if (!item) throw new Error("Inventory item not found: " + inventory_item_id);

  const conversionRate = item.conversion_rate || 1;
  const receivedBaseQty = roundQty(qty_storage_units * conversionRate);
  const newCostPerBase = cost_per_storage_unit / conversionRate;

  const currentStock = item.current_stock_base_qty || 0;
  const oldMAC = item.moving_average_cost || item.cost_per_base_unit || 0;
  const totalQtyAfter = currentStock + receivedBaseQty;
  const newMAC = totalQtyAfter > 0
    ? ((currentStock * oldMAC) + (receivedBaseQty * newCostPerBase)) / totalQtyAfter
    : newCostPerBase;

  await base44.asServiceRole.entities.InventoryTransaction.create({
    inventory_item_id,
    transaction_type: "Purchase_Invoice",
    qty_change_base_unit: receivedBaseQty,
    unit_cost_at_time: newCostPerBase,
    created_by: created_by || "system",
    is_negative_flag: false,
    notes: notes || (invoice_ref ? "Invoice " + invoice_ref : "Purchase invoice")
  });

  // Atomic increment so a concurrent sale/audit on the same item can never be
  // silently overwritten (lost update). MAC recalculation uses the stock value
  // read at the start of this call; purchases are low-frequency/manual so the
  // residual window is acceptable.
  await base44.asServiceRole.entities.InventoryItem.updateMany(
    { id: inventory_item_id },
    { $inc: { current_stock_base_qty: receivedBaseQty } }
  );

  const updated = await base44.asServiceRole.entities.InventoryItem.get(inventory_item_id);
  const newStock = roundQty(updated.current_stock_base_qty || 0);
  await base44.asServiceRole.entities.InventoryItem.update(inventory_item_id, {
    moving_average_cost: newMAC,
    is_negative_flagged: newStock < 0
  });

  return {
    inventory_item_id,
    item_name: item.name,
    received_base_qty: receivedBaseQty,
    new_stock: newStock,
    new_mac: newMAC
  };
}