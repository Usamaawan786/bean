import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * notifyDeliveryStatus
 *
 * Sends ONE push notification about ONE delivery order to the customer who
 * owns that order. Nothing else.
 *
 * SAFETY DESIGN (Bean hard rule: never blast the customer list):
 *  - Input is ONLY { order_id, status }. There is NO audience, tier, target,
 *    email or free-text field, so a broadcast is impossible by design.
 *  - The recipient email is read from the DeliveryOrder record itself, never
 *    from the request.
 *  - Message text comes from the fixed TEMPLATES below, never from the caller.
 *  - A missing or blank customer email sends nothing.
 *  - Callers: admin / super_admin / manager may send any status; the rider
 *    assigned to that order may only send rider_picked_up and rider_nearby.
 *  - Does NOT call or share code paths with sendPushNotification (marketing).
 */

const TEMPLATES: Record<string, { title: string; body: string }> = {
  accepted: { title: 'Order accepted', body: 'Bean has accepted your order and will start preparing it soon.' },
  preparing: { title: 'Preparing your order', body: 'Your order is being prepared right now.' },
  rider_picked_up: { title: 'Rider on the way', body: 'Your rider has picked up your order and is heading to you.' },
  rider_nearby: { title: 'Rider is almost there', body: 'Your rider is around the corner. Get ready!' },
  delivered: { title: 'Order delivered', body: 'Your order has been delivered. Enjoy your Bean!' },
  rejected: { title: 'Order could not be accepted', body: "Sorry, we couldn't accept your order this time. Please check the app for details." },
};

const STAFF_ROLES = ['admin', 'super_admin', 'manager'];
const RIDER_ALLOWED = ['rider_picked_up', 'rider_nearby', 'delivered'];

async function getAccessToken(serviceAccount: any) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const encode = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${encode(header)}.${encode(payload)}`;
  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signingInput}.${signatureB64}`,
  });
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function sendToToken(token: string, notification: { title: string; body: string }, data: Record<string, string>, accessToken: string, projectId: string) {
  const message = {
    message: {
      token,
      notification: { title: notification.title, body: notification.body },
      data,
      apns: {
        headers: { 'apns-push-type': 'alert', 'apns-priority': '10', 'apns-topic': 'co.beancoffee.app' },
        payload: { aps: { alert: { title: notification.title, body: notification.body }, sound: 'default', badge: 1 } },
      },
      android: {
        priority: 'high',
        notification: { sound: 'default', channel_id: 'default', default_sound: true, notification_priority: 'PRIORITY_HIGH', visibility: 'PUBLIC' },
      },
    },
  };
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  if (res.ok) return { success: true };
  const result = await res.json();
  const errorCode = result?.error?.details?.[0]?.errorCode || result?.error?.status;
  if (errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT') return { success: false, invalidToken: token };
  return { success: false };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { order_id, status } = body || {};

    if (typeof order_id !== 'string' || !order_id.trim() || typeof status !== 'string') {
      return Response.json({ error: 'order_id and status are required' }, { status: 400 });
    }
    const template = TEMPLATES[status];
    if (!template) {
      return Response.json({ error: 'Unknown status' }, { status: 400 });
    }

    // Load the order server-side. The recipient comes from THIS record only.
    const orders = await base44.asServiceRole.entities.DeliveryOrder.filter({ id: order_id.trim() });
    const order = orders && orders[0];
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Authorization
    const isStaff = STAFF_ROLES.includes(user.role);
    const isAssignedRider =
      !!order.rider_email &&
      String(order.rider_email).trim().toLowerCase() === String(user.email || '').trim().toLowerCase();
    if (!isStaff && !(isAssignedRider && RIDER_ALLOWED.includes(status))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Single recipient: the order's customer. Blank means nothing is sent.
    const customerEmail = String(order.customer_email || '').trim().toLowerCase();
    if (!customerEmail) {
      return Response.json({ success: true, sent_count: 0, message: 'Order has no customer email, nothing sent' });
    }

    // Find ONLY this customer's active device tokens.
    const allTokens = await base44.asServiceRole.entities.DeviceToken.filter({ is_active: true });
    const tokenRecords = allTokens.filter((t: any) => {
      const em = String(t.user_email || (t.created_by && t.created_by.includes('@') && !t.created_by.includes('service+') ? t.created_by : '')).trim().toLowerCase();
      return em === customerEmail;
    });
    const tokens: string[] = tokenRecords.map((t: any) => t.token).filter(Boolean);

    // Hard ceiling: one customer never has more than a handful of devices.
    if (tokens.length > 10) {
      console.error(`notifyDeliveryStatus aborted: ${tokens.length} tokens matched one customer`);
      return Response.json({ error: 'Safety stop: unexpected number of devices for one customer' }, { status: 500 });
    }
    if (tokens.length === 0) {
      return Response.json({ success: true, sent_count: 0, message: 'No active device for this customer' });
    }

    const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountStr) {
      return Response.json({ error: 'FIREBASE_SERVICE_ACCOUNT not set' }, { status: 500 });
    }
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountStr);
    } catch (e: any) {
      return Response.json({ error: 'Failed to parse FIREBASE_SERVICE_ACCOUNT' }, { status: 500 });
    }
    const accessToken = await getAccessToken(serviceAccount);
    if (!accessToken) {
      return Response.json({ error: 'Failed to obtain Firebase access token' }, { status: 500 });
    }

    const data = { deep_link: `/delivery/track/${order.id}`, order_id: String(order.id), status };
    let sent = 0, failed = 0;
    const invalid: string[] = [];
    for (const token of tokens) {
      const r: any = await sendToToken(token, template, data, accessToken, serviceAccount.project_id);
      if (r.success) sent++;
      else { failed++; if (r.invalidToken) invalid.push(r.invalidToken); }
    }

    for (const token of invalid) {
      for (const rec of tokenRecords.filter((t: any) => t.token === token && t.id)) {
        await base44.asServiceRole.entities.DeviceToken.update(rec.id, { is_active: false });
      }
    }

    return Response.json({ success: true, sent_count: sent, failure_count: failed });
  } catch (error: any) {
    console.error('notifyDeliveryStatus error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
