import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * notifyRiderAssigned
 *
 * Sends ONE push notification to the ONE rider assigned to ONE delivery order. Nothing else.
 *
 * SAFETY DESIGN (Bean hard rule: never blast anyone):
 *  - Input is ONLY { order_id }. No audience, email, or message text can be supplied.
 *  - The recipient is order.rider_email read from the DeliveryOrder record, never from the request.
 *  - The rider must actually hold the 'rider' role, so a wrong/stale email never pings a customer or staff.
 *  - Only admin / super_admin / manager may trigger it.
 *  - Message text is fixed below. Does not share code paths with marketing pushes.
 */

const STAFF_ROLES = ['admin', 'super_admin', 'manager'];

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
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!STAFF_ROLES.includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { order_id } = body || {};
    if (typeof order_id !== 'string' || !order_id.trim()) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.DeliveryOrder.filter({ id: order_id.trim() });
    const order = orders && orders[0];
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'out_for_delivery') {
      return Response.json({ success: true, sent_count: 0, message: 'Order is not out for delivery, nothing sent' });
    }

    const riderEmail = String(order.rider_email || '').trim().toLowerCase();
    if (!riderEmail) return Response.json({ success: true, sent_count: 0, message: 'No rider assigned, nothing sent' });

    // The assigned person must really be a rider.
    const riderUsers = await base44.asServiceRole.entities.User.filter({ email: order.rider_email });
    const riderUser = riderUsers && riderUsers[0];
    if (!riderUser || riderUser.role !== 'rider') {
      return Response.json({ success: true, sent_count: 0, message: 'Assigned user is not a rider, nothing sent' });
    }

    const allTokens = await base44.asServiceRole.entities.DeviceToken.filter({ is_active: true });
    const tokenRecords = allTokens.filter((t: any) => {
      const em = String(t.user_email || (t.created_by && t.created_by.includes('@') && !t.created_by.includes('service+') ? t.created_by : '')).trim().toLowerCase();
      return em === riderEmail;
    });
    const tokens: string[] = tokenRecords.map((t: any) => t.token).filter(Boolean);

    if (tokens.length > 10) {
      console.error(`notifyRiderAssigned aborted: ${tokens.length} tokens matched one rider`);
      return Response.json({ error: 'Safety stop: unexpected number of devices for one rider' }, { status: 500 });
    }
    if (tokens.length === 0) {
      return Response.json({ success: true, sent_count: 0, message: 'No active device for this rider' });
    }

    const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountStr) return Response.json({ error: 'FIREBASE_SERVICE_ACCOUNT not set' }, { status: 500 });
    let serviceAccount;
    try { serviceAccount = JSON.parse(serviceAccountStr); } catch { return Response.json({ error: 'Failed to parse FIREBASE_SERVICE_ACCOUNT' }, { status: 500 }); }
    const accessToken = await getAccessToken(serviceAccount);
    if (!accessToken) return Response.json({ error: 'Failed to obtain Firebase access token' }, { status: 500 });

    const notification = {
      title: 'New delivery assigned',
      body: `Order ${order.order_number} is ready for pick up.${order.payment_method === 'card_on_delivery' ? ' Card payment: take the card machine.' : ' Cash payment.'}`,
    };
    const data = { deep_link: '/RiderPortal', order_id: String(order.id), status: 'rider_assigned' };

    let sent = 0, failed = 0;
    const invalid: string[] = [];
    for (const token of tokens) {
      const r: any = await sendToToken(token, notification, data, accessToken, serviceAccount.project_id);
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
    console.error('notifyRiderAssigned error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
