import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Soft-launch 10% discount: valid only on July 10-12, 2026 (Asia/Karachi),
// for app users / waitlist signups registered before July 12, 2026, max 3 uses each.
const VALID_DATES = ['2026-07-10', '2026-07-11', '2026-07-12'];
const ELIGIBILITY_CUTOFF = '2026-07-11T19:00:00.000Z'; // July 12 00:00 Asia/Karachi (UTC+5)
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

    // Enforce the valid redemption window (Asia/Karachi local date)
    const todayKarachi = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
    if (!VALID_DATES.includes(todayKarachi)) {
      return Response.json({ error: `This discount is only valid on July 10-12, 2026. Today (${todayKarachi}) is not eligible.` }, { status: 403 });
    }

    const entityName = record_type === 'customer' ? 'Customer' : 'WaitlistSignup';
    const record = await base44.asServiceRole.entities[entityName].get(record_id);
    if (!record) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    if (new Date(record.created_date) >= new Date(ELIGIBILITY_CUTOFF)) {
      return Response.json({ error: 'This person registered on or after July 12, 2026 and is not eligible for the soft-launch discount.' }, { status: 403 });
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