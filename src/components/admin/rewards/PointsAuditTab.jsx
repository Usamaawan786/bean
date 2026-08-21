import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { utcToPktDisplay } from "@/lib/pktTime";
import {
  AlertTriangle, ScanLine, Pencil, Zap, Search, ChevronDown, ChevronUp,
  ShieldAlert, Clock, TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PKT_OFFSET = 5 * 60 * 60 * 1000;

function pktDateKey(iso) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + PKT_OFFSET);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function pktHour(iso) {
  if (!iso) return -1;
  return new Date(new Date(iso).getTime() + PKT_OFFSET).getUTCHours();
}

const SOURCE_CFG = {
  "Bill Scan":     { icon: ScanLine, color: "bg-[#8B7355] text-white" },
  "Manual Adjust": { icon: Pencil,   color: "bg-amber-600 text-white" },
  "Flash Drop":    { icon: Zap,      color: "bg-purple-600 text-white" },
};

/**
 * Build a unified list of points-earning events from scans, manual
 * adjustments and flash-drop claims. Each event carries the source, the
 * PKT timestamp, the points added and a human detail of where they came from.
 */
function buildEvents(sales, adjustments, claims, flashDropPoints) {
  const events = [];
  (sales || []).forEach((s) => {
    if (!s.is_scanned || !(s.points_awarded > 0)) return;
    events.push({
      id: `sale-${s.id}`,
      customer_email: s.scanned_by || s.customer_email,
      source: "Bill Scan",
      points: s.points_awarded,
      timestamp: s.scanned_at || s.created_date,
      detail: `Bill ${s.bill_number || "—"} · Rs. ${(s.total_amount || 0).toLocaleString()}`,
      sub: s.cashier_name ? `Rung up by ${s.cashier_name}` : "",
    });
  });
  (adjustments || []).forEach((a) => {
    if (!(a.delta > 0)) return;
    events.push({
      id: `adj-${a.id}`,
      customer_email: a.customer_email,
      source: "Manual Adjust",
      points: a.delta,
      timestamp: a.adjusted_at || a.created_date,
      detail: a.reason || "Manual points addition",
      sub: `by ${a.adjusted_by_name || a.adjusted_by || "admin"}`,
    });
  });
  (claims || []).forEach((c) => {
    events.push({
      id: `fd-${c.id}`,
      customer_email: c.user_email,
      source: "Flash Drop",
      points: flashDropPoints || 0,
      timestamp: c.created_date,
      detail: c.drop_title || "Flash Drop claim",
      sub: c.qr_code ? `QR ${c.qr_code}` : "",
    });
  });
  return events.filter((e) => e.customer_email && e.timestamp);
}

/**
 * Detect suspicious earning patterns per customer.
 * Flags:
 *  - 7+ consecutive PKT days with earnings (daily points)
 *  - 6+ of the last 7 PKT days active
 *  - 5+ earning events on a single PKT day
 *  - any earning event between 1am–5am PKT (odd hours)
 */
