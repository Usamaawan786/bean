import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Personalized Push Engine — profile builder + message generator.
 *
 * Scans every StoreSale the customer scanned for points (is_scanned=true,
 * scanned_by set), builds a per-customer order profile (favorite item,
 * repeat-order flag, recency, spend, segment), then writes a tailored
 * draft push into PersonalizedPush for admin review before anything sends.
 *
 * Admin-only. MVP uses rule-based templates (no LLM cost); the admin can
 * edit any draft before approving, and an AI-polish pass can be layered on
 * later without changing this contract.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    // 1. Load scanned bills (customer scanned the QR for points)
    const scannedPage = await base44.asServiceRole.entities.StoreSale.filter(
      { is_scanned: true },
      { sort: '-scanned_at', limit: 2000, fields: ['scanned_by', 'scanned_at', 'items', 'total_amount'] }
    );
    const scannedSales = (scannedPage.items || scannedPage || []).filter(s => s && s.scanned_by);

    // 2. Build per-customer order profiles from scanned bills
    const profilesMap = {};
    for (const sale of scannedSales) {
      const email = sale.scanned_by;
      if (!profilesMap[email]) {
        profilesMap[email] = { email, itemCount: {}, orderCount: 0, totalSpend: 0, lastScan: 0 };
      }
      const p = profilesMap[email];
      p.orderCount++;
      p.totalSpend += sale.total_amount || 0;
      const ts = sale.scanned_at ? new Date(sale.scanned_at).getTime() : 0;
      if (ts > p.lastScan) p.lastScan = ts;
      for (const it of (sale.items || [])) {
        if (!it.product_name) continue;
        p.itemCount[it.product_name] = (p.itemCount[it.product_name] || 0) + (it.quantity || 1);
      }
    }

    // 3. Load customers for display names
    const customers = await base44.asServiceRole.entities.Customer.list();
    const customerMap = {};
    for (const c of customers) {
      if (c.user_email) customerMap[c.user_email.toLowerCase()] = c;
    }

    // 4. Finalize profiles: favorite item, repeat flag, segment
    const now = Date.now();
    const profiles = [];
    for (const email of Object.keys(profilesMap)) {
      const p = profilesMap[email];
      let favItem = null, favCount = 0;
      for (const name of Object.keys(p.itemCount)) {
        if (p.itemCount[name] > favCount) { favCount = p.itemCount[name]; favItem = name; }
      }
      const repeatItem = favCount >= 2 ? favItem : null;
      const daysSince = p.lastScan ? Math.floor((now - p.lastScan) / 86400000) : null;

      let segment;
      if (p.orderCount < 2) segment = 'new';
      else if (daysSince !== null && daysSince > 14) segment = 'lapsed';
      else if (p.totalSpend >= 5000) segment = 'high_value';
      else segment = 'regular';

      const cust = customerMap[email.toLowerCase()];
      const displayName = cust?.display_name || email;
      const firstName = (displayName.split(' ')[0] || displayName).trim();

      profiles.push({
        email, displayName, firstName,
        favoriteItem: favItem, repeatItem,
        orderCount: p.orderCount,
        totalSpend: Math.round(p.totalSpend),
        daysSinceLast: daysSince, segment
      });
    }

    // 5. Rule-based message templates per segment
    const buildMessage = (p) => {
      const item = p.favoriteItem || 'your favorite brew';
      switch (p.segment) {
        case 'lapsed':
          return {
            title: `We miss you, ${p.firstName}!`,
            body: `It's been a while since your last visit. Your usual ${item} is waiting for you at Bean — come grab it ☕`,
            deep_link: '/Home'
          };
        case 'high_value':
          return {
            title: `You're a Bean VIP, ${p.firstName}`,
            body: `Thank you for being one of our top customers. Enjoy double points on your next ${item} ✨`,
            deep_link: '/Rewards'
          };
        case 'new':
          return {
            title: `Welcome to the Bean family, ${p.firstName}!`,
            body: `Loved by our regulars — try our ${item} on your next visit and start earning points 🤎`,
            deep_link: '/Home'
          };
        default:
          return {
            title: `Time for your usual, ${p.firstName}?`,
            body: `You've ordered ${item} ${p.repeatItem ? 'a few times now' : 'before'} — it's calling your name. See you soon at Bean ☕`,
            deep_link: '/Home'
          };
      }
    };

    // 6. Clear previous un-sent drafts (regenerate = fresh batch)
    await base44.asServiceRole.entities.PersonalizedPush.deleteMany({
      status: { $in: ['draft', 'skipped'] }
    });

    // 7. Create new draft records
    const records = profiles.map(p => {
      const msg = buildMessage(p);
      return {
        customer_email: p.email,
        customer_name: p.displayName,
        segment: p.segment,
        favorite_item: p.favoriteItem || '',
        order_count: p.orderCount,
        total_spend: p.totalSpend,
        days_since_last: p.daysSinceLast,
        title: msg.title,
        body: msg.body,
        deep_link: msg.deep_link,
        status: 'draft',
        generated_at: new Date().toISOString()
      };
    });

    let created = [];
    if (records.length > 0) {
      created = await base44.asServiceRole.entities.PersonalizedPush.bulkCreate(records);
    }

    const bySegment = profiles.reduce((acc, p) => {
      acc[p.segment] = (acc[p.segment] || 0) + 1;
      return acc;
    }, {});

    return Response.json({
      success: true,
      generated: records.length,
      bySegment
    });
  } catch (error) {
    console.error('generatePersonalizedPush error:', error.message);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});