import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { customerEmail, totalSpend } = body;

    if (!customerEmail || totalSpend === undefined) {
      return Response.json({ error: 'customerEmail and totalSpend required' }, { status: 400 });
    }

    // Fetch customer to check if they have a referrer
    const customers = await base44.asServiceRole.entities.Customer.filter({ created_by: customerEmail });
    if (customers.length === 0) {
      return Response.json({ success: true, message: 'Customer not found' });
    }

    const customer = customers[0];
    const referrerEmail = customer.referred_by;

    // If customer was referred AND total spend is >= 2000 PKR AND we haven't awarded bonus yet
    if (referrerEmail && totalSpend >= 2000 && !customer.referral_bonus_awarded) {
      // Fetch referrer customer record
      const referrerCustomers = await base44.asServiceRole.entities.Customer.filter({ created_by: referrerEmail });
      if (referrerCustomers.length > 0) {
        const referrer = referrerCustomers[0];
        const bonusPoints = 25;

        // Award 25 points to referrer
        await base44.asServiceRole.entities.Customer.update(referrer.id, {
          points_balance: (referrer.points_balance || 0) + bonusPoints,
          total_points_earned: (referrer.total_points_earned || 0) + bonusPoints,
          referral_conversions: (referrer.referral_conversions || 0) + 1,
          referral_points_earned: (referrer.referral_points_earned || 0) + bonusPoints
        });

        // Mark this referral as bonus-awarded on the referred customer
        await base44.asServiceRole.entities.Customer.update(customer.id, {
          referral_bonus_awarded: true
        });

        // Log activity for referrer
        await base44.asServiceRole.entities.Activity.create({
          user_email: referrerEmail,
          action_type: "referral",
          description: `A referred friend spent PKR ${totalSpend} — earned ${bonusPoints} bonus points!`,
          points_amount: bonusPoints,
          metadata: { referred_email: customerEmail, spend_amount: totalSpend }
        });

        return Response.json({
          success: true,
          message: `Awarded ${bonusPoints} points to referrer`,
          referrerEmail,
          bonusPoints,
          referralConversions: (referrer.referral_conversions || 0) + 1
        });
      }
    }

    return Response.json({ success: true, message: 'No referral bonus to award' });
  } catch (error) {
    console.error('Error processing referral rewards:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});