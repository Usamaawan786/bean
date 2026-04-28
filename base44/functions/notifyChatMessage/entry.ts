import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

async function sendFCM(token, title, body, deepLink, accessToken, projectId) {
  const message = {
    message: {
      token,
      notification: { title, body },
      data: deepLink ? { deep_link: deepLink, url: deepLink } : {},
      apns: {
        headers: {
          "apns-push-type": "alert",
          "apns-priority": "10",
          "apns-topic": "co.beancoffee.app"
        },
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
    return { success: false, errorCode, token };
  }
  return { success: true, token };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Entity automation payload — message data is in body.data
    const msgData = body.data;
    if (!msgData) {
      return Response.json({ error: 'No message data provided' }, { status: 400 });
    }

    const { conversation_id, sender_role, sender_email, sender_name, content, file_url } = msgData;

    if (!conversation_id || !sender_role) {
      return Response.json({ error: 'Missing conversation_id or sender_role' }, { status: 400 });
    }

    // Only handle known roles
    if (sender_role !== "admin" && sender_role !== "user") {
      return Response.json({ success: true, message: "Unknown sender_role, skipping" });
    }

    console.log(`[notifyChatMessage] sender_role=${sender_role}, sender_email=${sender_email}, conv_id=${conversation_id}`);

    // Determine the EXACT set of recipient emails — one email for user path, admin emails for user→admin path
    let recipientEmails = []; // will contain ONLY the intended recipients

    if (sender_role === "admin") {
      // Admin sent a message → notify ONLY the specific user of this conversation
      // Use get() with the conversation_id directly
      const conv = await base44.asServiceRole.entities.Conversation.get(conversation_id);

      if (!conv || !conv.user_email) {
        console.log(`[notifyChatMessage] Conversation not found or missing user_email: ${conversation_id}`);
        return Response.json({ success: true, message: "Conversation not found" });
      }

      const userEmail = conv.user_email;

      // Safety: never notify an admin back when they are also the conversation user
      const adminUsers = await base44.asServiceRole.entities.User.filter({ role: "admin" });
      const adminEmails = new Set(adminUsers.map(u => u.email).filter(Boolean));

      if (adminEmails.has(userEmail)) {
        console.log(`[notifyChatMessage] conversation user_email is an admin, skipping: ${userEmail}`);
        return Response.json({ success: true, message: "User is admin, skipping" });
      }

      recipientEmails = [userEmail];
      console.log(`[notifyChatMessage] Admin→User: will notify ONLY ${userEmail}`);

    } else {
      // User sent a message → notify ONLY admins, never the sending user
      const adminUsers = await base44.asServiceRole.entities.User.filter({ role: "admin" });
      const adminEmails = adminUsers.map(u => u.email).filter(Boolean);

      // Strictly exclude the sender from admin list (in case an admin is messaging from user role)
      recipientEmails = adminEmails.filter(email => email !== sender_email);
      console.log(`[notifyChatMessage] User→Admin: will notify ${recipientEmails.length} admin(s), sender excluded`);
    }

    if (recipientEmails.length === 0) {
      return Response.json({ success: true, sent: 0, message: "No recipients" });
    }

    // Fetch device tokens ONLY for the exact recipient emails
    // Strictly filter by user_email field — no fallbacks to created_by or any other field
    const allTokenRecords = [];
    for (const email of recipientEmails) {
      const tokens = await base44.asServiceRole.entities.DeviceToken.filter({ user_email: email, is_active: true });
      // Extra safety: ensure each token record's user_email exactly matches
      const valid = tokens.filter(t => t.token && t.user_email === email);
      allTokenRecords.push(...valid);
    }

    // Deduplicate tokens
    const seenTokens = new Set();
    const uniqueTokenRecords = allTokenRecords.filter(t => {
      if (seenTokens.has(t.token)) return false;
      seenTokens.add(t.token);
      return true;
    });

    if (uniqueTokenRecords.length === 0) {
      console.log(`[notifyChatMessage] No active device tokens for recipients: ${recipientEmails.join(', ')}`);
      return Response.json({ success: true, sent: 0, message: "No devices to notify" });
    }

    // Build notification content
    const notifBody = content
      ? (content.length > 80 ? content.substring(0, 80) + "…" : content)
      : (file_url ? "📎 Sent an attachment" : "New message");

    const notifTitle = sender_role === "admin"
      ? "Bean Support 💬"
      : `${sender_name || "Customer"} 💬`;

    const deepLink = sender_role === "admin"
      ? "https://beancoffee.co/messages"
      : "https://beancoffee.co/AdminChat";

    // Load Firebase credentials and send
    const serviceAccount = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT"));
    const accessToken = await getAccessToken(serviceAccount);
    if (!accessToken) {
      return Response.json({ error: 'Failed to get Firebase access token' }, { status: 500 });
    }

    const results = await Promise.all(
      uniqueTokenRecords.map(t => sendFCM(t.token, notifTitle, notifBody, deepLink, accessToken, serviceAccount.project_id))
    );

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // Deactivate invalid/unregistered tokens
    const invalidTokens = results.filter(r => !r.success && (r.errorCode === "UNREGISTERED" || r.errorCode === "INVALID_ARGUMENT"));
    for (const r of invalidTokens) {
      const record = uniqueTokenRecords.find(t => t.token === r.token);
      if (record?.id) {
        await base44.asServiceRole.entities.DeviceToken.update(record.id, { is_active: false });
      }
    }

    console.log(`[notifyChatMessage] Done — recipients: ${recipientEmails.join(', ')} | sent: ${sent}, failed: ${failed}`);
    return Response.json({ success: true, sent, failed });

  } catch (error) {
    console.error("[notifyChatMessage] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});