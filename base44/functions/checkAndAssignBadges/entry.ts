import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Can be called from automation (no user) or by admin
  let customerId = null;
  try {
    const body = await req.json();
    customerId = body?.customerId || body?.data?.id || null;
  } catch (_) {}

  const customers = customerId
    ? [await base44.asServiceRole.entities.Customer.get(customerId)]
    : await base44.asServiceRole.entities.Customer.list('-created_date', 1000);

  // Fetch all active badge defs with auto criteria
  const allBadgeDefs = await base44.asServiceRole.entities.BadgeDefinition.filter({ is_active: true });
  const autoBadgeDefs = allBadgeDefs.filter(b => b.auto_criteria_type && b.auto_criteria_type !== 'none');

  // Fetch post counts per user
  const allPosts = await base44.asServiceRole.entities.CommunityPost.filter({ moderation_status: 'approved' });
  const postCountByEmail = {};
  allPosts.forEach(p => {
    if (p.author_email) postCountByEmail[p.author_email] = (postCountByEmail[p.author_email] || 0) + 1;
  });

  let updatedCount = 0;

  for (const customer of customers) {
    if (!customer) continue;
    const email = customer.created_by;
    const postCount = postCountByEmail[email] || 0;
    const existingCustomBadges = customer.custom_badges || [];

    const newCustomBadges = [...existingCustomBadges];

    for (const badge of autoBadgeDefs) {
      const { key, auto_criteria_type, auto_criteria_value } = badge;
      let isEligible = false;

      if (auto_criteria_type === 'points') {
        isEligible = (customer.total_points_earned || 0) >= parseInt(auto_criteria_value || '0');
      } else if (auto_criteria_type === 'tier') {
        const tierOrder = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3 };
        isEligible = (tierOrder[customer.tier] || 0) >= (tierOrder[auto_criteria_value] || 0);
      } else if (auto_criteria_type === 'referrals') {
        isEligible = (customer.referral_count || 0) >= parseInt(auto_criteria_value || '0');
      } else if (auto_criteria_type === 'posts') {
        isEligible = postCount >= parseInt(auto_criteria_value || '0');
      }

      const alreadyHas = newCustomBadges.includes(key);
      if (isEligible && !alreadyHas) {
        newCustomBadges.push(key);
      } else if (!isEligible && alreadyHas) {
        const idx = newCustomBadges.indexOf(key);
        newCustomBadges.splice(idx, 1);
      }
    }

    const changed = JSON.stringify(newCustomBadges.sort()) !== JSON.stringify(existingCustomBadges.sort());
    if (changed) {
      await base44.asServiceRole.entities.Customer.update(customer.id, { custom_badges: newCustomBadges });
      updatedCount++;
    }
  }

  return Response.json({ success: true, checked: customers.length, updated: updatedCount });
});