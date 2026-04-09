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

  // Import private key
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
  console.log('Token response:', JSON.stringify(tokenData));
  return tokenData.access_token;
}

async function sendBatch(tokens, notification, data, accessToken, projectId) {
  let successCount = 0;
  let failureCount = 0;
  const invalidTokens = [];

  // FCM v1 API sends one message at a time, batch in parallel groups of 100
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
            payload: { aps: { sound: "default", badge: 1 } }
          },
          android: {
            notification: { sound: "default", channel_id: "default" }
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

    const { notification_id } = await req.json();

    // Load notification record
    const notifications = await base44.asServiceRole.entities.PushNotification.filter({ id: notification_id });
    if (!notifications.length) {
      return Response.json({ error: 'Notification not found' }, { status: 404 });
    }
    const notification = notifications[0];

    // Load service account and get access token
    const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    console.log('Service account string starts with:', serviceAccountStr?.substring(0, 50));
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountStr);
      console.log('Parsed project_id:', serviceAccount.project_id);
      console.log('Private key starts with:', serviceAccount.private_key?.substring(0, 40));
    } catch(e) {
      console.error('JSON parse error:', e.message);
      return Response.json({ error: 'Failed to parse service account: ' + e.message }, { status: 500 });
    }
    const accessToken = await getAccessToken(serviceAccount);
    console.log('Got access token:', accessToken ? 'YES' : 'NO');

    // Load device tokens based on audience
    let allTokens = await base44.asServiceRole.entities.DeviceToken.filter({ is_active: true });

    if (notification.audience && notification.audience !== "all") {
      const tier = notification.audience.replace("tier_", ""); // e.g. "bronze"
      const tierCapitalized = tier.charAt(0).toUpperCase() + tier.slice(1);
      allTokens = allTokens.filter(t => t.user_tier === tierCapitalized);
    }

    const tokens = allTokens.map(t => t.token).filter(Boolean);

    if (tokens.length === 0) {
      await base44.asServiceRole.entities.PushNotification.update(notification_id, {
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_count: 0,
        failure_count: 0,
        sent_by: user.email
      });
      return Response.json({ success: true, sent_count: 0, failure_count: 0, message: "No registered devices found" });
    }

    const data = {};
    if (notification.deep_link) data.deep_link = notification.deep_link;

    const { successCount, failureCount, invalidTokens } = await sendBatch(
      tokens, notification, data, accessToken, serviceAccount.project_id
    );

    // Deactivate invalid tokens
    if (invalidTokens.length > 0) {
      for (const token of invalidTokens) {
        const tokenRecords = allTokens.filter(t => t.token === token);
        for (const record of tokenRecords) {
          await base44.asServiceRole.entities.DeviceToken.update(record.id, { is_active: false });
        }
      }
    }

    // Update notification record
    await base44.asServiceRole.entities.PushNotification.update(notification_id, {
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_count: successCount,
      failure_count: failureCount,
      sent_by: user.email
    });

    return Response.json({ success: true, sent_count: successCount, failure_count: failureCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});