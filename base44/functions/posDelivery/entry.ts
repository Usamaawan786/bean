import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * posDelivery
 *
 * One safe entry point for staff (cashier on an open shift, manager, admin) to work the delivery board:
 *   list    -> recent delivery orders + the rider list
 *   accept  -> creates the POS open ticket (+ items) AND the kitchen (KDS) order, then marks the order accepted
 *   reject  -> cancels a pending order with a reason
 *   prepare -> accepted -> preparing
 *   assign  -> preparing -> out_for_delivery with a real rider
 *   deliver -> out_for_delivery -> delivered
 *
 * Safety:
 *  - Only cashier / manager / admin / super_admin. A cashier must have an OPEN shift.
 *  - Status changes are validated (no skipping steps, no double-accept).
 *  - Accept is idempotent: an existing ticket for the same order is reused, never duplicated.
 *  - Accept refuses (nothing created, order stays pending) if any item cannot be matched to a POS product.
 *  - This function sends NO notifications; the caller notifies the one customer / one rider of that order.
 */

const STAFF_ROLES = ['admin', 'super_admin', 'manager', 'cashier'];
// Mirrors src/lib/kitchenOrderUtils.js so the KDS routes items to the same station as POS tickets
const BAR_CATEGORIES = ['Hot Coffee', 'Cold Coffee', 'Ice Blended Coffee', 'Hot Chocolate', 'Matcha', 'Fresher', 'Teas & More', 'Tea', 'Juices', 'Smoothies'];

