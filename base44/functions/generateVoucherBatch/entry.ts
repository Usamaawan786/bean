import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Creates a batch of pre-printed discount vouchers with simple numeric codes —
// the card stock the shop gets printed and hands out with a bill.
//
// The codes are 7 digits (no letters, easy to read out and type at the till) and
// are checked against every existing voucher before being reserved, so no two
// cards can ever share a code. Each one is still single-use: honouring a printed
// card goes through redeemDiscountVoucher, which flips it once and only once.
const BATCH_ROLES = ['manager', 'admin', 'super_admin'];
const MIN_CODE = 1000000;
const MAX_CODE = 9999999;

function randomCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(MIN_CODE + (bytes[0] % (MAX_CODE - MIN_CODE + 1)));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!BATCH_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden — managers only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(Number(body?.count) || 100, 1), 200);

    const discount_pct = Number(body?.discount_pct) || 15;
    if (!Number.isFinite(discount_pct) || discount_pct < 1 || discount_pct > 50) {
      return Response.json({ error: 'Discount must be between 1% and 50%' }, { status: 400 });
    }

    const valid_days = Math.min(Math.max(Number(body?.valid_days) || 365, 1), 365);

    // Reserve codes: draw a pool, drop anything already used, repeat for the rest.
    const picked = new Set();
    let guard = 0;
    while (picked.size < count && guard < 20) {
      guard++;
      const pool = new Set();
      while (pool.size < count - picked.size) pool.add(randomCode());
      const candidates = [...pool].filter((c) => !picked.has(c));
      const clashes = await base44.asServiceRole.entities.DiscountVoucher.filter({ code: { $in: candidates } });
      const taken = new Set(clashes.map((r) => r.code));
      candidates.forEach((c) => { if (!taken.has(c)) picked.add(c); });
    }

    const codes = [...picked];
    if (codes.length < count) {
      return Response.json({ error: 'Could not reserve enough unique codes — please try again' }, { status: 500 });
    }

    const now = Date.now();
    const issued_at = new Date(now).toISOString();
    const expires_at = new Date(now + valid_days * 24 * 60 * 60 * 1000).toISOString();

    const created = await base44.entities.DiscountVoucher.bulkCreate(
      codes.map((code) => ({
        code,
        discount_pct,
        status: 'issued',
        issued_at,
        expires_at,
        issued_by: user.email,
        issued_by_name: user.full_name || user.email,
      }))
    );

    return Response.json({
      created: Array.isArray(created) ? created.length : codes.length,
      codes,
      discount_pct,
      expires_at,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});