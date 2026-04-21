import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Link2, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function ReferralsTab({ customer, email }) {
  const referralCode = customer.referral_code;

  // People this user referred
  const { data: referred = [] } = useQuery({
    queryKey: ["referred-by", email],
    queryFn: () => base44.entities.Customer.filter({ referred_by: email }),
    enabled: !!email,
  });

  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  return (
    <div className="space-y-4">
      {/* Referral stats */}
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-3xl p-5">
        <h4 className="font-semibold text-white/80 text-sm mb-4">Referral Program</h4>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/20 rounded-xl p-3">
            <div className="text-2xl font-bold">{customer.referral_count || 0}</div>
            <div className="text-xs text-white/70">Referrals</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <div className="text-2xl font-bold">{customer.referral_conversions || 0}</div>
            <div className="text-xs text-white/70">Conversions</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <div className="text-2xl font-bold">{customer.referral_points_earned || 0}</div>
            <div className="text-xs text-white/70">Pts Earned</div>
          </div>
        </div>
      </div>

      {/* Referral link */}
      {referralCode && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4" /> Referral Link
          </h4>
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-600 font-mono truncate">{referralLink}</p>
            <button
              onClick={() => navigator.clipboard.writeText(referralLink)}
              className="text-xs bg-[#8B7355] text-white px-3 py-1.5 rounded-lg flex-shrink-0 hover:bg-[#6B5744] transition-colors"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Code: <span className="font-mono font-bold text-gray-600">{referralCode}</span></p>
        </div>
      )}

      {/* Referred by */}
      {customer.referred_by && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h4 className="font-semibold text-gray-700 text-sm mb-2">Referred By</h4>
          <p className="text-sm text-[#8B7355] font-medium">{customer.referred_by}</p>
          {customer.referral_bonus_awarded && (
            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full mt-1 inline-block">Bonus Awarded</span>
          )}
        </div>
      )}

      {/* People they referred */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-blue-500" /> People Referred ({referred.length})
        </h4>
        {referred.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No referrals yet</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {referred.map(r => {
              const rEmail = r.user_email || r.created_by;
              return (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{r.display_name || rEmail?.split("@")[0]}</p>
                    <p className="text-xs text-gray-400">{rEmail}</p>
                    <p className="text-xs text-gray-400">{r.created_date ? format(new Date(r.created_date), "MMM d, yyyy") : ""}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.referral_bonus_awarded ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
                    }`}>
                      {r.referral_bonus_awarded ? "Converted" : "Pending"}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{r.tier || "Bronze"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}