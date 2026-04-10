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
  console.log('[testPushToken] OAuth token status:', tokenRes.status);
  if (!tokenData.access_token) {
    console.error('[testPushToken] OAuth error:', JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { token, title, body } = await req.json();

    if (!token) {
      return Response.json({ error: 'token is required' }, { status: 400 });
    }

    const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    const serviceAccount = JSON.parse(serviceAccountStr);
    console.log('[testPushToken] Firebase project:', serviceAccount.project_id);

    const accessToken = await getAccessToken(serviceAccount);
    if (!accessToken) {
      return Response.json({ error: 'Failed to get Firebase access token' }, { status: 500 });
    }

    const message = {
      message: {
        token,
        notification: {
          title: title || '🔔 Bean Test Push',
          body: body || 'If you see this, push notifications are working!'
        },
        apns: {
          headers: {
            "apns-push-type": "alert",
            "apns-priority": "10"
          },
          payload: {
            aps: {
              alert: {
                title: title || '🔔 Bean Test Push',
                body: body || 'If you see this, push notifications are working!'
              },
              sound: "default",
              badge: 1
            }
          }
        }
      }
    };

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
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
    console.log('[testPushToken] FCM status:', res.status, 'response:', JSON.stringify(result));

    return Response.json({
      success: res.ok,
      fcm_status: res.status,
      fcm_response: result,
      firebase_project: serviceAccount.project_id,
      token_preview: token.substring(0, 40) + '...'
    });

  } catch (error) {
    console.error('[testPushToken] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});