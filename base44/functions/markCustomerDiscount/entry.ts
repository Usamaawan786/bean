import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['admin', 'super_admin', 'manager', 'cashier'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ success: false, error: 'Forbidden — only staff may mark discounts.' }, { status: 403 });
    }

    const body = await req.json();
    const { customer_id, discount_type } = body;
    // discount_type: "fm" | "eba"

    if (!customer_id || !['fm', 'eba'].includes(discount_type)) {
      return Response.json({ success: false, error: 'customer_id and discount_type (fm|eba) are required.' }, { status: 400 });
    }

    const field = discount_type === 'fm' ? 'fm_discount_used' : 'eba_discount_used';

    // Read current value server-side (service role) — never trust client-sent counts.
    const customer = await base44.asServiceRole.entities.Customer.get(customer_id);
    if (!customer) {
      return Response.json({ success: false, error: 'Customer not found.' }, { status: 404 });
    }

    const current = customer[field] || 0;
    if (current >= 3) {
      return Response.json({ success: false, error: 'All 3 discounts already used.' });
    }

    // Atomic increment using updateMany with a guard filter — prevents a race where
    // two cashiers mark simultaneously and both pass the < 3 check. The filter
    // { _id, [field]: current } ensures the write only lands if no concurrent
    // write has bumped the count in between.
    const result = await base44.asServiceRole.entities.Customer.updateMany(
      { _id: customer_id, [field]: current },
      { $inc: { [field]: 1 } }
    );

    // Re-read to confirm the increment landed.
    const updated = await base44.asServiceRole.entities.Customer.get(customer_id);
    const newValue = updated[field] || 0;
    if (newValue !== current + 1) {
      return Response.json({ success: false, error: 'Discount could not be marked — concurrent update detected. Please retry.' });
    }

    return Response.json({
      success: true,
      discount_type,
      new_value: newValue,
      remaining: Math.max(0, 3 - newValue)
    });
  } catch (error) {
    console.error('markCustomerDiscount error:', error);
    return Response.json({ success: false, error: error.message || 'Unexpected error' }, { status: 500 });
  }
});