import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getActiveMultiplier } from '../../shared/pointsMultiplier.ts';

// Test harness: verifies the multiplier logic without needing a POS login.
// Creates a 2x campaign, checks the multiplier applies, pauses it, checks it reverts.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const log = [];
  const pkrPerPoint = 100;
  const billAmount = 1000; // PKR 1000 spend → 10 base points

  try {
    // 1. Baseline: no campaigns → multiplier 1
    const multBefore = await getActiveMultiplier(base44);
    log.push(`baseline multiplier=${multBefore} (expect 1)`);

    // 2. Create a 2x campaign (always-on, no schedule)
    const campaign = await base44.asServiceRole.entities.PointsCampaign.create({
      name: "TEST 2x Campaign",
      multiplier: 2,
      is_active: true,
      created_by: "test@bean.com"
    });
    log.push(`created campaign ${campaign.id} multiplier=2`);

    // 3. Multiplier should now be 2
    const multActive = await getActiveMultiplier(base44);
    const basePoints = Math.floor(billAmount / pkrPerPoint); // 10
    const pointsWithMult = basePoints * multActive; // 20
    log.push(`active multiplier=${multActive}, basePoints=${basePoints}, pointsWithMult=${pointsWithMult}`);

    // 4. Create a StoreSale with the multiplied points (simulates saveSale)
    const sale = await base44.asServiceRole.entities.StoreSale.create({
      bill_number: "TEST-MULT-" + Date.now(),
      items: [{ product_name: "Test Coffee", quantity: 1, price: 1000 }],
      subtotal: 1000,
      total_amount: 1170,
      payment_method: "Cash",
      qr_code_id: "TESTQRMULT" + Date.now(),
      is_scanned: false,
      points_awarded: pointsWithMult,
      points_multiplier: multActive,
      qr_expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString()
    });
    log.push(`created sale ${sale.id} points_awarded=${sale.points_awarded} multiplier=${sale.points_multiplier}`);

    // 5. Pause the campaign → multiplier reverts to 1
    await base44.asServiceRole.entities.PointsCampaign.update(campaign.id, { is_active: false });
    const multPaused = await getActiveMultiplier(base44);
    const pointsPaused = basePoints * multPaused; // 10
    log.push(`after pause multiplier=${multPaused}, pointsPaused=${pointsPaused}`);

    // 6. Create a second sale with standard points
    const sale2 = await base44.asServiceRole.entities.StoreSale.create({
      bill_number: "TEST-STD-" + Date.now(),
      items: [{ product_name: "Test Coffee", quantity: 1, price: 1000 }],
      subtotal: 1000,
      total_amount: 1170,
      payment_method: "Cash",
      qr_code_id: "TESTQRSTD" + Date.now(),
      is_scanned: false,
      points_awarded: pointsPaused,
      points_multiplier: multPaused,
      qr_expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString()
    });
    log.push(`created sale2 ${sale2.id} points_awarded=${sale2.points_awarded} multiplier=${sale2.points_multiplier}`);

    // 7. Cleanup test data
    await base44.asServiceRole.entities.PointsCampaign.delete(campaign.id);
    await base44.asServiceRole.entities.StoreSale.delete(sale.id);
    await base44.asServiceRole.entities.StoreSale.delete(sale2.id);
    log.push("cleanup done");

    const testPassed = multActive === 2 && pointsWithMult === 20 && multPaused === 1 && pointsPaused === 10
      && sale.points_awarded === 20 && sale2.points_awarded === 10;

    return Response.json({
      success: true,
      testPassed,
      results: {
        baselineMultiplier: multBefore,
        activeMultiplier: multActive,
        pointsWith2x: pointsWithMult,
        pausedMultiplier: multPaused,
        pointsWith1x: pointsPaused,
        sale1Points: sale.points_awarded,
        sale1Multiplier: sale.points_multiplier,
        sale2Points: sale2.points_awarded,
        sale2Multiplier: sale2.points_multiplier
      },
      log
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message, log }, { status: 500 });
  }
});