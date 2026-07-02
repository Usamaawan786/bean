import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Soft-launch 10% discount: TEMPORARILY enabled early for testing, hard-closes
// after July 12, 2026 11:59pm (Asia/Karachi). Max 3 uses each.
const WINDOW_CLOSE = '2026-07-12T18:59:59.999Z'; // July 12 23:59:59.999 Asia/Karachi (UTC+5)
const MAX_USES = 3;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['cashier', 'manager', 'admin', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized - staff access required' }, { status: 403 });
    }

    const { record_type, record_id } = await req.json();
    if (!record_type || !record_id || !['customer', 'waitlist'].includes(record_type)) {
      return Response.json({ error: 'record_type (customer|waitlist) and record_id are required' }, { status: 400 });
    }

    // Enforce the hard close after July 12, 2026 11:59pm Asia/Karachi
    if (new Date() > new Date(WINDOW_CLOSE)) {
      return Response.json({ error: 'The soft-launch discount window has closed (ended July 12, 2026 11:59pm).' }, { status: 403 });
    }

    const entityName = record_type === 'customer' ? 'Customer' : 'WaitlistSignup';
    const record = await base44.asServiceRole.entities[entityName].get(record_id);
    if (!record) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    const currentUses = record.launch_discount_uses || 0;
    if (currentUses >= MAX_USES) {
      return Response.json({ error: 'All 3 soft-launch discounts have already been used for this person.' }, { status: 409 });
    }

    const newUses = currentUses + 1;
    await base44.asServiceRole.entities[entityName].update(record_id, { launch_discount_uses: newUses });

    const customerName = record.display_name || record.full_name || record.user_email || record.email || 'Unknown';
    const customerEmail = record.user_email || record.email || record.created_by || '';

    const log = await base44.asServiceRole.entities.LaunchDiscountRedemption.create({
      record_type,
      record_id,
      customer_email: customerEmail,
      customer_name: customerName,
      redemption_number: newUses,
      redeemed_by: user.email,
    });

    return Response.json({ success: true, uses: newUses, remaining: MAX_USES - newUses, log });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});