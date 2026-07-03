import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['admin', 'super_admin', 'manager', 'cashier'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { saleData } = body;

    if (!saleData) {
      return Response.json({ error: 'saleData is required' }, { status: 400 });
    }

    // Stamp with cashier identity for audit trail
    const enrichedSale = {
      ...saleData,
      cashier_email: user.email,
      cashier_name: user.full_name || user.email,
      cashier_role: user.role,
    };

    // Auto-generate sequential bill number: A1, A2, A3, ...
    const recentSales = await base44.asServiceRole.entities.StoreSale.list('-created_date', 20);
    let maxNum = 0;
    for (const sale of recentSales) {
      const match = sale.bill_number?.match(/^A(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }

    let billNumber = `A${maxNum + 1}`;

    // Collision check (handles race conditions when two cashiers save simultaneously)
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await base44.asServiceRole.entities.StoreSale.filter({ bill_number: billNumber });
      if (existing.length === 0) break;
      maxNum++;
      billNumber = `A${maxNum + 1}`;
    }

    enrichedSale.bill_number = billNumber;

    const sale = await base44.asServiceRole.entities.StoreSale.create(enrichedSale);

    // Deduct recipe/modifier ingredients from inventory. Fire-and-forget so a
    // failure here never blocks the sale from completing.
    base44.asServiceRole.functions.invoke('deductSaleIngredients', { sale_id: sale.id })
      .catch(err => console.error('Ingredient deduction failed:', err));
    base44.asServiceRole.functions.invoke('deductMenuRecipe', { sale_id: sale.id })
      .catch(err => console.error('Menu recipe deduction failed:', err));

    // Process referral rewards if customer email exists
    if (saleData.scanned_by) {
      await base44.asServiceRole.functions.invoke('processSaleReferralRewards', {
        customerEmail: saleData.scanned_by,
        totalSpend: saleData.total_amount || 0
      }).catch(err => console.error('Referral rewards failed:', err));
    }

    return Response.json({ success: true, sale });
  } catch (error) {
    console.error('Error saving sale:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});