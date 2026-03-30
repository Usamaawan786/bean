import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { qrCodeId } = body;

    if (!qrCodeId) {
      return Response.json({ error: 'QR code ID is required' }, { status: 400 });
    }

    // Find the sale with this QR code using service role
    const sales = await base44.asServiceRole.entities.StoreSale.filter({ qr_code_id: qrCodeId });

    if (sales.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Invalid QR code' 
      }, { status: 200 });
    }

    const sale = sales[0];

    // Check if already scanned
    if (sale.is_scanned) {
      return Response.json({ 
        success: false, 
        error: 'This QR code has already been redeemed. Please use a new one.' 
      }, { status: 200 });
    }

    // Calculate points: 100 PKR = 1 point
    const pointsToAward = Math.floor(sale.subtotal / 100);

    // Get customer record
    const customers = await base44.entities.Customer.filter({ created_by: user.email });
    
    if (customers.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Customer profile not found' 
      }, { status: 200 });
    }

    const customer = customers[0];
    const newTotalSpend = (customer.total_spend_pkr || 0) + (sale.subtotal || 0);
    const REFERRAL_SPEND_THRESHOLD = 2000;
    let referralBonus = 0;

    // Update customer points and total spend
    await base44.entities.Customer.update(customer.id, {
      points_balance: customer.points_balance + pointsToAward,
      total_points_earned: customer.total_points_earned + pointsToAward,
      total_spend_pkr: newTotalSpend
    });

    // Award referral bonus if referred user just crossed the 2000 PKR spend threshold
    const justCrossedThreshold = 
      customer.referred_by &&
      !customer.referral_bonus_awarded &&
      (customer.total_spend_pkr || 0) < REFERRAL_SPEND_THRESHOLD &&
      newTotalSpend >= REFERRAL_SPEND_THRESHOLD;

    if (justCrossedThreshold) {
      const referrers = await base44.asServiceRole.entities.Customer.filter({ created_by: customer.referred_by });
      if (referrers.length > 0) {
        const referrer = referrers[0];
        referralBonus = 25;

        // Mark referred user's bonus as awarded and give them 25 pts
        await base44.asServiceRole.entities.Customer.update(customer.id, {
          referral_bonus_awarded: true,
          points_balance: customer.points_balance + pointsToAward + 25,
          total_points_earned: customer.total_points_earned + pointsToAward + 25
        });

        // Give referrer 25 pts
        await base44.asServiceRole.entities.Customer.update(referrer.id, {
          points_balance: referrer.points_balance + 25,
          total_points_earned: referrer.total_points_earned + 25,
          referral_conversions: (referrer.referral_conversions || 0) + 1,
          referral_points_earned: (referrer.referral_points_earned || 0) + 25
        });

        // Log activities
        await base44.asServiceRole.entities.Activity.create({
          user_email: referrer.created_by,
          action_type: "referral",
          description: `Your referral reached PKR 2,000 — bonus unlocked!`,
          points_amount: 25,
          metadata: { referred_email: user.email }
        });

        await base44.asServiceRole.entities.Activity.create({
          user_email: user.email,
          action_type: "referral",
          description: `Referral milestone reached — bonus points awarded!`,
          points_amount: 25,
          metadata: { referrer_email: customer.referred_by }
        });
      }
    }


    await base44.asServiceRole.entities.StoreSale.update(sale.id, {
      is_scanned: true,
      scanned_by: user.email,
      scanned_at: new Date().toISOString(),
      points_awarded: pointsToAward
    });

    return Response.json({
      success: true,
      points_awarded: pointsToAward,
      new_balance: customer.points_balance + pointsToAward + referralBonus,
      referral_bonus: referralBonus
    });

  } catch (error) {
    console.error('Error processing bill scan:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'An error occurred' 
    }, { status: 200 });
  }
});