import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const [allCustomers, allSignups, allUsers] = await Promise.all([
    base44.asServiceRole.entities.Customer.list('-created_date', 2000),
    base44.asServiceRole.entities.WaitlistSignup.list('-created_date', 5000),
    base44.asServiceRole.entities.User.list('-created_date', 2000),
  ]);

  // Build lookups
  const signupByEmail = {};
  allSignups.forEach(s => {
    if (s.email) signupByEmail[s.email.toLowerCase().trim()] = s;
  });

  const userByEmail = {};
  allUsers.forEach(u => {
    if (u.email) userByEmail[u.email.toLowerCase().trim()] = u;
  });

  let updatedFM = 0, updatedEBA = 0, skipped = 0;

  for (const customer of allCustomers) {
    const email = (customer.user_email || customer.created_by || '').toLowerCase().trim();
    if (!email) { skipped++; continue; }

    const signup = signupByEmail[email];

    // Determine FM: must be on waitlist
    const isFM = !!signup;

    // Determine EBA:
    // 1) Already marked EBA on customer record, OR
    // 2) Has is_eba flag from User entity (backfilled elsewhere), OR
    // 3) Has 5+ unique referrals via waitlist referral_code
    const userRecord = userByEmail[email];
    let isEBA = customer.is_eba || (userRecord?.is_eba === true) || false;

    if (!isEBA && signup?.referral_code) {
      const referrals = allSignups.filter(s => s.referred_by === signup.referral_code);
      const uniqueCount = new Set(referrals.map(r => r.email?.toLowerCase().trim()).filter(Boolean)).size;
      if (uniqueCount >= 5) isEBA = true;
    }

    // Also check referral_count on customer record
    if (!isEBA && (customer.referral_count || 0) >= 5) isEBA = true;

    const needsFMUpdate = !customer.is_founding_member && isFM;
    const needsEBAUpdate = !customer.is_eba && isEBA;

    // FM bonus: 100 pts total (50 welcome + 50 FM bonus). Top up if short.
    const needsPointsUpdate = isFM && !customer.is_founding_member && (customer.total_points_earned || 0) < 100;

    if (!needsFMUpdate && !needsEBAUpdate && !needsPointsUpdate) {
      skipped++;
      continue;
    }

    const updates = {};
    if (needsFMUpdate) { updates.is_founding_member = true; updatedFM++; }
    if (needsEBAUpdate) { updates.is_eba = true; updatedEBA++; }
    if (needsPointsUpdate) {
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
    total_waitlist: allSignups.length,
    updated_fm: updatedFM,
    updated_eba: updatedEBA,
    skipped,
  });
});