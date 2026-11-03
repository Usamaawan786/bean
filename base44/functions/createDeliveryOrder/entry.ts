import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// ---- Cashier push: ONE fixed message, ONLY to users whose role is exactly 'cashier'. Runs server-side only, never blocks the order. ----
async function getFcmAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const input = enc({ alg: 'RS256', typ: 'JWT' }) + '.' + enc({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const pem = sa.private_key.replace(/\\n/g, '\n').replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\n/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)).buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + input + '.' + sigB64 });
  return (await res.json()).access_token;
}

async function notifyCashiers(base44, order) {
  try {
    const cashiers = await base44.asServiceRole.entities.User.filter({ role: 'cashier' });
    const emails = new Set((cashiers || []).filter((u) => u.role === 'cashier' && u.email).map((u) => String(u.email).trim().toLowerCase()));
    if (emails.size === 0 || emails.size > 5) return;
    const allTokens = await base44.asServiceRole.entities.DeviceToken.filter({ is_active: true });
    const records = allTokens.filter((t) => emails.has(String(t.user_email || '').trim().toLowerCase()) && t.token);
    if (records.length === 0 || records.length > 10) return;
    const saStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!saStr) return;
    const sa = JSON.parse(saStr);
    const accessToken = await getFcmAccessToken(sa);
    if (!accessToken) return;
    const title = 'New delivery order';
    const body = 'Order ' + order.order_number + ' just came in. Open Delivery to accept or reject.';
    for (const rec of records) {
      const message = { message: { token: rec.token, notification: { title, body }, data: { deep_link: '/AdminPOS', order_id: String(order.id), status: 'new_delivery_order' },
        apns: { headers: { 'apns-push-type': 'alert', 'apns-priority': '10', 'apns-topic': 'co.beancoffee.app' }, payload: { aps: { alert: { title, body }, sound: 'default', badge: 1 } } },
        android: { priority: 'high', notification: { sound: 'default', channel_id: 'default', default_sound: true, notification_priority: 'PRIORITY_HIGH', visibility: 'PUBLIC' } } } };
      const r = await fetch('https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send', { method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: JSON.stringify(message) });
      if (!r.ok) console.error('cashier push failed', r.status);
    }
  } catch (e) {
    console.error('notifyCashiers error:', e.message);
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { items, delivery_address, delivery_notes, customer_phone, delivery_lat, delivery_lng, payment_method } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Your cart is empty' }, { status: 400 });
    }
    if (!delivery_address || !delivery_address.trim()) {
      return Response.json({ error: 'Delivery address is required' }, { status: 400 });
    }

    // Fetch settings
    const settingsList = await base44.entities.DeliverySettings.list();
    const settings = settingsList[0];
    if (!settings || settings.is_delivery_open === false) {
      return Response.json({ error: 'Delivery is currently unavailable' }, { status: 400 });
    }

    // Service hours: 8:00 AM to 2:00 AM Pakistan time, enforced here so it can't be bypassed
    const pkHour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Karachi' }).format(new Date())) % 24;
    if (!(pkHour >= 8 || pkHour < 2)) {
      return Response.json({ error: 'Delivery is closed right now. We deliver every day from 8:00 AM to 2:00 AM.' }, { status: 400 });
    }

    // Delivery area check: the pin must be within the allowed radius of the store (server-side, can't be bypassed)
    const storeLat = Number(settings.store_lat ?? 33.5306669);
    const storeLng = Number(settings.store_lng ?? 73.0997785);
    const radiusKm = Number(settings.delivery_radius_km ?? 4);
    const lat = Number(delivery_lat);
    const lng = Number(delivery_lng);
    if (delivery_lat == null || delivery_lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return Response.json({ error: 'Please pin your delivery location on the map' }, { status: 400 });
    }
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat - storeLat);
    const dLng = toRad(lng - storeLng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(storeLat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
    const distanceKm = 2 * 6371 * Math.asin(Math.sqrt(h));
    if (distanceKm > radiusKm) {
      return Response.json({ error: 'Sorry, your location is outside our delivery area. We deliver within ' + radiusKm + ' km of Bean.' }, { status: 400 });
    }

    // Fetch all available products to validate and get current prices
    const allProducts = await base44.entities.DeliveryProduct.filter({ is_available: true });
    const productMap = {};
    for (const p of allProducts) productMap[p.id] = p;

    let subtotal = 0;
    const orderItems = items.map(item => {
      const product = productMap[item.product_id];
      if (!product) throw new Error('Product not found: ' + (item.product_name || 'unknown'));
      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      return {
        product_id: item.product_id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price
      };
    });

    if (settings.min_order_amount && subtotal < settings.min_order_amount) {
      return Response.json({ error: 'Minimum order is Rs. ' + settings.min_order_amount }, { status: 400 });
    }

    // Payment type and GST are decided here on the server (cash 16%, card 8% by default), never trusted from the browser
    const paymentMethod = payment_method === 'card_on_delivery' ? 'card_on_delivery' : 'cash_on_delivery';
    const gstRate = paymentMethod === 'card_on_delivery'
      ? Number(settings.card_gst_percent ?? 8)
      : Number(settings.cash_gst_percent ?? 16);
    const gstAmount = Math.round(subtotal * gstRate / 100);
    const deliveryFee = settings.flat_delivery_fee ?? 297;
    const totalAmount = subtotal + gstAmount + deliveryFee;

    // Generate order number using service role (user can't read others' orders)
    const latest = await base44.asServiceRole.entities.DeliveryOrder.list('-created_date', 1);
    let nextNum = 1;
    if (latest.length > 0 && latest[0].order_number) {
      const m = String(latest[0].order_number).match(/DO-(\d+)/);
      if (m) nextNum = parseInt(m[1], 10) + 1;
    }
    const orderNumber = 'DO-' + String(nextNum).padStart(6, '0');

    const now = new Date().toISOString();

    const order = await base44.asServiceRole.entities.DeliveryOrder.create({
      order_number: orderNumber,
      customer_email: user.email,
      customer_name: user.full_name || user.email,
      customer_phone: customer_phone || '',
      delivery_address: delivery_address.trim(),
      delivery_lat: lat,
      delivery_lng: lng,
      delivery_notes: (delivery_notes || '').trim(),
      items: orderItems,
      subtotal,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      status: 'pending',
      placed_at: now
    });

    await notifyCashiers(base44, order);

    return Response.json({ order });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}