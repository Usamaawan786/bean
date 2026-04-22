import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Get OAuth2 access token from service account
async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const pemContents = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signingInput}.${signatureB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  console.log('Token response status:', tokenRes.status);
  return tokenData.access_token;
}

async function sendBatch(tokens, notification, data, accessToken, projectId) {
  let successCount = 0;
  let failureCount = 0;
  const invalidTokens = [];

  const batchSize = 100;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async (token) => {
      const message = {
        message: {
          token,
          notification: {
            title: notification.title,
            body: notification.body,
            ...(notification.image_url ? { image: notification.image_url } : {})
          },
          data: data || {},
          apns: {
            headers: {
              "apns-push-type": "alert",
              "apns-priority": "10"
            },
            payload: {
              aps: {
                alert: {
                  title: notification.title,
                  body: notification.body
                },
                sound: "default",
                badge: 1
              }
            }
          },
          android: {
            priority: "high",
            notification: {
              sound: "default",
              channel_id: "default",
              default_sound: true,
              default_vibrate_timings: true,
              default_light_settings: true,
              notification_priority: "PRIORITY_HIGH",
              visibility: "PUBLIC"
            }
          }
        }
      };

      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(message)
        }
      );
      const result = await res.json();
      console.log("FCM response status:", res.status, "body:", JSON.stringify(result));
      if (res.ok) {
        return { success: true };
      } else {
        const errorCode = result?.error?.details?.[0]?.errorCode || result?.error?.status;
        console.error("FCM error code:", errorCode, "for token:", token.substring(0, 30));
        if (errorCode === "UNREGISTERED" || errorCode === "INVALID_ARGUMENT") {
          return { success: false, invalidToken: token };
        }
        return { success: false };
      }
    }));

    results.forEach(r => {
      if (r.success) successCount++;
      else {
        failureCount++;
        if (r.invalidToken) invalidTokens.push(r.invalidToken);
      }
    });
  }

  return { successCount, failureCount, invalidTokens };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const reqBody = await req.json();
    const { notification_id, title, body: msgBody, target, deep_link, personalize_first_name, specific_emails } = reqBody;

    // Support direct mode (title + body + target) OR record-based mode (notification_id)
    let notification;
    if (notification_id) {
      const records = await base44.asServiceRole.entities.PushNotification.filter({ id: notification_id });
      if (!records.length) {
        return Response.json({ error: 'Notification not found' }, { status: 404 });
      }
      notification = records[0];
    } else if (title && msgBody) {
      notification = { title, body: msgBody, audience: 'all', deep_link: deep_link || null, image_url: null };
    } else {
      return Response.json({ error: 'Provide notification_id, or title + body' }, { status: 400 });
    }

    // Load Firebase service account and get OAuth token
    const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountStr);
      console.log('Project ID:', serviceAccount.project_id);
    } catch (e) {
      return Response.json({ error: 'Failed to parse FIREBASE_SERVICE_ACCOUNT: ' + e.message }, { status: 500 });
    }

    const accessToken = await getAccessToken(serviceAccount);
    if (!accessToken) {
      return Response.json({ error: 'Failed to obtain Firebase access token' }, { status: 500 });
    }

    // Resolve target tokens
    let allTokenRecords = [];

    const audience = target || notification.audience;

    if (specific_emails && specific_emails.length > 0) {
      // Send to specific users by email
      for (const email of specific_emails) {
        const records = await base44.asServiceRole.entities.DeviceToken.filter({ user_email: email, is_active: true });
        allTokenRecords = [...allTokenRecords, ...records];
      }
    } else if (target && target !== 'all' && !target.startsWith('tier_')) {
      const isEmail = target.includes('@');
      if (isEmail) {
        allTokenRecords = await base44.asServiceRole.entities.DeviceToken.filter({ user_email: target, is_active: true });
      } else {
        allTokenRecords = [{ token: target }];
      }
    } else {
      allTokenRecords = await base44.asServiceRole.entities.DeviceToken.filter({ is_active: true });
      if (audience && audience !== 'all' && audience !== 'specific' && audience.startsWith('tier_')) {
        const tier = audience.replace('tier_', '');
        const tierCapitalized = tier.charAt(0).toUpperCase() + tier.slice(1);
        allTokenRecords = allTokenRecords.filter(t => t.user_tier === tierCapitalized);
      }
    }

    const needsPersonalization = notification.title.includes('{{first_name}}') || notification.body.includes('{{first_name}}');

    // If {{first_name}} is used, always build a user name map
    let userNameMap = {};
    if (needsPersonalization) {
      const emails = [...new Set(allTokenRecords.map(t => t.user_email).filter(Boolean))];
      if (emails.length > 0) {
        const users = await base44.asServiceRole.entities.User.list();
        const customers = await base44.asServiceRole.entities.Customer.list();
        const customerMap = {};
        customers.forEach(c => { if (c.user_email) customerMap[c.user_email] = c; });
        users.forEach(u => {
          const customer = customerMap[u.email];
          const rawName = customer?.display_name || u.full_name || "";
          const firstName = rawName.trim().split(" ")[0] || null;
          if (firstName) userNameMap[u.email] = firstName;
        });
        // Also build from customers not matched to a user record
        customers.forEach(c => {
          if (!userNameMap[c.user_email] && c.display_name) {
            const firstName = c.display_name.trim().split(" ")[0];
            if (firstName) userNameMap[c.user_email] = firstName;
          }
        });
      }
    }

    const tokens = allTokenRecords.map(t => t.token).filter(Boolean);
    console.log(`Sending to ${tokens.length} device(s), personalized: ${needsPersonalization}`);

    if (tokens.length === 0) {
      if (notification_id) {
        await base44.asServiceRole.entities.PushNotification.update(notification_id, {
          status: "sent",
          sent_at: new Date().toISOString(),
          sent_count: 0,
          failure_count: 0,
          sent_by: user.email
        });
      }
      return Response.json({ success: true, sent_count: 0, failure_count: 0, message: "No registered devices found" });
    }

    // Build optional data payload
    const data = {};
    const deepLinkValue = notification.deep_link || deep_link;
    if (deepLinkValue) data.deep_link = deepLinkValue;

    let successCount = 0, failureCount = 0, invalidTokens = [];

    if (needsPersonalization) {
      // Send per-user with personalized name substitution
      for (const tokenRecord of allTokenRecords) {
        if (!tokenRecord.token) continue;
        const firstName = (tokenRecord.user_email && userNameMap[tokenRecord.user_email]) || "friend";
        const personalizedNotification = {
          ...notification,
          title: notification.title.replace(/\{\{first_name\}\}/g, firstName),
          body: notification.body.replace(/\{\{first_name\}\}/g, firstName),
        };
        const result = await sendBatch([tokenRecord.token], personalizedNotification, data, accessToken, serviceAccount.project_id);
        successCount += result.successCount;
        failureCount += result.failureCount;
        invalidTokens = [...invalidTokens, ...result.invalidTokens];
      }
    } else {
      // Bulk send (no personalization needed)
      const result = await sendBatch(tokens, notification, data, accessToken, serviceAccount.project_id);
      successCount = result.successCount;
      failureCount = result.failureCount;
      invalidTokens = result.invalidTokens;
    }

    // Deactivate invalid/expired tokens
    if (invalidTokens.length > 0) {
      console.log(`Deactivating ${invalidTokens.length} invalid token(s)`);
      for (const token of invalidTokens) {
        const records = allTokenRecords.filter(t => t.token === token && t.id);
        for (const record of records) {
          await base44.asServiceRole.entities.DeviceToken.update(record.id, { is_active: false });
        }
      }
    }

    // Update PushNotification record if record-based
    if (notification_id) {
      await base44.asServiceRole.entities.PushNotification.update(notification_id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_count: successCount,
        failure_count: failureCount,
        sent_by: user.email
      });
    }

    console.log(`Done — success: ${successCount}, failed: ${failureCount}`);
    return Response.json({ success: true, sent_count: successCount, failure_count: failureCount });

  } catch (error) {
    console.error('sendPushNotification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});