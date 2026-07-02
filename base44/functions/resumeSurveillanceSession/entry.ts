import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!["admin", "super_admin"].includes(user.role)) {
      return Response.json({ error: 'Forbidden - admin only' }, { status: 403 });
    }

    const { session_id } = await req.json();
    if (!session_id) return Response.json({ error: 'session_id is required' }, { status: 400 });

    await base44.asServiceRole.entities.SurveillanceSession.update(session_id, {
      status: "active",
      last_heartbeat_at: new Date().toISOString()
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});