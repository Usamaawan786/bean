import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Reuse JWT/FCM helpers
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
  const pemContents = privateKey.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryKey.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signatureBytes = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signingInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBytes))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${signingInput}.${signatureB64}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function sendPushToUser(userEmail, title, body, deepLink, base44, serviceAccount, accessToken) {
  const tokenRecords = await base44.asServiceRole.entities.DeviceToken.filter({ user_email: userEmail, is_active: true });
  const tokens = tokenRecords.map(t => t.token).filter(Boolean);
  console.log(`[Push] sendPushToUser: email=${userEmail}, tokens found=${tokens.length}`);
  if (!tokens.length) { console.log(`[Push] No tokens for ${userEmail}, skipping`); return; }

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
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(message)
      }
    );
    const result = await res.json();
    console.log(`[Push] FCM response status=${res.status}`, JSON.stringify(result).substring(0, 200));
    if (!res.ok) {
      const errorCode = result?.error?.details?.[0]?.errorCode || result?.error?.status;
      console.log(`[Push] FCM error code: ${errorCode}`);
      if (errorCode === "UNREGISTERED" || errorCode === "INVALID_ARGUMENT") {
        const record = tokenRecords.find(t => t.token === token);
        if (record) await base44.asServiceRole.entities.DeviceToken.update(record.id, { is_active: false });
      }
    }
  }));
  return results;
}

/**
 * Handles community activity notifications with batching and contextual nudges.
 *
 * Payload:
 *   type: "like" | "follow" | "comment" | "trending_check"
 *   toEmail: recipient email
 *   fromName: sender display name
 *   fromPicture: sender profile picture URL
 *   fromEmail: sender email
 *   postId: (for like/comment)
 *   postLikesCount: (for trending check)
 *   message: in-app notification message
 *
 * Batching strategy for likes:
 *   - Creates/updates the in-app Notification record
 *   - Only sends a push if the last like-push for this post was >15 min ago
 *     (stored in Notification metadata via a `last_push_at` field)
 *
 * Trending nudge:
 *   - If postLikesCount crosses 10 or 25, sends a special "your post is trending!" push
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { type, toEmail, fromEmail, fromName, fromPicture, postId, postLikesCount, message } = payload;

    if (!type || !toEmail) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Load FCM credentials
    const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    const serviceAccount = JSON.parse(serviceAccountStr);
    const accessToken = await getAccessToken(serviceAccount);

    const now = new Date().toISOString();

    if (type === "like" && postId) {
      // --- BATCHED LIKE NOTIFICATIONS ---
      // Find existing unread like notification for this post/recipient
      const existing = await base44.asServiceRole.entities.Notification.filter({
        to_email: toEmail,
        type: "like",
        post_id: postId,
        is_read: false
      });

      let likeCount = 1;
      let lastPushAt = null;

      if (existing.length > 0) {
        // Update existing notification with new liker info and incremented count
        const prev = existing[0];
        likeCount = (prev.like_count || 1) + 1;
        lastPushAt = prev.last_push_at || null;

        let batchedMessage;
        if (likeCount === 2) {
          batchedMessage = `${fromName} and 1 other liked your post ☕`;
        } else {
          batchedMessage = `${fromName} and ${likeCount - 1} others liked your post ☕`;
        }

        await base44.asServiceRole.entities.Notification.update(prev.id, {
          from_name: fromName,
          from_picture: fromPicture || null,
          from_email: fromEmail,
          message: batchedMessage,
          like_count: likeCount,
          is_read: false
        });

        // Only send push if >15 min since last push for this post's likes
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        if (!lastPushAt || lastPushAt < fifteenMinAgo) {
          await base44.asServiceRole.entities.Notification.update(prev.id, { last_push_at: now });
          await sendPushToUser(toEmail, "Bean Community ☕", batchedMessage, `/Community?post=${postId}`, base44, serviceAccount, accessToken);
        }
      } else {
        // First like — create new notification
        const warmMessages = [
          `${fromName} loved your post! ❤️`,
          `${fromName} liked your post ☕`,
          `${fromName} appreciated your post! 🌟`,
        ];
        const notifMessage = warmMessages[Math.floor(Math.random() * warmMessages.length)];

        await base44.asServiceRole.entities.Notification.create({
          to_email: toEmail,
          from_email: fromEmail,
          from_name: fromName,
          from_picture: fromPicture || null,
          type: "like",
          message: notifMessage,
          post_id: postId,
          is_read: false,
          like_count: 1,
          last_push_at: now
        });

        // Send push for first like
        await sendPushToUser(toEmail, "Bean Community ☕", notifMessage, `/Community?post=${postId}`, base44, serviceAccount, accessToken);
      }

      // --- TRENDING NUDGE ---
      // Check if post crossed a milestone (10 or 25 likes)
      if (postLikesCount && (postLikesCount === 10 || postLikesCount === 25)) {
        const trendingMessages = {
          10: `🔥 Your post is trending! It's hit ${postLikesCount} likes — the community loves it!`,
          25: `🌟 Wow! Your post has ${postLikesCount} likes — you're a Bean Community star!`
        };
        const trendingMsg = trendingMessages[postLikesCount];

        // Create a special trending notification
        await base44.asServiceRole.entities.Notification.create({
          to_email: toEmail,
          from_email: "system",
          from_name: "Bean Community",
          type: "like",
          message: trendingMsg,
          post_id: postId,
          is_read: false,
          last_push_at: now
        });

        await sendPushToUser(toEmail, "🔥 Your post is trending!", trendingMsg, `/Community?post=${postId}`, base44, serviceAccount, accessToken);
      }

      return Response.json({ success: true, type: "like_batched" });

    } else if (type === "follow") {
      // --- FOLLOW NOTIFICATIONS (1:1, not batched) ---
      const followMessages = [
        `${fromName} started following you! 👋`,
        `${fromName} is now following you ☕`,
        `${fromName} joined your Bean community! 🫘`,
      ];
      const notifMessage = followMessages[Math.floor(Math.random() * followMessages.length)];

      await base44.asServiceRole.entities.Notification.create({
        to_email: toEmail,
        from_email: fromEmail,
        from_name: fromName,
        from_picture: fromPicture || null,
        type: "follow",
        message: notifMessage,
        is_read: false,
        last_push_at: now
      });

      // Push for follows — always send (not too frequent)
      await sendPushToUser(toEmail, "New Follower! 👋", notifMessage, `/UserProfile?email=${encodeURIComponent(fromEmail)}`, base44, serviceAccount, accessToken);

      return Response.json({ success: true, type: "follow_sent" });

    } else {
      // Generic notification (comments, mentions, replies)
      await base44.asServiceRole.entities.Notification.create({
        to_email: toEmail,
        from_email: fromEmail,
        from_name: fromName,
        from_picture: fromPicture || null,
        type: type,
        message: message || `${fromName} interacted with your content`,
        post_id: postId || null,
        is_read: false,
        last_push_at: now
      });

      await sendPushToUser(toEmail, "Bean Community ☕", message || `${fromName} interacted with your content`, postId ? `/Community?post=${postId}` : "/Community", base44, serviceAccount, accessToken);

      return Response.json({ success: true, type: "generic_sent" });
    }

  } catch (error) {
    console.error("[notifyCommunityActivity] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});