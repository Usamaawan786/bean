import { Clock, AlertTriangle, Timer, MoonStar, Star, ScanLine, UserX } from "lucide-react";
import { utcToPktDisplay } from "@/lib/pktTime";

// Thresholds for classifying the gap between sale time and scan time.
// Genuine customers scan right away; a thief (e.g. cashier hoarding bills) waits hours/days.
export const SCAN_DELAY_THRESHOLDS = {
  normal: 2 * 3600 * 1000,            // <= 2h
  suspicious: 24 * 3600 * 1000,       // <= 24h
  critical: 7 * 24 * 3600 * 1000,     // <= 7d
};

export function scanDelay(s) {
  if (!s.is_scanned || !s.scanned_at || !s.created_date) return null;
  return new Date(s.scanned_at) - new Date(s.created_date);
}

export function delaySeverity(delayMs) {
  if (delayMs == null || delayMs < 0) return null;
  if (delayMs <= SCAN_DELAY_THRESHOLDS.normal) return "normal";
  if (delayMs <= SCAN_DELAY_THRESHOLDS.suspicious) return "suspicious";
  if (delayMs <= SCAN_DELAY_THRESHOLDS.critical) return "high";
  return "critical";
}

export function formatDelay(delayMs) {
  if (delayMs == null) return "—";
  const abs = Math.abs(delayMs);
  const mins = Math.floor(abs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ${hrs % 24}h`;
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

// PKT = UTC+5. Returns the PKT hour (0-23) of an ISO timestamp.
export function pktHour(iso) {
  if (!iso) return null;
  return (new Date(iso).getUTCHours() + 5) % 24;
}

// After-hours = scanned between 22:00 and 06:00 PKT (near closing / overnight).
export function isAfterHours(iso) {
  const h = pktHour(iso);
  return h != null && (h >= 22 || h < 6);
}

const SEV_BADGE = {
  normal: "bg-green-100 text-green-700",
  suspicious: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};
const SEV_LABEL = { normal: "Normal", suspicious: "Delayed", high: "High", critical: "Critical" };

export default function ScanTimingPanel({ sales }) {
  const scanned = sales.filter((s) => s.is_scanned && s.scanned_at);
  const withDelay = scanned
    .map((s) => ({ s, delay: scanDelay(s) }))
    .filter((x) => x.delay != null);
  const delayed = withDelay.filter((x) => {
    const sev = delaySeverity(x.delay);
    return sev && sev !== "normal";
  });
  const highCount = withDelay.filter((x) => ["high", "critical"].includes(delaySeverity(x.delay))).length;
  const criticalCount = withDelay.filter((x) => delaySeverity(x.delay) === "critical").length;
  const afterHours = scanned.filter((s) => isAfterHours(s.scanned_at));

  // Per-user aggregation of delayed scans
  const byUser = {};
  delayed.forEach(({ s, delay }) => {
    const email = s.scanned_by || "unknown";
    (byUser[email] ||= { count: 0, totalDelay: 0, maxDelay: 0, points: 0, latest: null, selfScan: 0, afterHours: 0 });
    const u = byUser[email];
    u.count++;
    u.totalDelay += delay;
    if (delay > u.maxDelay) u.maxDelay = delay;
    u.points += s.points_awarded || 0;
    if (!u.latest || new Date(s.scanned_at) > new Date(u.latest)) u.latest = s.scanned_at;
    if (s.scanned_by && s.cashier_email && s.scanned_by === s.cashier_email) u.selfScan++;
    if (isAfterHours(s.scanned_at)) u.afterHours++;
  });
  const userRows = Object.entries(byUser)
    .map(([email, u]) => ({ email, ...u, avg: u.totalDelay / u.count }))
    .sort((a, b) => b.maxDelay - a.maxDelay);

  const stats = [
    { label: "Total Scanned", value: scanned.length, icon: ScanLine, color: "text-[#8B7355] bg-[#F5EBE8]" },
    { label: "Delayed (>2h)", value: delayed.length, icon: Timer, color: "text-amber-600 bg-amber-50" },
    { label: "High (>24h)", value: highCount, icon: AlertTriangle, color: "text-orange-600 bg-orange-50" },
    { label: "Critical (>7d)", value: criticalCount, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    { label: "After-Hours", value: afterHours.length, icon: MoonStar, color: "text-indigo-600 bg-indigo-50" },
  ];

  if (!scanned.length) {
    return (
      <div className="text-center py-12 text-[#8B7355]">
        <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No scanned bills in this range</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((st) => {
          const Icon = st.icon;
          return (
            <div key={st.label} className="bg-white rounded-2xl border border-[#E8DED8] p-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${st.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-[#5C4A3A]">{st.value}</div>
              <div className="text-xs text-[#8B7355]">{st.label}</div>
            </div>
          );
        })}
      </div>

      {/* Per-user delayed scan ranking */}
      <div>
        <h3 className="font-semibold text-[#5C4A3A] text-sm mb-2 flex items-center gap-1.5">
          <UserX className="h-4 w-4 text-red-500" /> Users with Delayed Scans ({userRows.length})
        </h3>
        <p className="text-xs text-[#8B7355] mb-3">
          Genuine customers scan within minutes. Repeated or very late scans (hours/days later, near closing, or after-hours) can indicate a cashier hoarding customer bills to claim points.
        </p>
        {userRows.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 text-center">
            No delayed scans — all bills were scanned within 3 hours of purchase.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5EBE8]">
                <tr>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">User</th>
                  <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Delayed Scans</th>
                  <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Avg Delay</th>
                  <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Max Delay</th>
                  <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Points</th>
                  <th className="text-center px-3 py-3 text-[#8B7355] font-semibold">Self-Scan</th>
                  <th className="text-center px-3 py-3 text-[#8B7355] font-semibold">After-Hrs</th>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Latest Scan (PKT)</th>
                </tr>
              </thead>
              <tbody>
                {userRows.map((u) => (
                  <tr key={u.email} className="border-t border-[#F5EBE8] hover:bg-[#FDF9F7]">
                    <td className="px-3 py-2.5 text-[#5C4A3A] truncate max-w-[180px] font-medium">{u.email}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-red-600">{u.count}</td>
                    <td className="px-3 py-2.5 text-right text-[#8B7355]">{formatDelay(u.avg)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-orange-600">{formatDelay(u.maxDelay)}</td>
                    <td className="px-3 py-2.5 text-right text-[#5C4A3A]">{u.points}</td>
                    <td className="px-3 py-2.5 text-center">{u.selfScan > 0 ? <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{u.selfScan}</span> : "—"}</td>
                    <td className="px-3 py-2.5 text-center">{u.afterHours > 0 ? <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{u.afterHours}</span> : "—"}</td>
                    <td className="px-3 py-2.5 text-[#8B7355] whitespace-nowrap">{utcToPktDisplay(u.latest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Individual delayed scans */}
      <div>
        <h3 className="font-semibold text-[#5C4A3A] text-sm mb-2 flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-amber-500" /> Flagged Delayed Scans ({delayed.length})
        </h3>
        {delayed.length === 0 ? (
          <div className="bg-gray-50 border border-[#E8DED8] rounded-xl p-4 text-sm text-[#8B7355] text-center">
            No individually delayed scans to review.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5EBE8]">
                <tr>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Bill #</th>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Scanned By</th>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Cashier</th>
                  <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Points</th>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Sale Time (PKT)</th>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Scan Time (PKT)</th>
                  <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Delay</th>
                  <th className="text-center px-3 py-3 text-[#8B7355] font-semibold">Severity</th>
                </tr>
              </thead>
              <tbody>
                {delayed
                  .sort((a, b) => b.delay - a.delay)
                  .map(({ s, delay }) => {
                    const sev = delaySeverity(delay);
                    const selfScan = s.scanned_by && s.cashier_email && s.scanned_by === s.cashier_email;
                    return (
                      <tr key={s.id} className={`border-t border-[#F5EBE8] hover:bg-[#FDF9F7] ${sev === "critical" ? "bg-red-50/40" : sev === "high" ? "bg-orange-50/40" : ""}`}>
                        <td className="px-3 py-2.5 font-mono font-bold text-[#5C4A3A] whitespace-nowrap">{s.bill_number || "—"}</td>
                        <td className="px-3 py-2.5 text-[#5C4A3A]">
                          <span className="flex items-center gap-1">
                            <span className="truncate max-w-[160px]">{s.scanned_by}</span>
                            {selfScan && <UserX className="h-3.5 w-3.5 text-red-500" />}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[#8B7355] truncate max-w-[140px]">{s.cashier_name || s.cashier_email || "—"}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="flex items-center justify-end gap-1 font-bold text-[#5C4A3A]">
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />{s.points_awarded || 0}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[#8B7355] whitespace-nowrap">{utcToPktDisplay(s.created_date)}</td>
                        <td className="px-3 py-2.5 text-[#8B7355] whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            {utcToPktDisplay(s.scanned_at)}
                            {isAfterHours(s.scanned_at) && <MoonStar className="h-3 w-3 text-indigo-500" />}
                          </span>
                        </td>
                        <td className={`px-3 py-2.5 text-right font-bold ${sev === "critical" ? "text-red-600" : sev === "high" ? "text-orange-600" : "text-amber-600"}`}>{formatDelay(delay)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEV_BADGE[sev]}`}>{SEV_LABEL[sev]}</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}