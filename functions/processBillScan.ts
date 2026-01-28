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

    // Calculate points based on subtotal (before tax)
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

    // Check if this is first purchase for a referred user
    const isFirstPurchase = customer.total_points_earned === 0 || customer.total_points_earned === 50;
    let referralBonus = 0;

    // Update customer points
    await base44.entities.Customer.update(customer.id, {
      points_balance: customer.points_balance + pointsToAward,
      total_points_earned: customer.total_points_earned + pointsToAward
    });

    // Award referral bonus if applicable
    if (isFirstPurchase && customer.referred_by) {
      const referrers = await base44.asServiceRole.entities.Customer.filter({ created_by: customer.referred_by });
      if (referrers.length > 0) {
        const referrer = referrers[0];
        referralBonus = 100;
        
        // Award to referrer
        await base44.asServiceRole.entities.Customer.update(referrer.id, {
          points_balance: referrer.points_balance + 100,
          total_points_earned: referrer.total_points_earned + 100,
          referral_count: (referrer.referral_count || 0) + 1,
          referral_conversions: (referrer.referral_conversions || 0) + 1,
          referral_points_earned: (referrer.referral_points_earned || 0) + 100
        });

        // Award to referred user
        await base44.asServiceRole.entities.Customer.update(customer.id, {
          points_balance: customer.points_balance + pointsToAward + 100,
          total_points_earned: customer.total_points_earned + pointsToAward + 100
        });

        // Log activities
        await base44.asServiceRole.entities.Activity.create({
          user_email: referrer.created_by,
          action_type: "referral",
          description: `Referral made their first purchase!`,
          points_amount: 100,
          metadata: { referred_email: user.email }
        });

        await base44.asServiceRole.entities.Activity.create({
          user_email: user.email,
          action_type: "referral",
          description: `Referral bonus unlocked!`,
          points_amount: 100,
          metadata: { referrer_email: customer.referred_by }
        });
      }
    }

    // Mark sale as scanned using service role
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