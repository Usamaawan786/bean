import { format } from "date-fns";
import { Smartphone, Star, Crown, Gift, Users, QrCode, ShoppingBag, Check, X } from "lucide-react";

const TIER_GRADIENT = {
  Bronze: "from-amber-400 to-amber-600",
  Silver: "from-gray-300 to-gray-500",
  Gold: "from-yellow-400 to-yellow-600",
  Platinum: "from-purple-400 to-purple-700",
};

function StatBox({ label, value, color = "text-[#5C4A3A]" }) {
  return (
    <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
      <div className={`text-2xl font-bold ${color}`}>{value ?? "—"}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

export default function ProfileTab({ customer, userRecord, email, activities, redemptions, sales, deviceTokens }) {
  const tier = customer.tier || "Bronze";
  const joinedAt = customer.created_date;
  const pointsSpent = (customer.total_points_earned || 0) - (customer.points_balance || 0);

  return (
    <div className="space-y-4">
      {/* Tier card */}
      <div className={`bg-gradient-to-br ${TIER_GRADIENT[tier]} text-white rounded-3xl p-5`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium">Loyalty Tier</p>
            <h3 className="text-3xl font-bold mt-1">{tier}</h3>
          </div>
          <Crown className="h-12 w-12 text-white/30" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-xl font-bold">{customer.points_balance || 0}</div>
            <div className="text-xs text-white/70">Balance</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-xl font-bold">{customer.total_points_earned || 0}</div>
            <div className="text-xs text-white/70">Total Earned</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-xl font-bold">{pointsSpent}</div>
            <div className="text-xs text-white/70">Points Spent</div>
          </div>
        </div>
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="QR Scans" value={sales.length} />
        <StatBox label="Cups Redeemed" value={customer.cups_redeemed || 0} />
        <StatBox label="Redemptions" value={redemptions.length} />
        <StatBox label="Referrals Made" value={customer.referral_count || 0} />
        <StatBox label="Referral Converts" value={customer.referral_conversions || 0} />
        <StatBox label="Referral Points" value={customer.referral_points_earned || 0} />
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 mb-3 text-sm">Account Details</h4>
        <InfoRow label="Email" value={email} />
        <InfoRow label="Display Name" value={customer.display_name || userRecord?.full_name} />
        <InfoRow label="Phone" value={customer.phone} />
        <InfoRow label="Referral Code" value={customer.referral_code} />
        <InfoRow label="Referred By" value={customer.referred_by} />
        <InfoRow label="Total Spend" value={customer.total_spend_pkr ? `Rs. ${(customer.total_spend_pkr || 0).toLocaleString()}` : null} />
        <InfoRow label="Founding Member" value={customer.is_founding_member ? "Yes ⭐" : "No"} />
        <InfoRow label="Elite Bean Ambassador" value={customer.is_eba ? "Yes 👑" : "No"} />
        {customer.is_founding_member && <InfoRow label="FM Discounts Used" value={`${customer.fm_discount_used || 0} / 3`} />}
        {customer.is_eba && <InfoRow label="EBA Discounts Used" value={customer.eba_discount_used || 0} />}
        <InfoRow label="Joined" value={joinedAt ? format(new Date(joinedAt), "MMM d, yyyy 'at' HH:mm") : "—"} />
        <InfoRow label="Role" value={userRecord?.role || "user"} />
      </div>

      {/* Device status */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> Device Tokens
        </h4>
        {deviceTokens.length === 0 ? (
          <p className="text-sm text-gray-400">No active devices registered</p>
        ) : (
          <div className="space-y-2">
            {deviceTokens.map(d => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${d.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className="capitalize text-gray-700">{d.platform}</span>
                  <span className="font-mono text-xs text-gray-400">{d.token?.slice(-8)}</span>
                </div>
                {d.is_active ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-300" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}