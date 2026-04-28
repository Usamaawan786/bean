import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all scheduled notifications
    const scheduled = await base44.asServiceRole.entities.PushNotification.filter({ status: 'scheduled' });
    const now = new Date();

    const due = scheduled.filter(n => n.scheduled_at && new Date(n.scheduled_at) <= now);

    if (due.length === 0) {
      return Response.json({ message: 'No notifications due', checked: scheduled.length });
    }

    let fired = 0;
    for (const notif of due) {
      try {
        // Send via existing sendPushNotification function
        const res = await base44.asServiceRole.functions.invoke('sendPushNotification', {
          title: notif.title,
          body: notif.body,
          audience: notif.audience || 'all',
          deep_link: notif.deep_link || undefined,
          image_url: notif.image_url || undefined,
        });

        await base44.asServiceRole.entities.PushNotification.update(notif.id, {
          status: res?.sent_count > 0 || res?.success !== false ? 'sent' : 'failed',
          sent_at: new Date().toISOString(),
          sent_count: res?.sent_count || 0,
          failure_count: res?.failure_count || 0,
        });

        fired++;
      } catch (e) {
        await base44.asServiceRole.entities.PushNotification.update(notif.id, {
          status: 'failed',
          sent_at: new Date().toISOString(),
        });
      }
    }

    return Response.json({ success: true, fired, total_checked: scheduled.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});