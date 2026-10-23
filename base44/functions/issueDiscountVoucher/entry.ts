import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Issues a single-use discount voucher — the card handed to the customer at the
// end of a meal, honoured on their next visit.
//
// Anti-abuse by design:
//  - the code is generated HERE, with crypto randomness (never on the client)
//    and checked against every existing code — two vouchers can never share one;
//  - the discount is capped and the validity window is stamped on the server;
//  - the issuing staff member is recorded for the audit trail.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 — safe to read aloud
const STAFF_ROLES = ['cashier', 'manager', 'admin', 'super_admin'];

function randomBlock(size) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes); // 256 % 32 === 0 → zero modulo bias
  let out = '';
  for (let i = 0; i < size; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!STAFF_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden — staff only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const discount_pct = Number(body?.discount_pct);
    if (!Number.isFinite(discount_pct) || discount_pct < 1 || discount_pct > 50) {
      return Response.json({ error: 'Discount must be between 1% and 50%' }, { status: 400 });
    }

    const valid_days = Number(body?.valid_days) || 30;
    if (!Number.isFinite(valid_days) || valid_days < 1 || valid_days > 365) {
      return Response.json({ error: 'Validity must be between 1 and 365 days' }, { status: 400 });
    }

    const customer_name = (body?.customer_name || '').toString().trim() || null;
    const customer_email = (body?.customer_email || '').toString().trim().toLowerCase() || null;
    const customer_phone = (body?.customer_phone || '').toString().trim() || null;
    const source_bill_number = (body?.source_bill_number || '').toString().trim() || null;

    // Unique code — regenerate on the (very unlikely) collision.
    let code = null;
    for (let attempt = 0; attempt < 10 && !code; attempt++) {
      const candidate = `BEAN-${randomBlock(4)}-${randomBlock(4)}`;
      const clash = await base44.asServiceRole.entities.DiscountVoucher.filter({ code: candidate });
      if (clash.length === 0) code = candidate;
    }
    if (!code) {
      return Response.json({ error: 'Could not generate a unique code — please try again' }, { status: 500 });
    }

    const now = Date.now();
    const voucher = await base44.entities.DiscountVoucher.create({
      code,
      discount_pct,
      status: 'issued',
      customer_name,
      customer_email,
      customer_phone,
      source_bill_number,
      issued_at: new Date(now).toISOString(),
      expires_at: new Date(now + valid_days * 24 * 60 * 60 * 1000).toISOString(),
      issued_by: user.email,
      issued_by_name: user.full_name || user.email,
    });

    return Response.json({ voucher });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});