function detectSuspicious(events) {
  const byCustomer = {};
  events.forEach((e) => {
    (byCustomer[e.customer_email] ||= []).push(e);
  });
  const flagged = {};
  Object.entries(byCustomer).forEach(([email, evs]) => {
    const sorted = [...evs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const dayKeys = sorted.map((e) => pktDateKey(e.timestamp));
    const distinctDays = [...new Set(dayKeys)];

    // longest streak of consecutive calendar days
    let streak = 1, maxStreak = 1;
    for (let i = 1; i < distinctDays.length; i++) {
      const prev = new Date(distinctDays[i - 1] + "T00:00:00Z");
      const cur = new Date(distinctDays[i] + "T00:00:00Z");
      const diffDays = Math.round((cur - prev) / 86400000);
      if (diffDays === 1) { streak += 1; maxStreak = Math.max(maxStreak, streak); }
      else streak = 1;
    }

    // last-7-days activity
    const todayKey = pktDateKey(new Date().toISOString());
    const today = new Date(todayKey + "T00:00:00Z");
    const last7 = new Set();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() - i * 86400000);
      last7.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
    }
    const activeLast7 = distinctDays.filter((d) => last7.has(d)).length;

    // events per day
    const perDay = {};
    dayKeys.forEach((k) => { perDay[k] = (perDay[k] || 0) + 1; });
    const maxPerDay = Math.max(...Object.values(perDay));

    // odd hours (1am–5am PKT)
    const oddHourEvents = sorted.filter((e) => {
      const h = pktHour(e.timestamp);
      return h >= 1 && h <= 4;
    });

    const reasons = [];
    if (maxStreak >= 7) reasons.push(`${maxStreak} consecutive days earning`);
    if (activeLast7 >= 6) reasons.push(`active ${activeLast7}/7 last days`);
    if (maxPerDay >= 5) reasons.push(`${maxPerDay} events in one day`);
    if (oddHourEvents.length > 0) reasons.push(`${oddHourEvents.length} odd-hour (1–5am) events`);

    if (reasons.length > 0) {
      flagged[email] = {
        reasons,
        maxStreak,
        activeLast7,
        maxPerDay,
        totalEvents: sorted.length,
        totalPoints: sorted.reduce((s, e) => s + e.points, 0),
        events: sorted,
      };
    }
  });
  return flagged;
}

