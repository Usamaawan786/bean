import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

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

    // Payment type and GST are decided here on the server (cash 17%, card 8% by default), never trusted from the browser
    const paymentMethod = payment_method === 'card_on_delivery' ? 'card_on_delivery' : 'cash_on_delivery';
    const gstRate = paymentMethod === 'card_on_delivery'
      ? Number(settings.card_gst_percent ?? 8)
      : Number(settings.cash_gst_percent ?? 17);
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

    return Response.json({ order });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}