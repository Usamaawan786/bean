// ── Pakistan Standard Time (PKT = UTC+5) helpers ─────────────────────
// Mirrors the conversion used in AdminPushNotifications so campaign
// schedules stay consistent with the push-notification scheduler.

// datetime-local "YYYY-MM-DDTHH:MM" treated as PKT → UTC ISO string
export function pktInputToUtc(pktDatetimeLocal) {
  if (!pktDatetimeLocal) return null;
  const [datePart, timePart] = pktDatetimeLocal.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours - 5, minutes, 0, 0));
  return utcDate.toISOString();
}

// UTC ISO string → "YYYY-MM-DDTHH:MM" (PKT) for datetime-local inputs
export function utcToPktInput(utcIso) {
  if (!utcIso) return "";
  const utc = new Date(utcIso);
  const pkt = new Date(utc.getTime() + 5 * 60 * 60 * 1000);
  return pkt.toISOString().slice(0, 16);
}

// UTC ISO string → "DD MMM yyyy HH:mm PKT" for display
export function utcToPktDisplay(utcIso) {
  if (!utcIso) return "—";
  const utc = new Date(utcIso);
  const pkt = new Date(utc.getTime() + 5 * 60 * 60 * 1000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dd = String(pkt.getUTCDate()).padStart(2, "0");
  const mm = months[pkt.getUTCMonth()];
  const yyyy = pkt.getUTCFullYear();
  const hh = String(pkt.getUTCHours()).padStart(2, "0");
  const min = String(pkt.getUTCMinutes()).padStart(2, "0");
  return `${dd} ${mm} ${yyyy} ${hh}:${min} PKT`;
}

// Current PKT time as a datetime-local value
export function nowAsPktInput() {
  const utc = new Date();
  const pkt = new Date(utc.getTime() + 5 * 60 * 60 * 1000);
  return pkt.toISOString().slice(0, 16);
}

// Compute the live multiplier from a list of campaigns at a given time.
// Mirrors the backend base44/shared/pointsMultiplier.ts logic.
export function computeActiveMultiplier(campaigns, atDate = new Date()) {
  if (!Array.isArray(campaigns)) return 1;
  const now = atDate instanceof Date ? atDate : new Date(atDate);
  let maxMult = 1;
  for (const c of campaigns) {
    if (!c.is_active) continue;
    if (!c.multiplier || c.multiplier <= 1) continue;
    const start = c.start_at ? new Date(c.start_at) : null;
    const end = c.end_at ? new Date(c.end_at) : null;
    if (start && now < start) continue;
    if (end && now > end) continue;
    if (c.multiplier > maxMult) maxMult = c.multiplier;
  }
  return maxMult;
}

// Status badge for a campaign based on time + is_active
export function campaignStatus(c, now = new Date()) {
  if (!c.is_active) return "paused";
  const start = c.start_at ? new Date(c.start_at) : null;
  const end = c.end_at ? new Date(c.end_at) : null;
  if (start && now < start) return "scheduled";
  if (end && now > end) return "ended";
  return "active";
}