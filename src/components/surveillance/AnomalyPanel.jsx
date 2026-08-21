import { AlertTriangle, UserX, Scale, Zap, Repeat, Timer, MoonStar, CalendarClock } from "lucide-react";
import { utcToPktDisplay } from "@/lib/pktTime";
import { SCAN_DELAY_THRESHOLDS, delaySeverity, formatDelay, isAfterHours } from "./ScanTimingPanel";

// PKT day key from an ISO timestamp (naive datetime safe — treated as UTC)
const PKT_OFFSET = 5 * 60 * 60 * 1000;
function pktDayKey(iso) {
  if (!iso) return "";
  let str = String(iso);
  if (!/Z$|[+-]\d\d:?\d\d$/.test(str)) str += "Z";
  const d = new Date(new Date(str).getTime() + PKT_OFFSET);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Detects suspicious rewards activity for theft prevention.
export function detectAnomalies({ sales, redemptions, customers, pkrPerPoint }) {
  const flags = [];

  // 1. Cashier scanned their own sale to earn points
  sales.forEach((s) => {
    if (s.scanned_by && s.cashier_email && s.scanned_by === s.cashier_email) {
      flags.push({
        severity: "high",
        icon: UserX,
        title: "Cashier self-scan",
        detail: `${s.cashier_email} scanned bill ${s.bill_number} (their own sale) for ${s.points_awarded} pts`,
        time: s.scanned_at || s.created_date,
      });
    }
  });

  // 1b. Delayed scans — customer scanned bill long after purchase (theft signal)
  sales.forEach((s) => {
    if (!s.is_scanned || !s.scanned_at) return;
    const delay = new Date(s.scanned_at) - new Date(s.created_date);
    if (delay < 0) return;
    const sev = delaySeverity(delay);
    if (sev === "high" || sev === "critical") {
      flags.push({
        severity: sev === "critical" ? "high" : "medium",
        icon: Timer,
        title: sev === "critical" ? "Critical delayed scan" : "Delayed scan",
        detail: `${s.scanned_by} scanned bill ${s.bill_number} ${formatDelay(delay)} after sale (PKT ${utcToPktDisplay(s.scanned_at)}) — ${s.points_awarded} pts`,
        time: s.scanned_at,
      });
    }
  });

  // 1c. After-hours scans (22:00–06:00 PKT, near closing/overnight)
  sales.forEach((s) => {
    if (!s.is_scanned || !s.scanned_at) return;
    if (isAfterHours(s.scanned_at)) {
      flags.push({
        severity: "medium",
        icon: MoonStar,
        title: "After-hours scan",
        detail: `${s.scanned_by} scanned bill ${s.bill_number} at ${utcToPktDisplay(s.scanned_at)} (PKT night) — ${s.points_awarded} pts`,
        time: s.scanned_at,
      });
    }
  });

  // 1d. Repeated delayed scans by same user (3+ delayed >2h)
  const delayedByUser = {};
  sales.forEach((s) => {
    if (!s.is_scanned || !s.scanned_at) return;
    const delay = new Date(s.scanned_at) - new Date(s.created_date);
    if (delay > SCAN_DELAY_THRESHOLDS.normal) {
      const e = s.scanned_by || "unknown";
      (delayedByUser[e] ||= []).push(s);
    }
  });
  Object.entries(delayedByUser).forEach(([email, list]) => {
    if (list.length >= 3) {
      flags.push({
        severity: "high",
        icon: Repeat,
        title: "Repeated delayed scans",
        detail: `${email} has ${list.length} delayed scans (>2h after sale) — pattern suggests hoarding/late scanning`,
        time: list[list.length - 1].scanned_at,
      });
    }
  });

  // 1e. Repeated daily points earning — same profile earning points every day
  // (daily streak >= 5, or 6+/7 active days, or 5+ scans in one day)
  const earningByUser = {};
  sales.forEach((s) => {
    if (!s.is_scanned || !(s.points_awarded > 0) || !s.scanned_by) return;
    (earningByUser[s.scanned_by] ||= []).push(s);
  });
  Object.entries(earningByUser).forEach(([email, list]) => {
    const days = list.map((s) => pktDayKey(s.scanned_at || s.created_date)).filter(Boolean);
    const distinct = [...new Set(days)].sort();
    if (distinct.length < 3) return;

    // longest streak of consecutive calendar days
    let streak = 1, maxStreak = 1;
    for (let i = 1; i < distinct.length; i++) {
      const diff = Math.round((new Date(distinct[i] + "T00:00:00Z") - new Date(distinct[i - 1] + "T00:00:00Z")) / 86400000);
      if (diff === 1) { streak += 1; maxStreak = Math.max(maxStreak, streak); } else streak = 1;
    }

    // last-7-days activity
    const todayKey = pktDayKey(new Date().toISOString());
    const today = new Date(todayKey + "T00:00:00Z");
    const last7 = new Set();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() - i * 86400000);
      last7.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
    }
    const activeLast7 = distinct.filter((d) => last7.has(d)).length;

    // scans in a single day
    const perDay = {};
    days.forEach((d) => { perDay[d] = (perDay[d] || 0) + 1; });
    const maxPerDay = Math.max(...Object.values(perDay));

    const totalPoints = list.reduce((s, e) => s + (e.points_awarded || 0), 0);
    if (maxStreak >= 7 || activeLast7 >= 6 || maxPerDay >= 5) {
      flags.push({
        severity: maxStreak >= 7 || maxPerDay >= 5 ? "high" : "medium",
        icon: CalendarClock,
        title: "Repeated daily points earning",
        detail: `${email}: ${maxStreak}-day streak, active ${activeLast7}/7 last days, ${maxPerDay} scans on busiest day — ${list.length} scans / ${totalPoints} pts total`,
        time: list[list.length - 1].scanned_at,
      });
    }
  });

  // 2. Points awarded don't match expected from amount
  sales.forEach((s) => {
    if (!pkrPerPoint || !s.points_awarded) return;
    const expected = Math.floor((s.total_amount || 0) / pkrPerPoint) * (s.points_multiplier || 1);
    if (Math.abs(s.points_awarded - expected) > 1) {
      flags.push({
        severity: "medium",
        icon: Scale,
        title: "Points mismatch",
        detail: `Bill ${s.bill_number}: awarded ${s.points_awarded} pts, expected ~${expected} (PKR ${(s.total_amount || 0).toLocaleString()} @ ${pkrPerPoint}/pt, ${s.points_multiplier || 1}x)`,
        time: s.created_date,
      });
    }
  });

  // 3. Balance exceeds lifetime earned minus redeemed
  const redeemedByEmail = {};
  redemptions.forEach((r) => {
    redeemedByEmail[r.customer_email] = (redeemedByEmail[r.customer_email] || 0) + (r.points_spent || 0);
  });
  customers.forEach((c) => {
    const earned = c.total_points_earned || 0;
    const balance = c.points_balance || 0;
    const redeemed = redeemedByEmail[c.user_email || c.created_by] || 0;
    if (balance > earned - redeemed + 2) {
      flags.push({
        severity: "high",
        icon: AlertTriangle,
        title: "Balance inflation",
        detail: `${c.user_email || c.created_by}: balance ${balance} > earned ${earned} − redeemed ${redeemed}`,
        time: c.updated_date || c.created_date,
      });
    }
  });

  // 4. Rapid redemptions: >3 by same customer in 24h
  const byEmail = {};
  redemptions.forEach((r) => {
    if (!r.customer_email) return;
    (byEmail[r.customer_email] ||= []).push(r);
  });
  Object.entries(byEmail).forEach(([email, list]) => {
    const sorted = list.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    for (let i = 2; i < sorted.length; i++) {
      if (new Date(sorted[i].created_date) - new Date(sorted[i - 2].created_date) < 24 * 3600 * 1000) {
        flags.push({
          severity: "medium",
          icon: Repeat,
          title: "Rapid redemptions",
          detail: `${email} redeemed 3+ times within 24h`,
          time: sorted[i].created_date,
        });
        break;
      }
    }
  });

  return flags.sort((a, b) => new Date(b.time) - new Date(a.time));
}

export default function AnomalyPanel({ sales, redemptions, customers, pkrPerPoint }) {
  const flags = detectAnomalies({ sales, redemptions, customers, pkrPerPoint });
  const high = flags.filter((f) => f.severity === "high");

  if (!flags.length) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-green-500" />
        <p className="font-semibold text-green-700">No anomalies detected</p>
        <p className="text-sm text-green-600 mt-1">All rewards activity looks consistent.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {high.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4" /> {high.length} high-severity flag{high.length > 1 ? "s" : ""} need review
        </div>
      )}
      <div className="space-y-2">
        {flags.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className={`bg-white rounded-xl border p-3 flex items-start gap-3 ${f.severity === "high" ? "border-red-200" : "border-amber-200"}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${f.severity === "high" ? "bg-red-100" : "bg-amber-100"}`}>
                <Icon className={`h-4 w-4 ${f.severity === "high" ? "text-red-600" : "text-amber-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#5C4A3A] text-sm">{f.title}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${f.severity === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {f.severity}
                  </span>
                </div>
                <p className="text-xs text-[#8B7355] mt-0.5">{f.detail}</p>
                <p className="text-[10px] text-[#C9B8A6] mt-1">{utcToPktDisplay(f.time)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}