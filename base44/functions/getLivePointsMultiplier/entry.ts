import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Returns the live points multiplier for the signed-in customer.
// PointsCampaign is admin/manager-only on read, so customers read the
// multiplier through this function instead of the entity directly.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const campaigns = await base44.asServiceRole.entities.PointsCampaign.filter({ is_active: true });
    const now = new Date();
    let best = null;
    for (const c of campaigns) {
      if (!c.multiplier || c.multiplier <= 1) continue;
      if (c.start_at && now < new Date(c.start_at)) continue;
      if (c.end_at && now > new Date(c.end_at)) continue;
      if (!best || c.multiplier > best.multiplier) best = c;
    }

    return Response.json({
      multiplier: best ? best.multiplier : 1,
      ends_at: best?.end_at || null,
      name: best?.name || null,
    });
  } catch (error) {
    return Response.json({ multiplier: 1, ends_at: null, error: error.message });
  }
}