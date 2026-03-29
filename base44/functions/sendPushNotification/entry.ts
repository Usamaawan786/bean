import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const FIREBASE_SERVER_KEY = Deno.env.get("FIREBASE_SERVER_KEY");

async function sendToTokens(tokens, title, body, imageUrl, deepLink) {
  const results = { success: 0, failure: 0, invalidTokens: [] };

  // Send in batches of 500 (FCM limit)
  const batches = [];
  for (let i = 0; i < tokens.length; i += 500) {
    batches.push(tokens.slice(i, i + 500));
  }

  for (const batch of batches) {
    const payload = {
      registration_ids: batch,
      notification: {
        title,
        body,
        ...(imageUrl && { image: imageUrl })
      },
      data: {
        ...(deepLink && { deep_link: deepLink }),
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      }
    };

    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Authorization": `key=${FIREBASE_SERVER_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    results.success += data.success || 0;
    results.failure += data.failure || 0;

    // Collect invalid tokens to deactivate
    if (data.results) {
      data.results.forEach((result, idx) => {
        if (result.error === "InvalidRegistration" || result.error === "NotRegistered") {
          results.invalidTokens.push(batch[idx]);
        }
      });
    }
  }

  return results;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { notificationId, title, body, imageUrl, deepLink, audience } = await req.json();

  // Fetch active device tokens
  let allTokens = [];
  let skip = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.DeviceToken.filter(
      { is_active: true },
      '-created_date',
      100,
      skip
    );
    if (!batch || batch.length === 0) break;
    allTokens = allTokens.concat(batch);
    if (batch.length < 100) break;
    skip += 100;
  }

  // Filter by audience/tier
  let targetTokens = allTokens;
  if (audience && audience !== 'all') {
    const tier = audience.replace('tier_', '');
    targetTokens = allTokens.filter(t =>
      t.user_tier && t.user_tier.toLowerCase() === tier.toLowerCase()
    );
  }

  const tokenStrings = targetTokens.map(t => t.token).filter(Boolean);

  if (tokenStrings.length === 0) {
    // Update notification as sent with 0 devices
    if (notificationId) {
      await base44.asServiceRole.entities.PushNotification.update(notificationId, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_count: 0,
        sent_by: user.email
      });
    }
    return Response.json({ success: true, sent_count: 0, failure_count: 0, message: 'No device tokens found' });
  }

  const results = await sendToTokens(tokenStrings, title, body, imageUrl, deepLink);

  // Deactivate invalid tokens
  if (results.invalidTokens.length > 0) {
    for (const token of results.invalidTokens) {
      const records = await base44.asServiceRole.entities.DeviceToken.filter({ token });
      for (const record of records) {
        await base44.asServiceRole.entities.DeviceToken.update(record.id, { is_active: false });
      }
    }
  }

  // Update notification record
  if (notificationId) {
    await base44.asServiceRole.entities.PushNotification.update(notificationId, {
      status: results.failure > results.success ? 'failed' : 'sent',
      sent_at: new Date().toISOString(),
      sent_count: results.success,
      failure_count: results.failure,
      sent_by: user.email
    });
  }

  return Response.json({
    success: true,
    sent_count: results.success,
    failure_count: results.failure,
    total_tokens: tokenStrings.length
  });
});