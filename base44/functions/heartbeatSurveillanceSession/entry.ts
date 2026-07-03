import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!["cashier", "manager"].includes(user.role)) {
      return Response.json({ skip: true });
    }

    let body = {};
    try { body = await req.json(); } catch (e) { /* no body sent, plain heartbeat */ }
    const { recording_active, interrupted } = body;

    const existing = await base44.asServiceRole.entities.SurveillanceSession.filter(
      { staff_email: user.email },
      "-created_date",
      1
    );

    const nowIso = new Date().toISOString();
    let session;

    if (existing.length > 0 && existing[0].status !== "ended") {
      const updateData = { last_heartbeat_at: nowIso };
      if (typeof recording_active === "boolean") updateData.recording_active = recording_active;
      if (interrupted === true) {
        updateData.recording_active = false;
        updateData.last_interruption_at = nowIso;
        updateData.interruption_count = (existing[0].interruption_count || 0) + 1;
      }
      await base44.asServiceRole.entities.SurveillanceSession.update(existing[0].id, updateData);
      session = { ...existing[0], ...updateData };
    } else {
      session = await base44.asServiceRole.entities.SurveillanceSession.create({
        staff_email: user.email,
        staff_name: user.full_name || "",
        role: user.role,
        status: "active",
        started_at: nowIso,
        last_heartbeat_at: nowIso,
        recording_active: recording_active !== false,
        interruption_count: interrupted === true ? 1 : 0
      });
    }

    return Response.json({ session });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});