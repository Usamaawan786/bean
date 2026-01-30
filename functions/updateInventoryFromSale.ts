import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function is designed to be triggered by entity automation only
    // Validate the request comes from Base44 automation system
    const { event, data } = await req.json();
    
    if (event.type !== 'create' || event.entity_name !== 'StoreSale') {
      return Response.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Get all inventory items
    const inventoryItems = await base44.asServiceRole.entities.Inventory.list();
    
    // Map of product names to inventory items (simple name matching)
    const inventoryMap = {};
    inventoryItems.forEach(item => {
      inventoryMap[item.name.toLowerCase()] = item;
    });

    // Process each item in the sale
    const updates = [];
    for (const saleItem of data.items || []) {
      const productName = saleItem.product_name.toLowerCase();
      
      // Try to find matching inventory item
      // This is a simple match - could be enhanced with better mapping
      const inventoryItem = inventoryMap[productName] || 
                           inventoryItems.find(item => 
                             productName.includes(item.name.toLowerCase()) ||
                             item.name.toLowerCase().includes(productName)
                           );
      
      if (inventoryItem && inventoryItem.is_active) {
        const quantityToDeduct = saleItem.quantity || 1;
        const newStock = Math.max(0, inventoryItem.current_stock - quantityToDeduct);
        
        // Update inventory
        await base44.asServiceRole.entities.Inventory.update(inventoryItem.id, {
          current_stock: newStock
        });
        
        // Create adjustment record
        await base44.asServiceRole.entities.StockAdjustment.create({
          inventory_id: inventoryItem.id,
          item_name: inventoryItem.name,
          adjustment_type: 'sale',
          quantity_changed: -quantityToDeduct,
          previous_stock: inventoryItem.current_stock,
          new_stock: newStock,
          reason: `Auto-deducted from sale #${data.bill_number}`,
          sale_id: data.id || event.entity_id
        });
        
        updates.push({
          item: inventoryItem.name,
          deducted: quantityToDeduct,
          new_stock: newStock
        });
      }
    }

    return Response.json({
      success: true,
      message: `Updated ${updates.length} inventory items`,
      updates
    });

  } catch (error) {
    console.error('Error updating inventory:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});