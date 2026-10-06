import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Personalized Push Engine — Starbucks Deep Brew + Luckin Coffee tactics.
 *
 * Per-customer profile from scanned bills → picks the highest-value
 * personalization tactic → writes a draft push with urgency + offer hook.
 *
 * Tactics (in priority order):
 *   1. streak_saver     — active 3+ day visit streak → "keep your streak alive" (Starbucks milestone)
 *   2. winback_coupon   — lapsed >14 days → time-limited discount (Luckin win-back)
 *   3. tier_vip         — Gold/Platinum or high spend → double points (Starbucks Gold)
 *   4. milestone_reward — round-number visit count (5/10/20/25/50/75/100) → free upgrade
 *   5. bundle_upsell    — regular with repeat item → pairing suggestion (Starbucks pairing)
 *   6. new_welcome      — new customer → first-order discount (Luckin acquisition)
 *   7. order_again      — fallback → "your usual?" reminder
 *
 * Also computes the customer's best send daypart (morning/afternoon/evening)
 * from their most common scan hour (PKT), surfaced as a send-time hint.
 *
 * Admin-only. Rule-based (no LLM cost).
 * NOTE: this runtime's SDK uses positional args — filter(query, sort, limit)
 * and list(sort, limit) — and returns plain arrays.
 */

const PKT = "Asia/Karachi";

const pktHour = (iso) => {
  if (!iso) return -1;
  try {
    return Number(new Intl.DateTimeFormat("en-GB", { timeZone: PKT, hour: "2-digit", hour12: false }).format(new Date(iso)));
  } catch { return new Date(iso).getUTCHour(); }
};

const pktDateKey = (iso) => {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: PKT, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  } catch { return iso.slice(0, 10); }
};

const pktTodayKey = () => pktDateKey(new Date().toISOString());

const daypartFromHour = (h) => {
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 16) return "afternoon";
  if (h >= 16 && h < 23) return "evening";
  return "any";
};

// Consecutive-day streak ending today or yesterday = active
const computeStreak = (dateKeys) => {
  const sorted = [...new Set(dateKeys.filter(Boolean))].sort();
  if (sorted.length === 0) return { days: 0, active: false };
  const today = pktTodayKey();
  const yesterday = pktDateKey(new Date(Date.now() - 86400000).toISOString());
  const last = sorted[sorted.length - 1];
  if (last !== today && last !== yesterday) return { days: 0, active: false };
  let days = 1;
  let cursor = new Date(last + "T00:00:00Z").getTime();
  for (let i = sorted.length - 2; i >= 0; i--) {
    const prev = new Date(sorted[i] + "T00:00:00Z").getTime();
    if (cursor - prev === 86400000) { days++; cursor = prev; }
    else break;
  }
  return { days, active: true };
};

const MILESTONES = new Set([5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200]);

const pickTactic = (p) => {
  if (p.streakActive && p.streakDays >= 3) return "streak_saver";
  if (p.segment === "lapsed") return "winback_coupon";
  if (p.segment === "high_value" || p.tier === "Gold" || p.tier === "Platinum") return "tier_vip";
  if (MILESTONES.has(p.orderCount)) return "milestone_reward";
  if (p.segment === "regular" && p.repeatItem) return "bundle_upsell";
  if (p.segment === "new") return "new_welcome";
  return "order_again";
};

