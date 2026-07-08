import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Verifies a loyalty reward redemption code and (optionally) marks it claimed.
// Claim is atomic + once-only: updateMany only flips a still-pending record,
// so two cashiers tapping at once can never double-claim the same code.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const allowed = ['cashier', 'manager', 'admin', 'super_admin'];
    if (!allowed.includes(user.role)) {
      return Response.json({ error: 'Forbidden — staff only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const code = (body?.redemption_code || '').toString().trim().toUpperCase();
    const claim = body?.claim === true;
    if (!code) return Response.json({ error: 'Missing redemption code' }, { status: 400 });

    // Redemption records are customer-readable; cashiers aren't the customer,
    // so lookups must go through the service role here.
    const matches = await base44.asServiceRole.entities.Redemption.filter({ redemption_code: code });
    if (matches.length === 0) {
      return Response.json({ valid: false, reason: 'not_found' });
    }
    const r = matches[0];
    const safe = {
      reward_name: r.reward_name,
      points_spent: r.points_spent,
      customer_email: r.customer_email,
      status: r.status,
      created_date: r.created_date,
      redemption_code: r.redemption_code
    };

    if (!claim) {
      return Response.json({
        valid: r.status === 'pending',
        reason: r.status,
        redemption: safe
      });
    }

    // Atomic once-only claim: only a still-pending record is flipped to claimed.
    const res = await base44.asServiceRole.entities.Redemption.updateMany(
      { redemption_code: code, status: 'pending' },
      { $set: { status: 'claimed' } }
    );
    const modified = res?.modified ?? res?.updated ?? res?.count ?? 0;
    if (modified > 0) {
      return Response.json({
        valid: true,
        claimed: true,
        redemption: { ...safe, status: 'claimed' }
      });
    }
    // An earlier tap (or another cashier) already claimed it.
    return Response.json({
      valid: false,
      reason: 'already_claimed',
      redemption: { ...safe, status: 'claimed' }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});