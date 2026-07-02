import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['cashier', 'manager', 'admin', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { query } = await req.json();
    if (!query || !query.trim()) return Response.json({ error: 'query is required' }, { status: 400 });
    const q = query.trim();

    // Search across all-time sales history — no date limit — by exact receipt
    // number, QR code id (bill scanning), or phone/name match.
    const [byBillNumber, byQrCode, byPhone] = await Promise.all([
      base44.asServiceRole.entities.StoreSale.filter({ bill_number: q }),
      base44.asServiceRole.entities.StoreSale.filter({ qr_code_id: q }),
      q.length >= 4 ? base44.asServiceRole.entities.StoreSale.filter({ customer_phone: q }) : Promise.resolve([])
    ]);

    const seen = new Set();
    const sales = [...byBillNumber, ...byQrCode, ...byPhone].filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    return Response.json({ success: true, sales: sales.slice(0, 20) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});