const buildMessage = (tactic, p) => {
  const item = p.favoriteItem || "your favorite brew";
  const firstName = p.firstName;
  switch (tactic) {
    case "streak_saver":
      return {
        title: `Your ${p.streakDays}-day streak, ${firstName}! 🔥`,
        body: `You've visited Bean ${p.streakDays} days in a row. Come in today to keep your streak alive — bonus 50 points on your next scan.`,
        offer_hook: "Bonus 50 points on your next scan",
        urgency: "Today only",
        deep_link: "/Home"
      };
    case "winback_coupon":
      return {
        title: `We miss you, ${firstName} — here's 20% off`,
        body: `It's been ${p.daysSinceLast} days since your last ${item}. Come back this week and enjoy 20% off your order — show this push at the counter.`,
        offer_hook: "20% off your next order",
        urgency: "Valid 7 days",
        deep_link: "/Rewards"
      };
    case "tier_vip":
      return {
        title: `You're Bean ${p.tier}, ${firstName} ✨`,
        body: `As one of our top customers, enjoy double points on your next ${item}. Because loyalty deserves more loyalty.`,
        offer_hook: "Double points on next order",
        urgency: "This week only",
        deep_link: "/Rewards"
      };
    case "milestone_reward":
      return {
        title: `${p.orderCount} visits, ${firstName}! 🎉`,
        body: `You've scanned ${p.orderCount} bills at Bean. To celebrate, here's a free size upgrade on your next ${item}.`,
        offer_hook: "Free size upgrade",
        urgency: "Claim within 7 days",
        deep_link: "/Rewards"
      };
    case "bundle_upsell":
      return {
        title: `Time for your usual, ${firstName}?`,
        body: `Your ${item} is calling. Pair it with a fresh croissant for just Rs 250 more — the perfect coffee companion.`,
        offer_hook: "Croissant add-on Rs 250",
        urgency: "Today only",
        deep_link: "/Home"
      };
    case "new_welcome":
      return {
        title: `Welcome to the Bean family, ${firstName}! ☕`,
        body: `Loved by our regulars — try our ${item} on your next visit and get 15% off as a welcome gift. Start earning points today.`,
        offer_hook: "15% off first order",
        urgency: "First visit only",
        deep_link: "/Home"
      };
    default: // order_again
      return {
        title: `Your usual ${item}, ${firstName}?`,
        body: `You've ordered ${item} ${p.repeatItem ? "a few times now" : "before"} — it's waiting for you at Bean. See you soon.`,
        offer_hook: "",
        urgency: "",
        deep_link: "/Home"
      };
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return Response.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }

    // 1. Load scanned bills
    const scannedRaw = await base44.asServiceRole.entities.StoreSale.filter(
      { is_scanned: true },
      "-scanned_at",
      5000
    );
    const scannedSales = (scannedRaw || []).filter(s => s && s.scanned_by);

    // 1b. Cross-reference: load ALL points_earned Activity logs as a secondary
    //     source of truth for last engagement. Activity.created_date is the
    //     moment the scan happened, independent of StoreSale.scanned_at. This
    //     catches any scan the StoreSale record might have missed or recorded
    //     with a stale timestamp.
    let activityLastMap = {};
    try {
      const acts = await base44.asServiceRole.entities.Activity.filter(
        { action_type: "points_earned" },
        "-created_date",
        5000
      );
      for (const a of (acts || [])) {
        if (!a.user_email) continue;
        const t = a.created_date ? new Date(a.created_date).getTime() : 0;
        if (t > (activityLastMap[a.user_email] || 0)) activityLastMap[a.user_email] = t;
      }
    } catch (e) {
      console.log("Activity cross-reference unavailable:", e.message);
    }

    // 2. Build per-customer order profiles.
    //    VISIT date = sale.created_date (the actual purchase time), NOT scanned_at
    //    (scanned_at can lag the purchase by hours or days on older bills whose
    //    QR didn't expire). This gives the true "days since last visit".
    const profilesMap = {};
    for (const sale of scannedSales) {
      const email = sale.scanned_by;
      if (!profilesMap[email]) {
        profilesMap[email] = { email, itemCount: {}, orderCount: 0, totalSpend: 0, lastVisit: 0, visitHours: [], visitDates: [] };
      }
      const p = profilesMap[email];
      p.orderCount++;
      p.totalSpend += sale.total_amount || 0;
      // Use created_date (purchase time) as the visit timestamp; fall back to scanned_at
      const visitIso = sale.created_date || sale.scanned_at;
      const visitTs = visitIso ? new Date(visitIso).getTime() : 0;
      if (visitTs > p.lastVisit) p.lastVisit = visitTs;
      const h = pktHour(visitIso);
      if (h >= 0) p.visitHours.push(h);
      const dk = pktDateKey(visitIso);
      if (dk) p.visitDates.push(dk);
      for (const it of (sale.items || [])) {
        if (!it.product_name) continue;
        p.itemCount[it.product_name] = (p.itemCount[it.product_name] || 0) + (it.quantity || 1);
      }
    }

    // 3. Load customers for display names + tier
    const customers = await base44.asServiceRole.entities.Customer.list("-created_date", 10000);
    const customerMap = {};
    for (const c of (customers || [])) {
      if (c.user_email) customerMap[c.user_email.toLowerCase()] = c;
    }

    // 4. Finalize profiles.
    //    lastEngagement = max(sale visit date, Activity points_earned date)
    //    Cross-referencing two independent sources catches any single-source
    //    data loss and gives the most accurate "days since last visit".
    const now = Date.now();
    const profiles = [];
    for (const email of Object.keys(profilesMap)) {
      const p = profilesMap[email];
      let favItem = null, favCount = 0;
      for (const name of Object.keys(p.itemCount)) {
        if (p.itemCount[name] > favCount) { favCount = p.itemCount[name]; favItem = name; }
      }
      const repeatItem = favCount >= 2 ? favItem : null;

      // Cross-reference: take the MOST RECENT of (last visit, last activity log)
      const activityLast = activityLastMap[email] || 0;
      const lastEngagement = Math.max(p.lastVisit || 0, activityLast);
      const daysSince = lastEngagement ? Math.floor((now - lastEngagement) / 86400000) : null;

      let segment;
      if (p.orderCount < 2) segment = "new";
      else if (daysSince !== null && daysSince > 14) segment = "lapsed";
      else if (p.totalSpend >= 5000) segment = "high_value";
      else segment = "regular";

      // Daypart: most common visit hour bucket (from purchase time, not scan time)
      let bestWindow = "any";
      if (p.visitHours.length > 0) {
        const buckets = { morning: 0, afternoon: 0, evening: 0 };
        for (const h of p.visitHours) buckets[daypartFromHour(h)]++;
        bestWindow = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0][0];
      }

      // Streak (from visit dates)
      const streak = computeStreak(p.visitDates);

      const cust = customerMap[email.toLowerCase()];
      const displayName = cust?.display_name || email;
      const firstName = (displayName.split(" ")[0] || displayName).trim();
      const tier = cust?.tier || "Bronze";

      profiles.push({
        email, displayName, firstName,
        favoriteItem: favItem, repeatItem,
        orderCount: p.orderCount,
        totalSpend: Math.round(p.totalSpend),
        daysSinceLast: daysSince, segment,
        bestWindow, streakDays: streak.days, streakActive: streak.active,
        tier,
        // diagnostic: which source won (for audit)
        lastVisitSource: activityLast > (p.lastVisit || 0) ? "activity" : "sale"
      });
    }

    // 5. Pick tactic + build message per profile
    for (const p of profiles) {
      p.tactic = pickTactic(p);
      p.message = buildMessage(p.tactic, p);
    }

    // 6. Clear previous un-sent drafts
    const stale = await base44.asServiceRole.entities.PersonalizedPush.list("-created_date", 5000);
    const toDelete = (stale || []).filter(r => r.status === "draft" || r.status === "skipped");
    for (let i = 0; i < toDelete.length; i += 25) {
      await Promise.all(
        toDelete.slice(i, i + 25).map(r => base44.asServiceRole.entities.PersonalizedPush.delete(r.id))
      );
    }
    const approvedEmails = new Set(
      (stale || []).filter(r => r.status === "approved").map(r => r.customer_email)
    );

    // 7. Create draft records
    const generatedAt = new Date().toISOString();
    const records = profiles
      .filter(p => !approvedEmails.has(p.email))
      .map(p => ({
        customer_email: p.email,
        customer_name: p.displayName,
        segment: p.segment,
        tactic: p.tactic,
        best_send_window: p.bestWindow,
        offer_hook: p.message.offer_hook || "",
        urgency: p.message.urgency || "",
        streak_days: p.streakActive ? p.streakDays : null,
        tier: p.tier,
        favorite_item: p.favoriteItem || "",
        order_count: p.orderCount,
        total_spend: p.totalSpend,
        days_since_last: p.daysSinceLast,
        title: p.message.title,
        body: p.message.body,
        deep_link: p.message.deep_link,
        status: "draft",
        generated_at: generatedAt
      }));

    for (let i = 0; i < records.length; i += 100) {
      await base44.asServiceRole.entities.PersonalizedPush.bulkCreate(records.slice(i, i + 100));
    }

    const byTactic = records.reduce((acc, r) => {
      acc[r.tactic] = (acc[r.tactic] || 0) + 1;
      return acc;
    }, {});
    const bySegment = records.reduce((acc, r) => {
      acc[r.segment] = (acc[r.segment] || 0) + 1;
      return acc;
    }, {});

    return Response.json({
      success: true,
      generated: records.length,
      scannedBills: scannedSales.length,
      byTactic,
      bySegment
    });
  } catch (error) {
    console.error("generatePersonalizedPush error:", error.message);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});