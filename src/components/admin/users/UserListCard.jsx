import { Smartphone, Star, Crown, Users } from "lucide-react";
import { format } from "date-fns";

const TIER_COLORS = {
  Bronze: "bg-amber-100 text-amber-700",
  Silver: "bg-gray-100 text-gray-600",
  Gold: "bg-yellow-100 text-yellow-700",
  Platinum: "bg-purple-100 text-purple-700",
};

export default function UserListCard({ customer, userRecord, hasDevice, onClick }) {
  const email = customer.user_email || customer.created_by || "";
  const name = customer.display_name || userRecord?.full_name || email.split("@")[0];
  const tier = customer.tier || "Bronze";
  const joinedAt = customer.created_date;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-[#D4C4B0] transition-all"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
          {name[0]?.toUpperCase() || "?"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-800 truncate">{name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[tier]}`}>{tier}</span>
            {customer.is_founding_member && (
              <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-medium">FM</span>
            )}
            {customer.is_eba && (
              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">EBA</span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate mt-0.5">{email}</p>
        </div>

        {/* Stats */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 text-[#8B7355] font-bold text-sm">
            <Star className="h-3.5 w-3.5" />
            {(customer.points_balance || 0).toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5">
            {hasDevice && (
              <span className="text-green-500" title="Has active device">
                <Smartphone className="h-3.5 w-3.5" />
              </span>
            )}
            <span className="text-xs text-gray-400">
              {joinedAt ? format(new Date(joinedAt), "MMM d") : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-50">
        <div className="text-center">
          <div className="text-xs font-bold text-gray-700">{customer.total_points_earned || 0}</div>
          <div className="text-[10px] text-gray-400">Total Pts</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-gray-700">{customer.cups_redeemed || 0}</div>
          <div className="text-[10px] text-gray-400">Redeemed</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-gray-700">{customer.referral_count || 0}</div>
          <div className="text-[10px] text-gray-400">Referrals</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-gray-700">
            {customer.total_spend_pkr ? `Rs.${(customer.total_spend_pkr / 1000).toFixed(1)}k` : "—"}
          </div>
          <div className="text-[10px] text-gray-400">Spent</div>
        </div>
      </div>
    </button>
  );
}