import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createInAppNotificationsForPush } from '../../shared/pushInAppNotifier.ts';

/**
 * Sends targeted push notifications to specific users based on their email(s).
 * Uses the FCM HTTP v1 API with a Firebase service account OAuth token.
 *
 * Payload:
 *   - user_email: string | string[]  — one or more target emails
 *   - title: string                  — notification title
 *   - body: string                   — notification body
 *   - data: object (optional)        — extra key-value data for deep linking etc.
 *   - image_url: string (optional)   — image to show in notification
 */

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
              "apns-priority": "10",
              "apns-topic": "co.beancoffee.app"
            },
            payload: {
              aps: {
                alert: { title: notification.title, body: notification.body },
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
      if (res.ok) {
        return { success: true };
      } else {
        const errorCode = result?.error?.details?.[0]?.errorCode || result?.error?.status;
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

    // Targeted pushes to specific users are an admin-only operation
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { user_email, title, body, data = {}, image_url } = payload;

    if (!user_email || !title || !body) {
      return Response.json({ error: 'user_email, title, and body are required' }, { status: 400 });
    }

    // Build a normalized set of target emails. This is the ONLY allowlist used to
    // select device tokens — a push can never go to a user whose email is not in
    // this set. Empty/blank entries are rejected so a missing target can never
    // degrade into a broadcast to all registered users.
    const rawEmails = Array.isArray(user_email) ? user_email : [user_email];
    const targetSet = new Set(
      rawEmails
        .map(e => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
        .filter(Boolean)
    );
    if (targetSet.size === 0) {
      return Response.json({ success: true, sent_count: 0, message: 'No target email provided — nothing sent' });
    }
    const targetEmails = Array.from(targetSet);

    // Fetch active device tokens for target users ONLY
    let allTokenRecords = await base44.asServiceRole.entities.DeviceToken.filter({ is_active: true });
    // Enrich: fall back to created_by if user_email is missing
    allTokenRecords = allTokenRecords.map(t => {
      if (!t.user_email && t.created_by && !t.created_by.includes('service+') && t.created_by.includes('@')) {
        return { ...t, user_email: t.created_by };
      }
      return t;
    });
    const tokenRecords = allTokenRecords.filter(t => {
      const em = (t.user_email || '').trim().toLowerCase();
      return targetSet.has(em);
    });
    const tokens = tokenRecords.map(t => t.token).filter(Boolean);

    if (tokens.length === 0) {
      return Response.json({ success: true, sent_count: 0, message: 'No active device tokens found for target users' });
    }

    // Load Firebase service account and get OAuth token (FCM HTTP v1)
    const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountStr) {
      return Response.json({ error: 'FIREBASE_SERVICE_ACCOUNT not set' }, { status: 500 });
    }
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountStr);
    } catch (e) {
      return Response.json({ error: 'Failed to parse FIREBASE_SERVICE_ACCOUNT: ' + e.message }, { status: 500 });
    }

    const accessToken = await getAccessToken(serviceAccount);
    if (!accessToken) {
      return Response.json({ error: 'Failed to obtain Firebase access token' }, { status: 500 });
    }

    const notification = { title, body, ...(image_url ? { image_url } : {}) };
    const { successCount, failureCount, invalidTokens } = await sendBatch(
      tokens, notification, data, accessToken, serviceAccount.project_id
    );

    // Deactivate invalid tokens
    if (invalidTokens.length > 0) {
      for (const token of invalidTokens) {
        const records = tokenRecords.filter(t => t.token === token && t.id);
        for (const record of records) {
          await base44.asServiceRole.entities.DeviceToken.update(record.id, { is_active: false });
        }
      }
    }

    // Mirror the push into the in-app notification center so users can review history
    try {
      const deepLinkValue = (data && data.deep_link) || undefined;
      await createInAppNotificationsForPush(base44, {
        emails: targetEmails,
        title,
        body,
        image_url,
        deep_link: deepLinkValue,
        from_email: user.email,
        from_name: "BEAN",
        type: deepLinkValue && /reward|flash/i.test(deepLinkValue) ? "offer" : "announcement",
      });
    } catch (e) {
      console.error("In-app notification mirror failed:", e?.message || e);
    }

    return Response.json({
      success: true,
      sent_count: successCount,
      failure_count: failureCount,
      deactivated_tokens: invalidTokens.length
    });
  } catch (error) {
    console.error('sendTargetedPushNotification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});