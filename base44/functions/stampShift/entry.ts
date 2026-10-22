import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Opens / closes a POS shift with SERVER time.
// The POS tablet's clock cannot be trusted (it has run ~12h ahead at times),
// and shift open/close times drive the "By Shift" reporting — so both
// timestamps are stamped here instead of being sent by the client.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['cashier', 'manager', 'admin', 'super_admin'].includes(user?.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch (e) { body = {}; }
    const now = new Date().toISOString();

    if (body.action === 'open') {
      const float = Number(body.opening_float);
      if (!Number.isFinite(float) || float < 0) {
        return Response.json({ error: 'Enter a valid opening float amount' }, { status: 400 });
      }
      const shift = await base44.entities.Shift.create({
        shift_type: body.shift_type === 'evening' ? 'evening' : 'morning',
        status: 'open',
        opened_by: user.email,
        opened_by_name: user.full_name || user.email,
        opened_at: now,
        opening_float: float,
        counter: body.counter === 'counter_2' ? 'counter_2' : 'counter_1'
      });
      return Response.json({ shift, opened_at: now });
    }

    if (body.action === 'close') {
      if (!body.shift_id) return Response.json({ error: 'shift_id is required' }, { status: 400 });
      const shift = await base44.entities.Shift.update(body.shift_id, {
        status: 'closed',
        closing_float: Number(body.closing_float) || 0,
        cash_variance: Number(body.cash_variance) || 0,
        closed_by: user.email,
        closed_by_name: user.full_name || user.email,
        closed_at: now
      });
      return Response.json({ shift, closed_at: now });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}