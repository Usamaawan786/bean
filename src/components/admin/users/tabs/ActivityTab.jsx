import { format } from "date-fns";
import { Star, Gift, Users, Zap, TrendingUp, QrCode } from "lucide-react";

const ACTION_CONFIG = {
  points_earned:     { icon: Star,      color: "bg-amber-100 text-amber-600",  label: "Points Earned" },
  reward_redeemed:   { icon: Gift,      color: "bg-green-100 text-green-600",  label: "Reward Redeemed" },
  referral:          { icon: Users,     color: "bg-blue-100 text-blue-600",    label: "Referral" },
  flash_drop_claimed:{ icon: Zap,       color: "bg-orange-100 text-orange-600",label: "Flash Drop" },
  tier_upgraded:     { icon: TrendingUp,color: "bg-purple-100 text-purple-600",label: "Tier Upgrade" },
};

export default function ActivityTab({ activities, sales }) {
  // Merge activities + QR scans
  const qrEvents = sales.map(s => ({
    id: "qr_" + s.id,
    action_type: "qr_scan",
    description: `Scanned QR for bill #${s.bill_number} — earned ${s.points_awarded || 0} pts`,
    points_amount: s.points_awarded || 0,
    created_date: s.scanned_at || s.created_date,
  }));

  const allEvents = [
    ...activities,
    ...qrEvents,
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  if (allEvents.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">No activity recorded yet</p>
    </div>
  );

  // Summary bar
  const totalPts = activities.filter(a => a.points_amount > 0).reduce((s, a) => s + (a.points_amount || 0), 0);
  const byType = {};
  activities.forEach(a => { byType[a.action_type] = (byType[a.action_type] || 0) + 1; });

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 mb-3 text-sm">Activity Summary</h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-[#5C4A3A]">{allEvents.length}</div>
            <div className="text-xs text-gray-400">Total Events</div>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-600">{totalPts}</div>
            <div className="text-xs text-gray-400">Pts Earned</div>
          </div>
          <div>
            <div className="text-lg font-bold text-[#5C4A3A]">{sales.length}</div>
            <div className="text-xs text-gray-400">QR Scans</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 mb-3 text-sm">Full Timeline</h4>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {allEvents.map(event => {
            const isQr = event.action_type === "qr_scan";
            const cfg = isQr
              ? { icon: QrCode, color: "bg-teal-100 text-teal-600" }
              : ACTION_CONFIG[event.action_type] || { icon: Star, color: "bg-gray-100 text-gray-500" };
            const Icon = cfg.icon;
            return (
              <div key={event.id} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-snug">{event.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {event.created_date ? format(new Date(event.created_date), "MMM d, yyyy · HH:mm") : "—"}
                  </p>
                </div>
                {event.points_amount ? (
                  <span className={`text-xs font-bold flex-shrink-0 ${event.points_amount > 0 ? "text-green-600" : "text-red-500"}`}>
                    {event.points_amount > 0 ? "+" : ""}{event.points_amount} pts
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}