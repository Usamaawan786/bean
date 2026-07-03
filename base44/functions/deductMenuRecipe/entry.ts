import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    async function deductIngredient(inventoryItemId, qty, notes) {
      const qtyChange = roundQty(-qty);
      try {
        const item = await base44.asServiceRole.entities.InventoryItem.get(inventoryItemId);
        if (!item) return;

        await base44.asServiceRole.entities.InventoryTransaction.create({
          inventory_item_id: inventoryItemId,
          transaction_type: 'Sales_Deduction',
          qty_change_base_unit: qtyChange,
          unit_cost_at_time: item.moving_average_cost || item.cost_per_base_unit || 0,
          sale_id,
          created_by: actor,
          is_negative_flag: (item.current_stock_base_qty || 0) + qtyChange < 0,
          notes
        });

        await base44.asServiceRole.entities.InventoryItem.updateMany(
          { id: inventoryItemId },
          { $inc: { current_stock_base_qty: qtyChange } }
        );

        const updated = await base44.asServiceRole.entities.InventoryItem.get(inventoryItemId);
        const newStock = roundQty(updated.current_stock_base_qty || 0);
        if ((newStock < 0) !== updated.is_negative_flagged) {
          await base44.asServiceRole.entities.InventoryItem.update(inventoryItemId, { is_negative_flagged: newStock < 0 });
        }
        results.push({ inventory_item_id: inventoryItemId, qty_change: qtyChange, new_stock: newStock });
      } catch (e) {
        console.error('Ingredient deduction failed for', inventoryItemId, e.message);
      }
    }

    for (const saleItem of sale.items || []) {
      const menuItemId = saleItem.product_id;
      if (!menuItemId) continue;
      const qty = saleItem.quantity || 1;

      // MenuItemRecipe rows for this menu item
      let recipes = [];
      try {
        recipes = await base44.asServiceRole.entities.MenuItemRecipe.filter({ menu_item_id: menuItemId });
      } catch (e) {
        // No MenuItemRecipe rows = this item is from the old StoreProduct system, skip
        continue;
      }
      if (recipes.length === 0) continue;

      for (const recipe of recipes) {
        const effectiveQty = (recipe.net_weight_required || 0) * (recipe.waste_percentage_multiplier || 1) * qty;
        await deductIngredient(recipe.inventory_item_id, effectiveQty, `${saleItem.product_name || ''} on ${sale.bill_number}`);
      }

      // MenuModifierRecipe rows for each selected modifier
      for (const modifierId of saleItem.selected_modifiers || []) {
        try {
          const modRecipes = await base44.asServiceRole.entities.MenuModifierRecipe.filter({ menu_modifier_id: modifierId });
          for (const recipe of modRecipes) {
            const effectiveQty = (recipe.net_weight_required || 0) * (recipe.waste_percentage_multiplier || 1) * qty;
            await deductIngredient(recipe.inventory_item_id, effectiveQty, `Modifier on ${sale.bill_number}`);
          }
        } catch (e) {
          console.error('Modifier recipe lookup failed', modifierId, e.message);
        }
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('deductMenuRecipe error:', error);
    return Response.json({ success: false, error: error.message });
  }
});