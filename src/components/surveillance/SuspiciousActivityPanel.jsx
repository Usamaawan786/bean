import { useMemo } from "react";
import { AlertTriangle, ShieldAlert, UserX, Clock, MoonStar, RotateCcw, Pencil, Star, TrendingDown } from "lucide-react";
import { utcToPktDisplay } from "@/lib/pktTime";
import { scanDelay, delaySeverity, isAfterHours } from "@/components/surveillance/ScanTimingPanel";

// Consolidated suspicious-activity dashboard.
// Pulls flagged items from sales (self-scans, delayed scans, after-hours,
// re-allocations) and manual points adjustments into a single ranked list
// with a severity score so admins see every red flag in one place.
export default function SuspiciousActivityPanel({ sales, adjustments, anomalies }) {
  const flags = useMemo(() => {
    const items = [];

    // 1. Self-scans (cashier scanning their own bill)
    sales.filter((s) => s.is_scanned && s.scanned_by && s.cashier_email && s.scanned_by === s.cashier_email).forEach((s) => {
      items.push({
        type: "Self-Scan",
        severity: "critical",
        score: 100,
        icon: UserX,
        title: `Cashier scanned own bill ${s.bill_number}`,
        detail: `${s.cashier_name || s.cashier_email} scanned their own sale for ${s.points_awarded || 0} pts`,
        when: s.scanned_at,
        entity: s,
      });
    });

    // 2. Delayed scans (classified by ScanTimingPanel thresholds)
    sales.filter((s) => s.is_scanned && s.scanned_at).forEach((s) => {
      const delay = scanDelay(s);
      const sev = delaySeverity(delay);
      if (sev && sev !== "normal") {
        items.push({
          type: "Delayed Scan",
          severity: sev,
          score: sev === "critical" ? 90 : sev === "high" ? 70 : 40,
          icon: Clock,
          title: `${sev.toUpperCase()} delay on bill ${s.bill_number}`,
          detail: `Scanned by ${s.scanned_by} — delay classified as ${sev}`,
          when: s.scanned_at,
          entity: s,
        });
      }
    });

    // 3. After-hours scans
    sales.filter((s) => s.is_scanned && s.scanned_at && isAfterHours(s.scanned_at)).forEach((s) => {
      items.push({
        type: "After-Hours",
        severity: "suspicious",
        score: 50,
        icon: MoonStar,
        title: `After-hours scan on bill ${s.bill_number}`,
        detail: `${s.scanned_by} scanned at ${utcToPktDisplay(s.scanned_at)} (22:00–06:00 PKT)`,
        when: s.scanned_at,
        entity: s,
      });
    });

    // 4. Re-allocated expired bills (admin override — worth monitoring for abuse)
    sales.filter((s) => s.reallocated_by).forEach((s) => {
      items.push({
        type: "Re-allocated",
        severity: "review",
        score: 30,
        icon: RotateCcw,
        title: `Expired bill ${s.bill_number} re-allocated`,
        detail: `${s.reallocated_by} awarded ${s.points_awarded || 0} pts to ${s.scanned_by}`,
        when: s.reallocated_at,
        entity: s,
      });
    });

    // 5. Manual points removals (negative adjustments)
    adjustments.filter((a) => (a.delta || 0) < 0).forEach((a) => {
      items.push({
        type: "Points Removed",
        severity: "review",
        score: 35,
        icon: TrendingDown,
        title: `${Math.abs(a.delta)} pts removed from ${a.customer_email}`,
        detail: `By ${a.adjusted_by}: ${a.reason}`,
        when: a.adjusted_at || a.created_date,
        entity: a,
      });
    });

    // 6. Detected anomalies from AnomalyPanel
    anomalies.forEach((a) => {
      items.push({
        type: a.type || "Anomaly",
        severity: a.severity || "suspicious",
        score: a.severity === "critical" ? 85 : 55,
        icon: AlertTriangle,
        title: a.title || a.description || "Anomaly detected",
        detail: a.detail || a.description || "",
        when: a.when || a.created_date,
        entity: a,
      });
    });

    return items.sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [sales, adjustments, anomalies]);

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, suspicious: 0, review: 0 };
    flags.forEach((f) => { if (c[f.severity] != null) c[f.severity]++; });
    return c;
  }, [flags]);

  const SEV_STYLE = {
    critical: { badge: "bg-red-100 text-red-700", bar: "bg-red-500", label: "Critical" },
    high: { badge: "bg-orange-100 text-orange-700", bar: "bg-orange-500", label: "High" },
    suspicious: { badge: "bg-amber-100 text-amber-700", bar: "bg-amber-500", label: "Suspicious" },
    review: { badge: "bg-blue-100 text-blue-700", bar: "bg-blue-500", label: "Review" },
  };

  return (
    <div className="space-y-5">
      {/* Severity summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: "critical", label: "Critical", icon: ShieldAlert, color: "text-red-600 bg-red-50" },
          { key: "high", label: "High", icon: AlertTriangle, color: "text-orange-600 bg-orange-50" },
          { key: "suspicious", label: "Suspicious", icon: Clock, color: "text-amber-600 bg-amber-50" },
          { key: "review", label: "Needs Review", icon: Pencil, color: "text-blue-600 bg-blue-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="bg-white rounded-2xl border border-[#E8DED8] p-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${s.color}`}><Icon className="h-4 w-4" /></div>
              <div className="text-2xl font-bold text-[#5C4A3A]">{counts[s.key]}</div>
              <div className="text-xs text-[#8B7355]">{s.label}</div>
            </div>
          );
        })}
      </div>

      {flags.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-60" />
          <p className="text-green-700 font-semibold">No suspicious activity detected</p>
          <p className="text-sm text-green-600 mt-1">All points activity looks clean in this range.</p>
        </div>
      ) : (
        <div>
          <h3 className="font-semibold text-[#5C4A3A] text-sm mb-2 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-red-500" /> All Flagged Activities ({flags.length})
          </h3>
          <div className="space-y-2">
            {flags.map((f, i) => {
              const Icon = f.icon;
              const style = SEV_STYLE[f.severity] || SEV_STYLE.review;
              return (
                <div key={i} className="bg-white rounded-xl border border-[#E8DED8] p-3 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${style.badge}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[#5C4A3A]">{f.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>{style.label}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F5EBE8] text-[#8B7355]">{f.type}</span>
                    </div>
                    <p className="text-xs text-[#8B7355] mt-0.5 truncate">{f.detail}</p>
                    {f.when && <p className="text-[10px] text-[#C9B8A6] mt-0.5">{utcToPktDisplay(f.when)}</p>}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-bold text-[#5C4A3A]">{f.score}</span>
                    </div>
                    <div className="text-[10px] text-[#C9B8A6]">risk score</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}