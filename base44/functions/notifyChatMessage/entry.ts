import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Reuse the JWT/FCM helpers from the existing sendPushNotification pattern
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

  const encode = (obj) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const pemContents = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
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

async function sendToTokens(tokens, title, body, deepLink, accessToken, projectId) {
  const results = await Promise.all(tokens.map(async (token) => {
    const message = {
      message: {
        token,
        notification: { title, body },
        data: deepLink ? { deep_link: deepLink } : {},
        apns: {
          headers: { "apns-push-type": "alert", "apns-priority": "10" },
          payload: { aps: { alert: { title, body }, sound: "default", badge: 1 } }
        },
        android: {
          priority: "high",
          notification: { sound: "default", channel_id: "default", notification_priority: "PRIORITY_HIGH" }
        }
      }
    };

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(message)
      }
    );
    const result = await res.json();
    if (!res.ok) {
      const errorCode = result?.error?.details?.[0]?.errorCode || result?.error?.status;
      console.error("FCM error:", errorCode, "token:", token.substring(0, 30));
      return { success: false, errorCode, token };
    }
    return { success: true };
  }));
  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Called by entity automation — payload has event + data
    const msgData = body.data;
    if (!msgData) {
      return Response.json({ error: 'No message data provided' }, { status: 400 });
    }

    const { conversation_id, sender_role, sender_name, content, file_url } = msgData;
    if (!conversation_id || !sender_role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load service account
    const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    const serviceAccount = JSON.parse(serviceAccountStr);
    const accessToken = await getAccessToken(serviceAccount);
    if (!accessToken) {
      return Response.json({ error: 'Failed to get Firebase access token' }, { status: 500 });
    }

    // Determine who to notify based on who sent the message
    const notificationTitle = "Bean ☕";
    const notificationBody = content
      ? (content.length > 80 ? content.substring(0, 80) + "…" : content)
      : (file_url ? "📎 Sent an attachment" : "New message");

    let tokenRecords = [];

    if (sender_role === "admin") {
      // Admin sent → notify the user of this conversation
      const convs = await base44.asServiceRole.entities.Conversation.filter({ id: conversation_id });
      if (!convs.length) return Response.json({ success: true, message: "Conversation not found" });
      const conv = convs[0];
      const userEmail = conv.user_email;
      if (!userEmail) return Response.json({ success: true, message: "No user email on conversation" });

      tokenRecords = await base44.asServiceRole.entities.DeviceToken.filter({ user_email: userEmail, is_active: true });
      console.log(`[notifyChatMessage] Admin→User: notifying ${userEmail}, ${tokenRecords.length} device(s)`);
    } else if (sender_role === "user") {
      // User sent → notify all admins
      const adminUsers = await base44.asServiceRole.entities.User.filter({ role: "admin" });
      const adminEmails = adminUsers.map(u => u.email).filter(Boolean);
      console.log(`[notifyChatMessage] User→Admin: found ${adminEmails.length} admin(s)`);

      if (adminEmails.length > 0) {
        const allAdminTokens = await Promise.all(
          adminEmails.map(email =>
            base44.asServiceRole.entities.DeviceToken.filter({ user_email: email, is_active: true })
          )
        );
        tokenRecords = allAdminTokens.flat();
      }
    }

    const tokens = tokenRecords.map(t => t.token).filter(Boolean);
    if (tokens.length === 0) {
      console.log("[notifyChatMessage] No active device tokens found");
      return Response.json({ success: true, sent: 0, message: "No devices to notify" });
    }

    const senderLabel = sender_role === "admin" ? "Bean Support" : (sender_name || "Customer");
    const finalTitle = sender_role === "admin" ? "Bean Support 💬" : `New message from ${senderLabel}`;
    const deepLink = sender_role === "admin" ? "/messages" : "/AdminChat";

    const results = await sendToTokens(tokens, finalTitle, notificationBody, deepLink, accessToken, serviceAccount.project_id);
    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // Deactivate invalid tokens
    const invalidResults = results.filter(r => !r.success && (r.errorCode === "UNREGISTERED" || r.errorCode === "INVALID_ARGUMENT"));
    for (const r of invalidResults) {
      const records = tokenRecords.filter(t => t.token === r.token && t.id);
      for (const record of records) {
        await base44.asServiceRole.entities.DeviceToken.update(record.id, { is_active: false });
      }
    }

    console.log(`[notifyChatMessage] Done — sent: ${sent}, failed: ${failed}`);
    return Response.json({ success: true, sent, failed });

  } catch (error) {
    console.error("[notifyChatMessage] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});