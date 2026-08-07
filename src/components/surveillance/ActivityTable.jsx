import { ShoppingBag, Gift, Share2, Zap, UserCheck, Activity } from "lucide-react";
import { utcToPktDisplay } from "@/lib/pktTime";

const ICONS = {
  points_earned: { icon: ShoppingBag, color: "text-green-600", bg: "bg-green-50" },
  reward_redeemed: { icon: Gift, color: "text-purple-600", bg: "bg-purple-50" },
  referral: { icon: Share2, color: "text-blue-600", bg: "bg-blue-50" },
  flash_drop_claimed: { icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
  tier_upgraded: { icon: UserCheck, color: "text-indigo-600", bg: "bg-indigo-50" },
};

export default function ActivityTable({ activities }) {
  if (!activities.length) {
    return (
      <div className="text-center py-12 text-[#8B7355]">
        <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No activity logged in this range</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#F5EBE8]">
          <tr>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">User</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Type</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Description</th>
            <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Points</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Time (PKT)</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => {
            const cfg = ICONS[a.action_type] || { icon: Activity, color: "text-[#8B7355]", bg: "bg-[#F5EBE8]" };
            const Icon = cfg.icon;
            return (
              <tr key={a.id} className="border-t border-[#F5EBE8] hover:bg-[#FDF9F7]">
                <td className="px-3 py-2.5 text-[#5C4A3A] truncate max-w-[180px]">{a.user_email}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center gap-1 ${cfg.bg} ${cfg.color} text-[10px] font-semibold px-2 py-0.5 rounded-full`}>
                    <Icon className="h-3 w-3" /> {a.action_type?.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[#8B7355] truncate max-w-[280px]">{a.description}</td>
                <td className="px-3 py-2.5 text-right font-bold text-[#5C4A3A]">{a.points_amount > 0 ? `+${a.points_amount}` : a.points_amount || ""}</td>
                <td className="px-3 py-2.5 text-[#8B7355] whitespace-nowrap">{utcToPktDisplay(a.created_date)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}