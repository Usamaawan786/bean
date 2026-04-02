import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

    // Find the sale with this QR code
    const sales = await base44.asServiceRole.entities.StoreSale.filter({ qr_code_id: qrCodeId });

    if (sales.length === 0) {
      return Response.json({ success: false, error: 'Invalid QR code — not found.' });
    }

    const sale = sales[0];

    // Check if already scanned (expired/used)
    if (sale.is_scanned) {
      return Response.json({ success: false, error: 'This QR code has already been redeemed.' });
    }

    // Check time-based expiry
    if (sale.qr_expires_at && new Date() > new Date(sale.qr_expires_at)) {
      return Response.json({ success: false, error: 'This QR code has expired.' });
    }

    // Use pre-calculated points from sale, fallback to RewardSettings, then 100 PKR = 1 pt
    let pointsToAward = sale.points_awarded;
    if (!pointsToAward || pointsToAward <= 0) {
      let pkrPerPoint = 100;
      try {
        const settings = await base44.asServiceRole.entities.RewardSettings.list('-created_date', 1);
        if (settings.length > 0 && settings[0].pkr_per_point) {
          pkrPerPoint = settings[0].pkr_per_point;
        }
      } catch (e) { /* use default */ }
      pointsToAward = Math.floor((sale.subtotal || 0) / pkrPerPoint);
    }

    // Get customer record (user-scoped — customer's own record)
    const customers = await base44.entities.Customer.filter({ created_by: user.email });

    if (customers.length === 0) {
      return Response.json({ success: false, error: 'Customer profile not found. Please set up your profile first.' });
    }

    const customer = customers[0];
    const newPointsBalance = (customer.points_balance || 0) + pointsToAward;
    const newTotalEarned = (customer.total_points_earned || 0) + pointsToAward;
    const newTotalSpend = (customer.total_spend_pkr || 0) + (sale.subtotal || 0);

    const REFERRAL_SPEND_THRESHOLD = 2000;
    const justCrossedThreshold =
      customer.referred_by &&
      !customer.referral_bonus_awarded &&
      (customer.total_spend_pkr || 0) < REFERRAL_SPEND_THRESHOLD &&
      newTotalSpend >= REFERRAL_SPEND_THRESHOLD;

    let referralBonus = 0;

    if (justCrossedThreshold) {
      const referrers = await base44.asServiceRole.entities.Customer.filter({ created_by: customer.referred_by });
      if (referrers.length > 0) {
        const referrer = referrers[0];
        referralBonus = 25;

        // Update referred user with bonus (single update with all values)
        await base44.asServiceRole.entities.Customer.update(customer.id, {
          referral_bonus_awarded: true,
          points_balance: newPointsBalance + 25,
          total_points_earned: newTotalEarned + 25,
          total_spend_pkr: newTotalSpend
        });

        // Give referrer 25 pts
        await base44.asServiceRole.entities.Customer.update(referrer.id, {
          points_balance: (referrer.points_balance || 0) + 25,
          total_points_earned: (referrer.total_points_earned || 0) + 25,
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
    } else {
      // Normal update — no referral bonus
      await base44.entities.Customer.update(customer.id, {
        points_balance: newPointsBalance,
        total_points_earned: newTotalEarned,
        total_spend_pkr: newTotalSpend
      });
    }

    // Mark sale as scanned
    await base44.asServiceRole.entities.StoreSale.update(sale.id, {
      is_scanned: true,
      scanned_by: user.email,
      scanned_at: new Date().toISOString(),
      points_awarded: pointsToAward
    });

    // Log activity
    await base44.entities.Activity.create({
      user_email: user.email,
      action_type: "points_earned",
      description: `Earned ${pointsToAward} points from in-store purchase (${sale.bill_number})`,
      points_amount: pointsToAward,
      metadata: { bill_number: sale.bill_number, sale_id: sale.id }
    });

    return Response.json({
      success: true,
      points_awarded: pointsToAward,
      new_balance: newPointsBalance + referralBonus,
      referral_bonus: referralBonus,
      bill_number: sale.bill_number
    });

  } catch (error) {
    console.error('Error processing bill scan:', error);
    return Response.json({ success: false, error: error.message || 'An error occurred' });
  }
});