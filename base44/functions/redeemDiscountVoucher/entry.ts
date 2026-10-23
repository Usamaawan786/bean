import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Verifies and honours a single-use discount voucher from the counter.
//
// The redeem is atomic + once-only: updateMany only ever flips a voucher that is
// still 'issued', so two cashiers tapping at the same moment can never discount
// the same voucher twice. Expiry is decided here on the server clock — a lapsed
// voucher is marked expired and can never be honoured, and a voided voucher is
// refused outright.
const STAFF_ROLES = ['cashier', 'manager', 'admin', 'super_admin'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!STAFF_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden — staff only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const code = (body?.code || '').toString().trim().toUpperCase();
    const redeem = body?.action === 'redeem';
    if (!code) return Response.json({ error: 'Missing voucher code' }, { status: 400 });

    // Vouchers are staff-readable only, but the lookup goes through the service
    // role so verification never depends on the caller's RLS.
    const matches = await base44.asServiceRole.entities.DiscountVoucher.filter({ code });
    if (matches.length === 0) return Response.json({ valid: false, reason: 'not_found' });

    const v = matches[0];
    const safe = {
      code: v.code,
      discount_pct: v.discount_pct,
      status: v.status,
      customer_name: v.customer_name,
      customer_email: v.customer_email,
      customer_phone: v.customer_phone,
      issued_at: v.issued_at,
      expires_at: v.expires_at,
      issued_by_name: v.issued_by_name,
      redeemed_at: v.redeemed_at,
      redeemed_by_name: v.redeemed_by_name,
      void_reason: v.void_reason,
    };

    if (v.status === 'voided') return Response.json({ valid: false, reason: 'voided', voucher: safe });
    if (v.status === 'redeemed') return Response.json({ valid: false, reason: 'already_redeemed', voucher: safe });

    const lapsed = v.expires_at ? new Date(v.expires_at).getTime() < Date.now() : false;
    if (v.status === 'expired' || lapsed) {
      if (v.status !== 'expired') {
        await base44.asServiceRole.entities.DiscountVoucher.updateMany(
          { code, status: 'issued' },
          { $set: { status: 'expired' } }
        );
      }
      return Response.json({ valid: false, reason: 'expired', voucher: { ...safe, status: 'expired' } });
    }

    if (!redeem) return Response.json({ valid: true, reason: 'issued', voucher: safe });

    // Atomic once-only redeem: only a still-issued voucher is flipped.
    const nowIso = new Date().toISOString();
    const staffName = user.full_name || user.email;
    const res = await base44.asServiceRole.entities.DiscountVoucher.updateMany(
      { code, status: 'issued' },
      { $set: { status: 'redeemed', redeemed_at: nowIso, redeemed_by: user.email, redeemed_by_name: staffName } }
    );
    const modified = res?.modified ?? res?.updated ?? res?.count ?? 0;
    if (modified > 0) {
      return Response.json({
        valid: true,
        redeemed: true,
        voucher: { ...safe, status: 'redeemed', redeemed_at: nowIso, redeemed_by_name: staffName },
      });
    }

    // Another tap (or another cashier) already honoured it.
    const after = await base44.asServiceRole.entities.DiscountVoucher.filter({ code });
    const latest = after[0] || v;
    return Response.json({
      valid: false,
      reason: 'already_redeemed',
      voucher: { ...safe, status: latest.status, redeemed_at: latest.redeemed_at, redeemed_by_name: latest.redeemed_by_name },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});