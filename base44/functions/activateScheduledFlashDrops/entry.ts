import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled automation (no user) OR an admin invoking manually.
    // Block any non-admin user from triggering directly.
    const user = await base44.auth.me();
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();

    // 1. Activate upcoming drops whose start_time has arrived
    const upcoming = await base44.asServiceRole.entities.FlashDrop.filter({ status: 'upcoming' });
    let activated = 0;
    for (const drop of upcoming) {
      if (drop.start_time && new Date(drop.start_time) <= now) {
        await base44.asServiceRole.entities.FlashDrop.update(drop.id, { status: 'active' });
        activated++;
      }
    }

    // 2. End active drops whose end_time has passed
    const active = await base44.asServiceRole.entities.FlashDrop.filter({ status: 'active' });
    let ended = 0;
    for (const drop of active) {
      if (drop.end_time && new Date(drop.end_time) <= now) {
        await base44.asServiceRole.entities.FlashDrop.update(drop.id, { status: 'ended' });
        ended++;
      }
    }

    return Response.json({
      success: true,
      activated,
      ended,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});