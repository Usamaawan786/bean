import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Sends targeted push notifications to specific users based on their email(s).
 * Uses FIREBASE_SERVER_KEY (FCM Legacy HTTP API).
 *
 * Payload:
 *   - user_email: string | string[]  — one or more target emails
 *   - title: string                  — notification title
 *   - body: string                   — notification body
 *   - data: object (optional)        — extra key-value data for deep linking etc.
 *   - image_url: string (optional)   — image to show in notification
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function can be called by automations (service role) or admin users.
    // We allow both — just parse the payload.
    const payload = await req.json();
    const { user_email, title, body, data = {}, image_url } = payload;

    if (!user_email || !title || !body) {
      return Response.json({ error: 'user_email, title, and body are required' }, { status: 400 });
    }

    const targetEmails = Array.isArray(user_email) ? user_email : [user_email];

    // Fetch active device tokens for target users
    const allTokenRecords = await base44.asServiceRole.entities.DeviceToken.filter({ is_active: true });
    const tokenRecords = allTokenRecords.filter(t => targetEmails.includes(t.user_email));
    const tokens = tokenRecords.map(t => t.token).filter(Boolean);

    if (tokens.length === 0) {
      return Response.json({ success: true, sent_count: 0, message: 'No active device tokens found for target users' });
    }

    const serverKey = Deno.env.get('FIREBASE_SERVER_KEY');
    if (!serverKey) {
      return Response.json({ error: 'FIREBASE_SERVER_KEY not set' }, { status: 500 });
    }

    // Build FCM legacy notification payload
    const notification = { title, body };
    if (image_url) notification.image = image_url;

    // Send in batches of 1000 (FCM legacy limit)
    let successCount = 0;
    let failureCount = 0;
    const invalidTokens = [];

    const batchSize = 1000;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      const fcmPayload = {
        registration_ids: batch,
        notification,
        data,
        priority: 'high',
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        android: { notification: { sound: 'default', channel_id: 'default' } }
      };

      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${serverKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fcmPayload)
      });

      const result = await res.json();
      successCount += result.success || 0;
      failureCount += result.failure || 0;

      // Collect invalid tokens to deactivate
      if (result.results) {
        result.results.forEach((r, idx) => {
          if (r.error === 'NotRegistered' || r.error === 'InvalidRegistration') {
            invalidTokens.push(batch[idx]);
          }
        });
      }
    }

    // Deactivate invalid tokens
    if (invalidTokens.length > 0) {
      for (const token of invalidTokens) {
        const records = tokenRecords.filter(t => t.token === token);
        for (const record of records) {
          await base44.asServiceRole.entities.DeviceToken.update(record.id, { is_active: false });
        }
      }
    }

    return Response.json({
      success: true,
      sent_count: successCount,
      failure_count: failureCount,
      deactivated_tokens: invalidTokens.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});