export default function PointsAuditTab({ sales, settings }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const { data: adjustments = [] } = useQuery({
    queryKey: ["audit-adjustments"],
    queryFn: () => base44.entities.PointsAdjustment.list("-adjusted_at", 1000),
  });
  const { data: claims = [] } = useQuery({
    queryKey: ["audit-claims"],
    queryFn: () => base44.entities.FlashDropClaim.list("-created_date", 1000),
  });

  const flashDropPoints = settings?.flash_drop_points || 0;

  const events = useMemo(
    () => buildEvents(sales, adjustments, claims, flashDropPoints),
    [sales, adjustments, claims, flashDropPoints]
  );
  const flagged = useMemo(() => detectSuspicious(events), [events]);
  const flaggedList = Object.entries(flagged).sort((a, b) => b[1].totalPoints - a[1].totalPoints);

  const filteredEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((e) =>
      e.customer_email.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q) ||
      e.detail.toLowerCase().includes(q)
    );
  }, [events, search]);

  return (
    <div className="space-y-5">
      {/* Suspicious profiles banner */}
      <div className={`rounded-2xl border p-5 ${flaggedList.length > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
        <div className="flex items-center gap-2 mb-1">
          {flaggedList.length > 0
            ? <ShieldAlert className="h-5 w-5 text-red-600" />
            : <AlertTriangle className="h-5 w-5 text-emerald-600" />}
          <h3 className={`font-bold ${flaggedList.length > 0 ? "text-red-700" : "text-emerald-700"}`}>
            {flaggedList.length > 0
              ? `${flaggedList.length} suspicious profile${flaggedList.length > 1 ? "s" : ""} flagged`
              : "No suspicious earning patterns detected"}
          </h3>
        </div>
        <p className={`text-sm ${flaggedList.length > 0 ? "text-red-600" : "text-emerald-600"}`}>
          {flaggedList.length > 0
            ? "Profiles earning points daily, very frequently, or at odd hours — review to rule out points theft."
            : "No customer is currently hitting daily-streak, high-frequency, or odd-hour thresholds."}
        </p>
      </div>

      {/* Flagged profile cards */}
      {flaggedList.length > 0 && (
        <div className="space-y-3">
          {flaggedList.map(([email, info]) => {
            const open = expanded === email;
            return (
              <div key={email} className="bg-white rounded-2xl border-2 border-red-200 overflow-hidden">
                <button
                  onClick={() => setExpanded(open ? null : email)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-red-50/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold flex-shrink-0">
                    {email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#5C4A3A] text-sm truncate">{email}</span>
                      <Badge className="bg-red-600 text-white border-0 text-[10px]">SUSPICIOUS</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-red-600">
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{info.maxStreak} day streak</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{info.activeLast7}/7 active</span>
                      <span>· {info.totalEvents} events · {info.totalPoints.toLocaleString()} pts</span>
                    </div>
                    <div className="text-[11px] text-red-500 mt-0.5">{info.reasons.join(" · ")}</div>
                  </div>
                  {open ? <ChevronUp className="h-4 w-4 text-red-400" /> : <ChevronDown className="h-4 w-4 text-red-400" />}
                </button>
                {open && (
                  <div className="border-t border-red-100 bg-red-50/30 p-3 space-y-1.5 max-h-80 overflow-y-auto">
                    {info.events.map((e) => {
                      const cfg = SOURCE_CFG[e.source] || {};
                      const Icon = cfg.icon;
                      const odd = (() => { const h = pktHour(e.timestamp); return h >= 1 && h <= 4; })();
                      return (
                        <div key={e.id} className="flex items-start gap-2 bg-white rounded-xl p-2.5 border border-red-100">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[#5C4A3A]">{e.source}</span>
                              <span className="text-xs font-bold text-amber-600">+{e.points} pts</span>
                            </div>
                            <div className="text-xs text-[#8B7355] truncate">{e.detail}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-[#C9B8A6] flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />{utcToPktDisplay(e.timestamp)}
                              </span>
                              {odd && <Badge className="bg-red-100 text-red-700 border-0 text-[9px]">ODD HOUR</Badge>}
                              {e.sub && <span className="text-[10px] text-[#C9B8A6] truncate">· {e.sub}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full earning timeline */}
      <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden">
        <div className="p-4 border-b border-[#E8DED8]">
          <h3 className="font-bold text-[#5C4A3A] flex items-center gap-2 mb-3">
            <ScanLine className="h-5 w-5 text-[#8B7355]" /> Points Earning Timeline
            <Badge variant="outline" className="text-xs font-normal text-[#8B7355]">{filteredEvents.length} events</Badge>
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, source or detail..."
              className="w-full border border-[#E8DED8] rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5EBE8]">
              <tr>
                <th className="text-left px-4 py-3 text-[#8B7355] font-semibold">Customer</th>
                <th className="text-left px-4 py-3 text-[#8B7355] font-semibold">Source</th>
                <th className="text-left px-4 py-3 text-[#8B7355] font-semibold">Where / Detail</th>
                <th className="text-right px-4 py-3 text-[#8B7355] font-semibold">Points</th>
                <th className="text-left px-4 py-3 text-[#8B7355] font-semibold">Time (PKT)</th>
                <th className="text-center px-4 py-3 text-[#8B7355] font-semibold">Flag</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-[#8B7355]">No earning events found</td></tr>
              ) : filteredEvents.slice(0, 200).map((e) => {
                const cfg = SOURCE_CFG[e.source] || {};
                const Icon = cfg.icon;
                const isFlagged = !!flagged[e.customer_email];
                const odd = (() => { const h = pktHour(e.timestamp); return h >= 1 && h <= 4; })();
                return (
                  <tr key={e.id} className={`border-t border-[#F5EBE8] hover:bg-[#FDF9F7] transition-colors ${isFlagged ? "bg-red-50/40" : ""}`}>
                    <td className="px-4 py-3 text-[#5C4A3A] font-medium max-w-[160px] truncate">{e.customer_email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
                        <Icon className="h-3 w-3" />{e.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#8B7355] max-w-[220px]">
                      <div className="truncate">{e.detail}</div>
                      {e.sub && <div className="text-[11px] text-[#C9B8A6] truncate">· {e.sub}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">+{e.points}</td>
                    <td className="px-4 py-3 text-[#8B7355] whitespace-nowrap text-xs">{utcToPktDisplay(e.timestamp)}</td>
                    <td className="px-4 py-3 text-center">
                      {isFlagged
                        ? <Badge className="bg-red-600 text-white border-0 text-[10px]">SUSPICIOUS</Badge>
                        : odd
                          ? <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">ODD HR</Badge>
                          : <span className="text-[#C9B8A6]">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredEvents.length > 200 && (
          <div className="p-3 text-center text-xs text-[#C9B8A6] border-t border-[#E8DED8]">
            Showing 200 of {filteredEvents.length} events — refine your search to see more.
          </div>
        )}
      </div>
    </div>
  );
}