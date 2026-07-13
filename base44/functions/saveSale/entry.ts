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

    // Complimentary sales require manager/admin approval and are always zero-charge
    if (enrichedSale.payment_method === 'Complimentary') {
      if (!['admin', 'super_admin', 'manager'].includes(user.role)) {
        return Response.json({ error: 'Complimentary sales require manager or admin approval' }, { status: 403 });
      }
      enrichedSale.total_amount = 0;
    }

    // Sequential B-series bill number (B-001, B-002 … B-999, B-1000).
    // Reads the current max B-series number across all StoreSales, increments,
    // and retries up to 5 times to absorb collisions from concurrent cashiers.
    let sale = null;
    for (let attempt = 0; attempt < 5 && !sale; attempt++) {
      const existing = await base44.asServiceRole.entities.StoreSale.list('-created_date', 10000);
      let maxNum = 0;
      existing.forEach(s => {
        const m = (s.bill_number || '').match(/^B-(\d+)$/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });
      const nextNum = maxNum + 1;
      const padded = nextNum < 1000 ? String(nextNum).padStart(3, '0') : String(nextNum);
      const candidate = `B-${padded}`;
      // A concurrent cashier may have just written this number — retry to recompute
      if (existing.some(s => s.bill_number === candidate)) continue;
      enrichedSale.bill_number = candidate;
      try {
        sale = await base44.asServiceRole.entities.StoreSale.create(enrichedSale);
      } catch (e) {
        // create failed — retry to recompute the next number
      }
    }
    if (!sale) {
      return Response.json({ success: false, error: 'Could not allocate a unique bill number after 5 attempts' }, { status: 500 });
    }

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