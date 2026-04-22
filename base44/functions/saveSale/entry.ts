import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    const sale = await base44.asServiceRole.entities.StoreSale.create(enrichedSale);

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