const norm = (s: any) => String(s || '').trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!STAFF_ROLES.includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole.entities;

    if (user.role === 'cashier') {
      const shifts = await sr.Shift.filter({ status: 'open' }, '-opened_at', 1);
      if (!shifts || shifts.length === 0) {
        return Response.json({ error: 'Open a shift to manage delivery orders' }, { status: 403 });
      }
    }

    const body = await req.json();
    const { action, order_id, reason, rider_email } = body || {};

    if (action === 'list') {
      const orders = await sr.DeliveryOrder.list('-placed_at', 100);
      const riderUsers = await sr.User.filter({ role: 'rider' });
      const riders = (riderUsers || []).map((r: any) => ({ id: r.id, email: r.email, full_name: r.full_name, phone: r.phone }));
      return Response.json({ success: true, orders, riders });
    }

    if (typeof order_id !== 'string' || !order_id.trim()) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }
    const found = await sr.DeliveryOrder.filter({ id: order_id.trim() });
    const order = found && found[0];
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    const now = new Date().toISOString();
    const needStatus = (s: string) => {
      if (order.status !== s) {
        return Response.json({ error: `Order is ${order.status}, expected ${s}` }, { status: 409 });
      }
      return null;
    };

    if (action === 'accept') {
      const bad = needStatus('pending'); if (bad) return bad;

      // Map each delivery item to the POS product with the same name
      const storeProducts = await sr.StoreProduct.list('-created_date', 500);
      const byName = new Map((storeProducts || []).map((p: any) => [norm(p.name), p]));
      const lines: any[] = [];
      const unmatched: string[] = [];
      for (const it of order.items || []) {
        const p: any = byName.get(norm(it.product_name));
        if (!p) { unmatched.push(it.product_name); continue; }
        lines.push({ product: p, quantity: it.quantity, price: it.unit_price ?? p.price });
      }
      if (unmatched.length > 0) {
        return Response.json({
          error: `Can't send to POS: no matching POS product for ${unmatched.join(', ')}. Add it to the POS menu with the same name, or take this order manually.`,
        }, { status: 422 });
      }

      const ticketNumber = `D-${String(order.order_number || order.id).replace(/^DO-/, '')}`;
      const isPickup = order.order_type === 'pickup';
      const arriveAt = order.pickup_time ? new Date(order.pickup_time).toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }) : '';
      const label = `${isPickup ? '🛍' : '🛵'} ${order.customer_name || (isPickup ? 'Pickup' : 'Delivery')}`;
      const payLabel = order.payment_method === 'card_on_delivery' ? 'Card' : 'Cash';
      const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

      // Idempotent: reuse an existing ticket for this order
      const existing = await sr.OpenTicket.filter({ ticket_number: ticketNumber });
      let ticket = existing && existing[0];
      if (!ticket) {
        ticket = await sr.OpenTicket.create({
          ticket_number: ticketNumber,
          customer_name: label,
          customer_phone: order.customer_phone || '',
          order_type: 'takeaway',
          counter: 'counter_1',
          status: 'Open',
          opened_by: user.email,
          opened_by_name: user.full_name || '',
          total_estimate: subtotal,
        });
        await sr.OpenTicketItem.bulkCreate(lines.map((l) => ({
          ticket_id: ticket.id,
          product_id: l.product.id,
          product_name: l.product.name,
          price: l.price,
          quantity: l.quantity,
          status: 'Pending',
          added_by: user.email,
          added_by_name: user.full_name || '',
        })));
      }

      const existingKds = await sr.KitchenOrder.filter({ bill_number: ticketNumber });
      if (!existingKds || existingKds.length === 0) {
        const items = lines.map((l) => ({
          product_id: l.product.id,
          product_name: l.product.name,
          quantity: l.quantity,
          price: l.price,
          category: l.product.category || 'Other',
          notes: '',
          station: BAR_CATEGORIES.includes(l.product.category) ? 'bar' : 'kitchen',
          status: 'pending',
          added_at: now,
        }));
        const hasKitchen = items.some((i) => i.station === 'kitchen');
        const hasBar = items.some((i) => i.station === 'bar');
        const seq = String(order.order_number || '').replace(/\D/g, '').replace(/^0+/, '') || '0';
        await sr.KitchenOrder.create({
          order_number: `#D${seq}`,
          bill_number: ticketNumber,
          order_type: 'takeaway',
          counter: 'counter_1',
          customer_name: label,
          items,
          kitchen_status: hasKitchen ? 'pending' : 'not_applicable',
          bar_status: hasBar ? 'pending' : 'not_applicable',
          overall_status: 'queued',
          priority: 10,
          total_amount: subtotal,
          payment_method: payLabel,
          placed_at: now,
          items_added_at: now,
          notes: `${isPickup ? 'PICKUP' + (arriveAt ? ' ~' + arriveAt : '') : 'DELIVERY'} ${order.order_number}${order.delivery_notes ? ' · ' + order.delivery_notes : ''}`,
        });
      }

      await sr.DeliveryOrder.update(order.id, { status: 'accepted', accepted_at: now });
      return Response.json({ success: true, ticket_number: ticketNumber });
    }

    if (action === 'reject') {
      const bad = needStatus('pending'); if (bad) return bad;
      const r = String(reason || '').trim();
      if (!r) return Response.json({ error: 'A reason is required' }, { status: 400 });
      await sr.DeliveryOrder.update(order.id, { status: 'cancelled', rejection_reason: r });
      return Response.json({ success: true });
    }

    if (action === 'prepare') {
      const bad = needStatus('accepted'); if (bad) return bad;
      await sr.DeliveryOrder.update(order.id, { status: 'preparing' });
      return Response.json({ success: true });
    }

    if (action === 'ready') {
      if (order.order_type !== 'pickup') return Response.json({ error: 'Only pickup orders can be marked ready for pickup' }, { status: 400 });
      const bad = needStatus('preparing'); if (bad) return bad;
      await sr.DeliveryOrder.update(order.id, { status: 'ready_for_pickup' });
      return Response.json({ success: true });
    }

    if (action === 'assign') {
      if (order.order_type === 'pickup') return Response.json({ error: 'Pickup orders do not need a rider' }, { status: 400 });
      const bad = needStatus('preparing'); if (bad) return bad;
      const email = String(rider_email || '').trim().toLowerCase();
      if (!email) return Response.json({ error: 'rider_email is required' }, { status: 400 });
      const riders = await sr.User.filter({ role: 'rider' });
      const rider = (riders || []).find((r: any) => String(r.email || '').trim().toLowerCase() === email);
      if (!rider) return Response.json({ error: 'That person is not a rider' }, { status: 400 });
      await sr.DeliveryOrder.update(order.id, {
        status: 'out_for_delivery',
        rider_email: rider.email,
        rider_name: rider.full_name || rider.email,
        rider_phone: rider.phone || '',
      });
      return Response.json({ success: true, rider_name: rider.full_name || rider.email });
    }

    if (action === 'deliver') {
      const bad = needStatus(order.order_type === 'pickup' ? 'ready_for_pickup' : 'out_for_delivery'); if (bad) return bad;
      await sr.DeliveryOrder.update(order.id, { status: 'delivered', delivered_at: now });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('posDelivery error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
