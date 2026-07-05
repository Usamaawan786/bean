import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['admin', 'super_admin', 'manager', 'cashier'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const rawQuery = (body.query || '').trim().toLowerCase();
    if (!rawQuery) {
      return Response.json({ success: true, customers: [] });
    }

    // Service-role fetch — Customer + User join happens server-side, only 20
    // matched records leave the backend, and non-staff-sensitive fields only.
    const [customers, users] = await Promise.all([
      base44.asServiceRole.entities.Customer.list('-created_date', 500),
      base44.asServiceRole.entities.User.list()
    ]);

    const userMap = {};
    users.forEach(u => { userMap[u.email] = u; });

    const includeEmail = ['admin', 'super_admin', 'manager'].includes(user.role);

    const matched = customers.filter(c => {
      const u = userMap[c.user_email || c.created_by];
      const name = (u?.full_name || u?.display_name || c.display_name || '').toLowerCase();
      const email = (c.user_email || c.created_by || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      return name.includes(rawQuery) || email.includes(rawQuery) || phone.includes(rawQuery);
    }).slice(0, 20).map(c => {
      const u = userMap[c.user_email || c.created_by];
      return {
        id: c.id,
        display_name: u?.full_name || u?.display_name || c.display_name || 'Unknown',
        email: includeEmail ? (c.user_email || c.created_by) : undefined,
        phone: c.phone || undefined,
        points_balance: c.points_balance || 0,
        total_points_earned: c.total_points_earned || 0,
        total_spend_pkr: c.total_spend_pkr || 0,
        tier: c.tier || 'Bronze',
        is_founding_member: !!c.is_founding_member,
        is_eba: !!c.is_eba,
        fm_discount_used: c.fm_discount_used || 0,
        eba_discount_used: c.eba_discount_used || 0,
        referral_code: c.referral_code || undefined
      };
    });

    return Response.json({ success: true, customers: matched });
  } catch (error) {
    console.error('searchCustomer error:', error);
    return Response.json({ success: false, error: error.message || 'Unexpected error' }, { status: 500 });
  }
});