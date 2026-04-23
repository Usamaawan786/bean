import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { refCode, customerId } = await req.json();
    if (!refCode || !customerId) {
      return Response.json({ error: 'refCode and customerId required' }, { status: 400 });
    }

    // Find the referrer by referral_code
    const referrers = await base44.asServiceRole.entities.Customer.filter({ referral_code: refCode });
    if (referrers.length === 0) {
      return Response.json({ success: false, reason: 'referral_code_not_found' });
    }

    const referrer = referrers[0];

    // Don't self-refer
    if (referrer.created_by === user.email) {
      return Response.json({ success: false, reason: 'self_referral' });
    }

    // Check current customer — don't double-process
    const customers = await base44.asServiceRole.entities.Customer.filter({ id: customerId });
    if (customers.length === 0) return Response.json({ success: false, reason: 'customer_not_found' });
    const customer = customers[0];
    if (customer.referred_by) {
      return Response.json({ success: false, reason: 'already_referred' });
    }

    // Link referred_by on the new customer
    await base44.asServiceRole.entities.Customer.update(customerId, {
      referred_by: referrer.created_by
    });

    // Increment referrer's referral_count
    await base44.asServiceRole.entities.Customer.update(referrer.id, {
      referral_count: (referrer.referral_count || 0) + 1
    });

    // Log activity for referrer
    await base44.asServiceRole.entities.Activity.create({
      user_email: referrer.created_by,
      action_type: 'referral',
      description: 'A new friend joined using your referral link!',
      points_amount: 0,
      metadata: { referred_email: user.email }
    });

    console.log(`Referral processed: ${user.email} referred by ${referrer.created_by} (code: ${refCode})`);

    return Response.json({ success: true, referrerEmail: referrer.created_by });
  } catch (error) {
    console.error('processReferral error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});