import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!["cashier", "manager"].includes(user.role)) {
      return Response.json({ skip: true });
    }

    const existing = await base44.asServiceRole.entities.SurveillanceSession.filter(
      { staff_email: user.email },
      "-created_date",
      1
    );

    const nowIso = new Date().toISOString();
    let session;

    if (existing.length > 0 && existing[0].status !== "ended") {
      await base44.asServiceRole.entities.SurveillanceSession.update(existing[0].id, {
        last_heartbeat_at: nowIso
      });
      session = { ...existing[0], last_heartbeat_at: nowIso };
    } else {
      session = await base44.asServiceRole.entities.SurveillanceSession.create({
        staff_email: user.email,
        staff_name: user.full_name || "",
        role: user.role,
        status: "active",
        started_at: nowIso,
        last_heartbeat_at: nowIso
      });
    }

    return Response.json({ session });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});