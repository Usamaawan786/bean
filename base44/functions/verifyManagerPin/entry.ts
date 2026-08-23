import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Verifies the Manager PIN used to override (re-open) a locked EOD
// reconciliation sheet. The PIN is stored as the MANAGER_PIN secret so it
// never appears in client code. Only admin/manager/super_admin users may
// verify. Returns { ok: true } on a correct PIN, { ok: false } otherwise.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'manager', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { pin } = await req.json();
    const expected = Deno.env.get('MANAGER_PIN');
    if (!expected) {
      return Response.json({ error: 'MANAGER_PIN not configured' }, { status: 500 });
    }

    return Response.json({ ok: String(pin ?? '') === expected });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}