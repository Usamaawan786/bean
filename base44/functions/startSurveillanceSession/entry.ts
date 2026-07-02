import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!["admin", "super_admin"].includes(user.role)) {
      return Response.json({ error: 'Forbidden - admin only' }, { status: 403 });
    }

    const { staff_email, staff_name, role } = await req.json();
    if (!staff_email) return Response.json({ error: 'staff_email is required' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.SurveillanceSession.filter(
      { staff_email },
      "-created_date",
      1
    );

    const nowIso = new Date().toISOString();
    let session;

    if (existing.length > 0) {
      session = await base44.asServiceRole.entities.SurveillanceSession.update(existing[0].id, {
        status: "active",
        last_heartbeat_at: nowIso
      });
      session = { ...existing[0], status: "active", last_heartbeat_at: nowIso };
    } else {
      session = await base44.asServiceRole.entities.SurveillanceSession.create({
        staff_email,
        staff_name: staff_name || "",
        role: role || "",
        status: "active",
        started_at: nowIso,
        last_heartbeat_at: nowIso
      });
    }

    return Response.json({ success: true, session });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});