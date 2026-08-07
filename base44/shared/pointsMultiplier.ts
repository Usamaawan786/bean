// ── Points multiplier — shared by saveSale (POS) and any backend that needs
//    the live active multiplier. The frontend queries PointsCampaign directly
//    for display; this module is the authoritative source for stored points.
//
//    A campaign is "live" when:
//      - is_active === true
//      - now >= start_at (if start_at set)
//      - now <= end_at   (if end_at set)
//    The highest live multiplier wins. 1 (no boost) when nothing is live.

export async function getActiveMultiplier(base44, atDate) {
  const now = atDate ? new Date(atDate) : new Date();
  let campaigns = [];
  try {
    campaigns = await base44.asServiceRole.entities.PointsCampaign.filter({ is_active: true });
  } catch (e) {
    console.log("PointsCampaign fetch failed, multiplier=1:", e?.message);
    return 1;
  }
  let maxMult = 1;
  for (const c of campaigns) {
    if (!c.multiplier || c.multiplier <= 1) continue;
    const start = c.start_at ? new Date(c.start_at) : null;
    const end = c.end_at ? new Date(c.end_at) : null;
    if (start && now < start) continue;
    if (end && now > end) continue;
    if (c.multiplier > maxMult) maxMult = c.multiplier;
  }
  return maxMult;
}