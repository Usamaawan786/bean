import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Round to 3 decimals to avoid floating point drift (e.g. 945.9999999999999) from
// repeated increments/decrements.
function roundQty(n) {
  return Math.round(n * 1000) / 1000;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sale_id } = await req.json();
    if (!sale_id) return Response.json({ error: 'sale_id is required' }, { status: 400 });

    const sale = await base44.asServiceRole.entities.StoreSale.get(sale_id);
    if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

    const actor = sale.cashier_email || 'system';
    const results = [];

    async function applyTransaction(inventoryItemId, qtyChangeRaw, transactionType, notes) {
      const qtyChange = roundQty(qtyChangeRaw);
      try {
        const item = await base44.asServiceRole.entities.InventoryItem.get(inventoryItemId);
        if (!item) return;

        await base44.asServiceRole.entities.InventoryTransaction.create({
          inventory_item_id: inventoryItemId,
          transaction_type: transactionType,
          qty_change_base_unit: qtyChange,
          unit_cost_at_time: item.moving_average_cost || item.cost_per_base_unit || 0,
          sale_id,
          created_by: actor,
          is_negative_flag: (item.current_stock_base_qty || 0) + qtyChange < 0,
          notes
        });

        // Atomic increment ($inc) instead of read-then-write: prevents the lost-update
        // race condition when multiple sales deduct the same ingredient concurrently.
        await base44.asServiceRole.entities.InventoryItem.updateMany(
          { id: inventoryItemId },
          { $inc: { current_stock_base_qty: qtyChange } }
        );

        const updated = await base44.asServiceRole.entities.InventoryItem.get(inventoryItemId);
        const newStock = roundQty(updated.current_stock_base_qty || 0);
        const negativeFlag = newStock < 0;
        if (negativeFlag !== updated.is_negative_flagged) {
          await base44.asServiceRole.entities.InventoryItem.update(inventoryItemId, { is_negative_flagged: negativeFlag });
        }

        results.push({ inventory_item_id: inventoryItemId, qty_change: qtyChange, new_stock: newStock });
      } catch (e) {
        console.error('Ingredient transaction failed for item', inventoryItemId, e.message);
      }
    }

    for (const saleItem of sale.items || []) {
      if (saleItem.product_id) {
        const recipeRows = await base44.asServiceRole.entities.Recipe.filter({ product_id: saleItem.product_id });
        for (const row of recipeRows) {
          const deductionQty = row.required_qty_base_unit * (saleItem.quantity || 1) * (1 + (row.loss_pct || 0) / 100);
          await applyTransaction(row.inventory_item_id, -deductionQty, 'Sales_Deduction', `Sale ${sale.bill_number}`);
        }
      }

      for (const modifierId of saleItem.selected_modifiers || []) {
        try {
          const modifier = await base44.asServiceRole.entities.ProductModifier.get(modifierId);
          if (!modifier) continue;
          const qty = saleItem.quantity || 1;

          if (modifier.modifier_type === 'substitution' || modifier.modifier_type === 'removal') {
            if (modifier.base_item_id && modifier.base_item_credit_qty) {
              await applyTransaction(modifier.base_item_id, modifier.base_item_credit_qty * qty, 'Modifier_Credit', `${modifier.modifier_name} on ${sale.bill_number}`);
            }
          }
          if (modifier.modifier_type === 'substitution' || modifier.modifier_type === 'addition') {
            if (modifier.replacement_item_id && modifier.replacement_item_qty) {
              await applyTransaction(modifier.replacement_item_id, -modifier.replacement_item_qty * qty, 'Modifier_Debit', `${modifier.modifier_name} on ${sale.bill_number}`);
            }
          }
        } catch (e) {
          console.error('Modifier processing failed', modifierId, e.message);
        }
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('deductSaleIngredients error:', error);
    // Never let ingredient failures surface as a hard error to the caller.
    return Response.json({ success: false, error: error.message });
  }
});