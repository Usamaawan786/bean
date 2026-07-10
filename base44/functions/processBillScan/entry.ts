import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Canonical PKR-per-point fallback. The live value is RewardSettings.pkr_per_point
// (currently 100). Keep in sync with src/lib/loyaltyConfig.js.
const DEFAULT_PKR_PER_POINT = 100;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const qrCodeId = body.qrCodeId || body.qr_code_id;

    if (!qrCodeId) {
      return Response.json({ success: false, error: 'QR code ID is required' }, { status: 400 });
    }

    console.log('Processing QR scan for:', qrCodeId, 'by user:', user.email);

    // 1. Retrieve StoreSale by qrCodeId (service role — StoreSale is admin-only)
    const sales = await base44.asServiceRole.entities.StoreSale.filter({ qr_code_id: qrCodeId });

    if (sales.length === 0) {
      return Response.json({ success: false, error: 'Invalid QR code — receipt not found.' });
    }

    const sale = sales[0];

    // 1b. One-time enforcement. The atomic updateMany lock below only guards the
    // concurrent FIRST-scan race; without this check, the SAME user re-scanning
    // would pass the re-read (scanned_by === their email) and earn points again.
    // Block any already-scanned bill immediately, by anyone.
    if (sale.is_scanned) {
      return Response.json({ success: false, error: 'Points already redeemed for this bill.' });
    }

    // 2. Validate — expiry (check before claiming the lock so we don't mark
    // an expired sale as scanned)
    if (sale.qr_expires_at && new Date() > new Date(sale.qr_expires_at)) {
      return Response.json({ success: false, error: 'This QR code has expired.' });
    }

    // 3. ATOMIC SCAN LOCK — claim the sale BEFORE awarding any points.
    // updateMany with a filter checking is_scanned: false ensures only one
    // concurrent request can flip the flag; the second sees 0 rows match.
    // This closes the double-scan race window that existed when the lock was
    // applied at the end of the function.
    await base44.asServiceRole.entities.StoreSale.updateMany(
      { _id: sale.id, is_scanned: false },
      { $set: { is_scanned: true, scanned_by: user.email, scanned_at: new Date().toISOString() } }
    );

    // Re-read to confirm WE hold the lock (scanned_by === our email).
    const lockedSale = await base44.asServiceRole.entities.StoreSale.get(sale.id);
    if (!lockedSale || lockedSale.scanned_by !== user.email) {
      return Response.json({ success: false, error: 'Points already redeemed for this bill.' });
    }

    // 4. Fetch RewardSettings ONCE — reused for both pkrPerPoint and referral config.
    let pkrPerPoint = DEFAULT_PKR_PER_POINT;
    let REFERRAL_SPEND_THRESHOLD = 2000;
    let REFERRAL_BONUS_REFERRER = 25;
    let REFERRAL_BONUS_JOINEE = 25;
    try {
      const settings = await base44.asServiceRole.entities.RewardSettings.list('-created_date', 1);
      if (settings.length > 0) {
        if (settings[0].pkr_per_point) pkrPerPoint = settings[0].pkr_per_point;
        if (settings[0].referral_spend_threshold) REFERRAL_SPEND_THRESHOLD = settings[0].referral_spend_threshold;
        if (settings[0].referral_bonus_points) REFERRAL_BONUS_REFERRER = settings[0].referral_bonus_points;
        if (settings[0].referral_joinee_bonus_points) REFERRAL_BONUS_JOINEE = settings[0].referral_joinee_bonus_points;
      }
    } catch (e) {
      console.log('Could not fetch RewardSettings, using defaults');
    }

    // 5. Calculate points to award
    let pointsToAward = 0;
    if (sale.points_awarded && sale.points_awarded > 0) {
      pointsToAward = sale.points_awarded;
    } else {
      const billAmount = sale.subtotal || sale.total_amount || 0;
      pointsToAward = Math.floor(billAmount / pkrPerPoint);
    }

    if (pointsToAward <= 0) {
      return Response.json({ success: false, error: 'No points could be awarded for this bill. Bill amount may be too low.' });
    }

    // 6. Get customer record
    const customers = await base44.asServiceRole.entities.Customer.filter({ user_email: user.email });
    const customerList = customers.length > 0
      ? customers
      : await base44.asServiceRole.entities.Customer.filter({ created_by: user.email });

    if (customerList.length === 0) {
      return Response.json({ success: false, error: 'Customer profile not found. Please set up your profile first.' });
    }

    const customer = customerList[0];
    const oldBalance = customer.points_balance || 0;
    const newPointsBalance = oldBalance + pointsToAward;
    const newTotalEarned = (customer.total_points_earned || 0) + pointsToAward;
    const newTotalSpend = (customer.total_spend_pkr || 0) + (sale.subtotal || sale.total_amount || 0);

    // 7. Handle referral bonus logic
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
        referralBonus = REFERRAL_BONUS_JOINEE;

        await base44.asServiceRole.entities.Customer.update(customer.id, {
          points_balance: newPointsBalance + referralBonus,
          total_points_earned: newTotalEarned + referralBonus,
          total_spend_pkr: newTotalSpend,
          referral_bonus_awarded: true
        });

        await base44.asServiceRole.entities.Customer.update(referrer.id, {
          points_balance: (referrer.points_balance || 0) + REFERRAL_BONUS_REFERRER,
          total_points_earned: (referrer.total_points_earned || 0) + REFERRAL_BONUS_REFERRER,
          referral_conversions: (referrer.referral_conversions || 0) + 1,
          referral_points_earned: (referrer.referral_points_earned || 0) + REFERRAL_BONUS_REFERRER
        });

        await base44.asServiceRole.entities.Activity.create({
          user_email: referrer.created_by,
          action_type: "referral",
          description: `Your referral reached PKR ${REFERRAL_SPEND_THRESHOLD.toLocaleString()} — bonus unlocked!`,
          points_amount: REFERRAL_BONUS_REFERRER,
          metadata: { referred_email: user.email }
        });

        await base44.asServiceRole.entities.Activity.create({
          user_email: user.email,
          action_type: "referral",
          description: `Referral milestone reached — bonus points awarded!`,
          points_amount: REFERRAL_BONUS_JOINEE,
          metadata: { referrer_email: customer.referred_by }
        });
      }
    } else {
      await base44.asServiceRole.entities.Customer.update(customer.id, {
        points_balance: newPointsBalance,
        total_points_earned: newTotalEarned,
        total_spend_pkr: newTotalSpend
      });
    }

    // 8. Log activity
    await base44.asServiceRole.entities.Activity.create({
      user_email: user.email,
      action_type: "points_earned",
      description: `Earned ${pointsToAward} points from in-store purchase (${sale.bill_number})`,
      points_amount: pointsToAward,
      metadata: { bill_number: sale.bill_number, sale_id: sale.id, amount_spent: sale.subtotal || sale.total_amount }
    });

    const finalBalance = newPointsBalance + referralBonus;
    console.log('Success. Points awarded:', pointsToAward, '| Final balance:', finalBalance, '| Referral bonus:', referralBonus);

    return Response.json({
      success: true,
      points_awarded: pointsToAward,
      old_balance: oldBalance,
      new_balance: finalBalance,
      referral_bonus: referralBonus,
      bill_number: sale.bill_number
    });

  } catch (error) {
    console.error('Error processing bill scan:', error);
    return Response.json({ success: false, error: error.message || 'An unexpected error occurred' });
  }
});