import { AlertTriangle, UserX, Scale, Zap, Repeat } from "lucide-react";
import { utcToPktDisplay } from "@/lib/pktTime";

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