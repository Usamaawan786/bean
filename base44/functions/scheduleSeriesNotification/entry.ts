import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { dayIndex, title, body, deep_link, scheduledAt } = await req.json();

    if (!title || !body || !scheduledAt) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save to PushNotification entity as scheduled
    const notif = await base44.asServiceRole.entities.PushNotification.create({
      title,
      body,
      audience: 'all',
      deep_link: deep_link || null,
      status: 'scheduled',
      scheduled_at: scheduledAt,
      notes: `30-Day Series — Day ${(dayIndex || 0) + 1}`,
      sent_by: user.email,
    });

    // Return a stable automationId (the notification record ID) so the UI can track it
    return Response.json({ success: true, automationId: notif.id, scheduledAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});