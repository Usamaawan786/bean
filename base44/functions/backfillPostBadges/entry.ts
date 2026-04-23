import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all customers (service role so we can see everyone)
  const customers = await base44.asServiceRole.entities.Customer.list('-created_date', 1000);
  const customerByEmail = {};
  for (const c of customers) {
    if (c.created_by) customerByEmail[c.created_by] = c;
    if (c.user_email) customerByEmail[c.user_email] = customerByEmail[c.user_email] || c;
  }

  function getBadges(customer) {
    if (!customer) return [];
    const badges = [];
    if (customer.is_founding_member) badges.push('founding_member');
    if (customer.is_eba) badges.push('eba');
    if (customer.tier === 'Platinum') badges.push('platinum');
    else if (customer.tier === 'Gold') badges.push('gold');
    (customer.custom_badges || []).forEach(k => { if (!badges.includes(k)) badges.push(k); });
    return badges;
  }

  // Fetch all posts
  const posts = await base44.asServiceRole.entities.CommunityPost.list('-created_date', 2000);

  let updated = 0;
  for (const post of posts) {
    const customer = customerByEmail[post.author_email];
    const badges = getBadges(customer);
    const existing = post.author_badges || [];
    // Only update if different
    const same = badges.length === existing.length && badges.every((b, i) => b === existing[i]);
    if (!same) {
      await base44.asServiceRole.entities.CommunityPost.update(post.id, { author_badges: badges });
      updated++;
    }
  }

  return Response.json({ success: true, total: posts.length, updated });
});