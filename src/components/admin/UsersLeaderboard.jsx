import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronDown, ChevronUp, Gift, Share2, ShoppingBag, UserCheck, Activity, AlertTriangle, Users, Pencil, Save, X, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const TIER_COLORS = {
  Platinum: "bg-purple-100 text-purple-700",
  Gold: "bg-amber-100 text-amber-700",
  Silver: "bg-gray-100 text-gray-600",
  Bronze: "bg-orange-100 text-orange-700",
};

const ACTION_ICONS = {
  points_earned: { icon: ShoppingBag, color: "text-green-600", bg: "bg-green-50", label: "Purchase" },
  reward_redeemed: { icon: Gift, color: "text-purple-600", bg: "bg-purple-50", label: "Redeemed" },
  referral: { icon: Share2, color: "text-blue-600", bg: "bg-blue-50", label: "Referral" },
  flash_drop_claimed: { icon: Activity, color: "text-amber-600", bg: "bg-amber-50", label: "Flash Drop" },
  tier_upgraded: { icon: UserCheck, color: "text-indigo-600", bg: "bg-indigo-50", label: "Tier Up" },
};

function detectAnomalies(customer, userActivities, redemptions) {
  const flags = [];
  const earned = customer.total_points_earned || 0;
  const balance = customer.points_balance || 0;
  const redeemed = redemptions.filter(r => r.customer_email === customer.created_by).reduce((s, r) => s + (r.points_spent || 0), 0);

  // Check if balance > earned - redeemed (points inflation)
  if (balance > earned - redeemed + 5) {
    flags.push(`Balance (${balance}) exceeds earned minus redeemed (${earned - redeemed})`);
  }

  // Many referral points but 0 spend
  const referralPts = customer.referral_points_earned || 0;
  const spend = customer.total_spend_pkr || 0;
  if (referralPts > 0 && spend === 0 && earned > 50) {
    flags.push("Earned referral points but no store spend recorded");
  }

  // Rapid activity (more than 10 activities in short time not possible to detect easily, flag high counts)
  if (userActivities.length > 20 && spend < 500) {
    flags.push(`High activity count (${userActivities.length}) with low spend`);
  }

  return flags;
}

