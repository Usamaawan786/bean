import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const [allCustomers, allSignups] = await Promise.all([
    base44.asServiceRole.entities.Customer.list('-created_date', 1000),
    base44.asServiceRole.entities.WaitlistSignup.list(),
  ]);

  // Build a quick lookup: email -> WaitlistSignup record
  const signupByEmail = {};
  allSignups.forEach(s => {
    if (s.email) signupByEmail[s.email.toLowerCase()] = s;
  });

  let updatedFM = 0, updatedEBA = 0, skipped = 0;

  for (const customer of allCustomers) {
    const email = (customer.user_email || customer.created_by || '').toLowerCase();
    if (!email) { skipped++; continue; }

    const signup = signupByEmail[email];

    // If no waitlist entry → not FM, skip
    if (!signup) { skipped++; continue; }

    const isFM = true;
    let isEBA = customer.is_eba || false;

    // Check EBA: count unique referrals using this signup's referral_code
    if (!isEBA && signup.referral_code) {
      const referrals = allSignups.filter(s => s.referred_by === signup.referral_code);
      const uniqueCount = new Set(referrals.map(r => r.email)).size;
      if (uniqueCount >= 5) isEBA = true;
    }

    const needsFMUpdate = !customer.is_founding_member && isFM;
    const needsEBAUpdate = !customer.is_eba && isEBA;
    const needsPointsUpdate = !customer.is_founding_member && isFM && (customer.total_points_earned || 0) < 100;

    if (!needsFMUpdate && !needsEBAUpdate && !needsPointsUpdate) {
      skipped++;
      continue;
    }

    const updates = {};
    if (needsFMUpdate) { updates.is_founding_member = true; updatedFM++; }
    if (needsEBAUpdate) { updates.is_eba = true; updatedEBA++; }
    if (needsPointsUpdate) {
      // They should have gotten 100 pts (50 welcome + 50 FM bonus) — top up if less
      const missing = 100 - (customer.total_points_earned || 0);
      if (missing > 0) {
        updates.points_balance = (customer.points_balance || 0) + missing;
        updates.total_points_earned = (customer.total_points_earned || 0) + missing;
      }
    }

    await base44.asServiceRole.entities.Customer.update(customer.id, updates);
  }

  return Response.json({
    success: true,
    total_customers: allCustomers.length,
    updated_fm: updatedFM,
    updated_eba: updatedEBA,
    skipped,
  });
});