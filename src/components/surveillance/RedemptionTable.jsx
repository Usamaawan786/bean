import { Gift, CheckCircle, XCircle, Clock } from "lucide-react";
import { utcToPktDisplay } from "@/lib/pktTime";

const STATUS = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  claimed: { label: "Claimed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  expired: { label: "Expired", color: "bg-red-100 text-red-600", icon: XCircle },
};

export default function RedemptionTable({ redemptions }) {
  if (!redemptions.length) {
    return (
      <div className="text-center py-12 text-[#8B7355]">
        <Gift className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No reward redemptions in this range</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#F5EBE8]">
          <tr>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Code</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Customer</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Reward</th>
            <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Points Spent</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Redeemed At (PKT)</th>
            <th className="text-center px-3 py-3 text-[#8B7355] font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {redemptions.map((r) => {
            const cfg = STATUS[r.status] || STATUS.pending;
            const Icon = cfg.icon;
            return (
              <tr key={r.id} className="border-t border-[#F5EBE8] hover:bg-[#FDF9F7]">
                <td className="px-3 py-2.5 font-mono font-bold text-[#5C4A3A]">{r.redemption_code}</td>
                <td className="px-3 py-2.5 text-[#5C4A3A] truncate max-w-[180px]">{r.customer_email}</td>
                <td className="px-3 py-2.5 text-[#8B7355] truncate max-w-[160px]">{r.reward_name}</td>
                <td className="px-3 py-2.5 text-right font-bold text-[#5C4A3A]">{r.points_spent}</td>
                <td className="px-3 py-2.5 text-[#8B7355] whitespace-nowrap">{utcToPktDisplay(r.created_date)}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`inline-flex items-center gap-1 ${cfg.color} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                    <Icon className="h-3 w-3" /> {cfg.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}