function UserRow({ customer, activities, redemptions, rank, onAdjust }) {
  const [expanded, setExpanded] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [newBalance, setNewBalance] = useState(customer.points_balance || 0);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const userActivities = activities.filter(a => a.user_email === customer.created_by);
  const userRedemptions = redemptions.filter(r => r.customer_email === customer.created_by);
  const anomalies = detectAnomalies(customer, userActivities, redemptions);

  const pointsBreakdown = {
    purchase: userActivities.filter(a => a.action_type === "points_earned").reduce((s, a) => s + (a.points_amount || 0), 0),
    referral: userActivities.filter(a => a.action_type === "referral").reduce((s, a) => s + (a.points_amount || 0), 0),
    flash_drop: userActivities.filter(a => a.action_type === "flash_drop_claimed").reduce((s, a) => s + (a.points_amount || 0), 0),
  };

  return (
    <div className={`bg-white rounded-2xl border ${anomalies.length > 0 ? "border-red-200" : "border-[#E8DED8]"} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#FDF9F7] transition-colors"
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          rank === 1 ? "bg-amber-400 text-white" : rank === 2 ? "bg-gray-300 text-gray-700" : rank === 3 ? "bg-orange-300 text-white" : "bg-[#F5EBE8] text-[#8B7355]"
        }`}>{rank}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#5C4A3A] text-sm truncate">{customer.created_by}</span>
            {anomalies.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLORS[customer.tier] || TIER_COLORS.Bronze}`}>
              {customer.tier || "Bronze"}
            </span>
            <span className="text-xs text-[#8B7355]">PKR {(customer.total_spend_pkr || 0).toLocaleString()} spent</span>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1 justify-end">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span className="font-bold text-[#5C4A3A] text-sm">{customer.points_balance || 0}</span>
          </div>
          <div className="text-xs text-[#8B7355]">{customer.total_points_earned || 0} lifetime</div>
        </div>

        {expanded ? <ChevronUp className="h-4 w-4 text-[#8B7355] flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-[#8B7355] flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-[#F5EBE8] pt-3">

              {/* Anomaly flags */}
              {anomalies.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-red-600 font-semibold text-xs mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Suspicious Activity Detected
                  </div>
                  {anomalies.map((flag, i) => (
                    <p key={i} className="text-xs text-red-500 mt-0.5">• {flag}</p>
                  ))}
                </div>
              )}

              {/* Points breakdown */}
              <div>
                <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-2">Points Breakdown</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Purchase", value: pointsBreakdown.purchase, color: "bg-green-50 text-green-700" },
                    { label: "Referral", value: pointsBreakdown.referral, color: "bg-blue-50 text-blue-700" },
                    { label: "Flash Drop", value: pointsBreakdown.flash_drop, color: "bg-amber-50 text-amber-700" },
                  ].map(item => (
                    <div key={item.label} className={`${item.color} rounded-xl p-2 text-center`}>
                      <div className="font-bold text-base">{item.value}</div>
                      <div className="text-xs opacity-80">{item.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="bg-purple-50 text-purple-700 rounded-xl p-2 text-center">
                    <div className="font-bold text-base">{userRedemptions.reduce((s, r) => s + (r.points_spent || 0), 0)}</div>
                    <div className="text-xs opacity-80">Redeemed</div>
                  </div>
                  <div className="bg-[#F5EBE8] text-[#5C4A3A] rounded-xl p-2 text-center">
                    <div className="font-bold text-base">{customer.referral_count || 0}</div>
                    <div className="text-xs opacity-80">Referrals Made</div>
                  </div>
                </div>
              </div>

              {/* Adjust points */}
              <div className="bg-[#F5F1ED] border border-[#E8DED8] rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide flex items-center gap-1">
                    <Pencil className="h-3.5 w-3.5" /> Adjust Points
                  </p>
                  <span className="text-xs text-[#5C4A3A]">Current: <strong>{customer.points_balance || 0}</strong></span>
                </div>
                {adjusting ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#8B7355] whitespace-nowrap">New balance</label>
                      <input type="number" min={0}
                        className="flex-1 border border-[#E8DED8] rounded-lg px-2.5 py-1.5 text-sm text-[#5C4A3A] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
                        value={newBalance} onChange={e => setNewBalance(Math.max(0, Number(e.target.value)))} />
                    </div>
                    <textarea
                      className="w-full border border-[#E8DED8] rounded-lg px-2.5 py-1.5 text-sm text-[#5C4A3A] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 min-h-[72px] resize-y"
                      placeholder="Full reason — permanently logged & shown to the customer (e.g. fraud correction, duplicate award, manual removal of X points from bill #...)"
                      value={reason} onChange={e => setReason(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        if (!reason.trim()) { toast.error("A reason is required and will be permanently logged"); return; }
                        setSaving(true);
                        await onAdjust(customer, newBalance, reason.trim());
                        setSaving(false);
                        setAdjusting(false);
                        setReason("");
                      }} disabled={saving}
                        className="flex-1 bg-[#8B7355] hover:bg-[#6B5744] text-white text-xs font-semibold rounded-lg py-2 flex items-center justify-center gap-1 disabled:opacity-60">
                        {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                      </button>
                      <button onClick={() => { setAdjusting(false); setNewBalance(customer.points_balance || 0); setReason(""); }}
                        className="px-3 bg-white border border-[#E8DED8] text-[#8B7355] text-xs rounded-lg py-2">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setNewBalance(customer.points_balance || 0); setAdjusting(true); }}
                    className="w-full bg-white border border-[#E8DED8] text-[#5C4A3A] text-xs font-semibold rounded-lg py-2 hover:bg-[#F5EBE8] flex items-center justify-center gap-1">
                    <Pencil className="h-3.5 w-3.5" /> Adjust / Reset Balance
                  </button>
                )}
              </div>

              {/* Activity log */}
              {userActivities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-2">Activity Log ({userActivities.length})</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {userActivities.map(a => {
                      const cfg = ACTION_ICONS[a.action_type] || ACTION_ICONS.points_earned;
                      const Icon = cfg.icon;
                      return (
                        <div key={a.id} className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-[#5C4A3A] truncate">{a.description}</div>
                            <div className="text-xs text-[#C9B8A6]">{new Date(a.created_date).toLocaleDateString()}</div>
                          </div>
                          {a.points_amount > 0 && (
                            <span className="text-xs font-bold text-green-600 flex-shrink-0">+{a.points_amount}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function UsersLeaderboard({ customers, activities, redemptions, settings }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("points_balance");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const queryClient = useQueryClient();

  const handleAdjust = async (customer, newBalance, reason) => {
    const oldBalance = customer.points_balance || 0;
    try {
      const me = await base44.auth.me();
      await base44.entities.Customer.update(customer.id, { points_balance: newBalance });
      const delta = newBalance - oldBalance;
      await base44.entities.PointsAdjustment.create({
        customer_email: customer.created_by,
        customer_name: customer.display_name || "",
        old_balance: oldBalance,
        new_balance: newBalance,
        delta,
        reason,
        adjusted_by: me.email,
        adjusted_by_name: me.full_name || me.email,
        adjusted_at: new Date().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      await queryClient.invalidateQueries({ queryKey: ["surv-adjustments"] });
      toast.success(`Points updated: ${oldBalance} → ${newBalance}${delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta})` : ""} — logged to audit trail`);
    } catch (e) {
      toast.error("Failed to update points: " + (e?.message || e));
    }
  };

  const filtered = customers
    .filter(c => !search || (c.created_by || "").toLowerCase().includes(search.toLowerCase()))
    .filter(c => {
      if (!flaggedOnly) return true;
      const userActivities = activities.filter(a => a.user_email === c.created_by);
      return detectAnomalies(c, userActivities, redemptions).length > 0;
    })
    .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));

  const totalFlagged = customers.filter(c => {
    const ua = activities.filter(a => a.user_email === c.created_by);
    return detectAnomalies(c, ua, redemptions).length > 0;
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[#5C4A3A] text-lg">User Rewards Ledger</h2>
          <p className="text-xs text-[#8B7355]">{customers.length} users · {totalFlagged > 0 && <span className="text-red-500 font-semibold">{totalFlagged} flagged</span>}</p>
        </div>
        {totalFlagged > 0 && (
          <button
            onClick={() => setFlaggedOnly(!flaggedOnly)}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${flaggedOnly ? "bg-red-500 text-white" : "bg-red-50 text-red-500"}`}
          >
            {flaggedOnly ? "Show All" : `⚠ Show Flagged (${totalFlagged})`}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border border-[#E8DED8] rounded-xl px-3 py-2 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
          placeholder="Search by email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border border-[#E8DED8] rounded-xl px-3 py-2 text-sm text-[#5C4A3A] bg-white focus:outline-none"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="points_balance">Sort: Balance</option>
          <option value="total_points_earned">Sort: Lifetime</option>
          <option value="total_spend_pkr">Sort: Spend</option>
          <option value="referral_count">Sort: Referrals</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((customer, i) => (
          <UserRow
            key={customer.id}
            customer={customer}
            activities={activities}
            redemptions={redemptions}
            rank={i + 1}
            onAdjust={handleAdjust}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-[#8B7355]">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}