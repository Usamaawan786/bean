import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Runs every 5 minutes. Finds PushNotification records with status='scheduled'
// where scheduled_at <= now (UTC), then fires them via sendPushNotification.
// Times stored in DB are always UTC. The UI inputs Pakistan Time (PKT=UTC+5) and converts before saving.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const scheduled = await base44.asServiceRole.entities.PushNotification.filter({ status: 'scheduled' });
    const now = new Date();

    const due = scheduled.filter(n => n.scheduled_at && new Date(n.scheduled_at) <= now);

    if (due.length === 0) {
      console.log(`No notifications due. Checked ${scheduled.length} scheduled.`);
      return Response.json({ message: 'No notifications due', checked: scheduled.length });
    }

    console.log(`Firing ${due.length} due notification(s)`);

    let fired = 0;
    for (const notif of due) {
      try {
        const res = await base44.asServiceRole.functions.invoke('sendPushNotification', {
          title: notif.title,
          body: notif.body,
          audience: notif.audience || 'all',
          deep_link: notif.deep_link || undefined,
          image_url: notif.image_url || undefined,
          push_notification_id: notif.id, // pass ID so sendPushNotification can update the record
        });

        const sentCount = res?.sent_count ?? res?.data?.sent_count ?? 0;
        const failCount = res?.failure_count ?? res?.data?.failure_count ?? 0;
        const success = res?.success !== false && (res?.data?.success !== false);

        await base44.asServiceRole.entities.PushNotification.update(notif.id, {
          status: success ? 'sent' : 'failed',
          sent_at: new Date().toISOString(),
          sent_count: sentCount,
          failure_count: failCount,
        });

        console.log(`Fired "${notif.title}" → sent: ${sentCount}, failed: ${failCount}`);
        fired++;
      } catch (e) {
        console.error(`Failed to fire notification ${notif.id}:`, e.message);
        await base44.asServiceRole.entities.PushNotification.update(notif.id, {
          status: 'failed',
          sent_at: new Date().toISOString(),
        });
      }
    }

    return Response.json({ success: true, fired, total_checked: scheduled.length });
  } catch (error) {
    console.error('fireScheduledNotifications error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});