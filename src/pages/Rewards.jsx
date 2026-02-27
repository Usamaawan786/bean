import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Gift, ArrowLeft, Check, Sparkles, TrendingUp, Trophy, Medal, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RewardCard from "@/components/rewards/RewardCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TierBenefits, { calculateTier, getTierData } from "@/components/rewards/TierBenefits";
import TierBadge from "@/components/dashboard/TierBadge";

export default function Rewards() {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [successDialog, setSuccessDialog] = useState({ open: false, reward: null, code: "" });
  const [activeTab, setActiveTab] = useState("rewards"); // "rewards" or "leaderboard"
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) return; // Allow guests to browse rewards
        const u = await base44.auth.me();
        setUser(u);
        const customers = await base44.entities.Customer.filter({ created_by: u.email });
        if (customers.length > 0) {
          const customerData = customers[0];
          const calculatedTier = calculateTier(customerData.total_points_earned || 0);
          if (calculatedTier !== customerData.tier) {
            await base44.entities.Customer.update(customerData.id, { tier: calculatedTier });
            customerData.tier = calculatedTier;
          }
          setCustomer(customerData);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["rewards"],
    queryFn: () => base44.entities.Reward.filter({ is_active: true }),
    initialData: []
  });

  const { data: allCustomers = [], isLoading: loadingLeaderboard } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => base44.entities.Customer.list("-total_points_earned", 50),
    enabled: activeTab === "leaderboard"
  });

  const topCustomers = allCustomers.slice(0, 10);
  const userRank = allCustomers.findIndex(c => c.created_by === user?.email) + 1;

  const redeemMutation = useMutation({
    mutationFn: async (reward) => {
      // Create redemption
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await base44.entities.Redemption.create({
        customer_email: user.email,
        reward_name: reward.name,
        points_spent: reward.points_required,
        redemption_code: code
      });

      // Update customer points
      const newBalance = customer.points_balance - reward.points_required;
      const newCups = (customer.cups_redeemed || 0) + (reward.category === "Drinks" ? 1 : 0);
      await base44.entities.Customer.update(customer.id, {
        points_balance: newBalance,
        cups_redeemed: newCups
      });

      setCustomer(prev => ({
        ...prev,
        points_balance: newBalance,
        cups_redeemed: newCups
      }));

      // Log activity
      await base44.entities.Activity.create({
        user_email: user.email,
        action_type: "reward_redeemed",
        description: `Redeemed ${reward.name}`,
        points_amount: -reward.points_required,
        metadata: { reward_id: reward.id, redemption_code: code }
      });

      return { code, reward };
    },
    onSuccess: ({ code, reward }) => {
      setSuccessDialog({ open: true, reward, code });
    }
  });

  const categories = ["all", "Drinks", "Food", "Merchandise", "Experience"];

  const rewardList = Array.isArray(rewards) ? rewards : [];
  const filteredRewards = selectedCategory === "all"
    ? rewardList
    : rewardList.filter(r => r.category === selectedCategory);

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF]">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <motion.div
            animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-10 right-5 w-64 h-64 bg-[#D4C4B0]/40 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-5 left-10 w-56 h-56 bg-[#C9B8A6]/30 rounded-full blur-3xl"
          />
        </div>
        <div className="relative max-w-lg mx-auto px-5 pt-6 pb-8">
          <Link
            to={createPageUrl("Home")}
            className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h1 className="text-3xl font-bold">Rewards</h1>
              <p className="text-[#E8DED8] text-sm mt-1">Treat yourself!</p>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl px-5 py-4 border border-white/20 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                  <Star className="h-5 w-5 text-amber-300 fill-amber-300" />
                </motion.div>
                <span className="text-2xl font-bold">{customer?.points_balance || 0}</span>
              </div>
              <p className="text-xs text-[#E8DED8]">Available points</p>
            </motion.div>
          </motion.div>

          {/* Tier Badge */}
          {customer && (
            <TierBadge
              tier={customer.tier || "Bronze"}
              totalPoints={customer.total_points_earned || 0}
            />
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-lg mx-auto px-5 py-4"
      >
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-[#E8DED8] shadow-lg">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab("rewards")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === "rewards"
                ? "bg-gradient-to-r from-[#8B7355] to-[#6B5744] text-white shadow-md"
                : "text-[#5C4A3A] hover:bg-[#F5EBE8]"
              }`}
          >
            <Gift className="h-4 w-4" />
            Rewards
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab("leaderboard")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === "leaderboard"
                ? "bg-gradient-to-r from-[#8B7355] to-[#6B5744] text-white shadow-md"
                : "text-[#5C4A3A] hover:bg-[#F5EBE8]"
              }`}
          >
            <Trophy className="h-4 w-4" />
            Leaderboard
          </motion.button>
        </div>
      </motion.div>

      {/* Categories - Only show for rewards tab */}
      {activeTab === "rewards" && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-lg mx-auto px-5 pb-4 overflow-x-auto"
        >
          <div className="flex gap-2">
            {categories.map((cat, idx) => (
              <motion.button
                key={cat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat
                    ? "bg-gradient-to-r from-[#8B7355] to-[#6B5744] text-white shadow-md"
                    : "bg-white text-[#5C4A3A] border border-[#E8DED8] hover:border-[#D4C4B0] hover:shadow-md"
                  }`}
              >
                {cat === "all" ? "All Rewards" : cat}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-5 pb-24 space-y-6">
        {activeTab === "rewards" ? (
          <>
            {/* Tier Benefits */}
            {customer && (
              <TierBenefits tier={customer.tier || "Bronze"} />
            )}

            {/* Progress to Next Tier */}
            {customer && getTierData(customer.tier).nextTier && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-[#E8DED8] p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-[#8B7355]" />
                  <h3 className="font-bold text-[#5C4A3A]">Next Tier Progress</h3>
                </div>

                {(() => {
                  const currentTierData = getTierData(customer.tier);
                  const totalPoints = customer.total_points_earned || 0;
                  const pointsNeeded = currentTierData.pointsNeeded;
                  const progress = (totalPoints / pointsNeeded) * 100;
                  const remaining = pointsNeeded - totalPoints;

                  return (
                    <>
                      <div className="relative h-3 bg-[#F5EBE8] rounded-full overflow-hidden mb-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progress, 100)}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="absolute h-full bg-gradient-to-r from-[#8B7355] to-[#6B5744] rounded-full"
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#8B7355]">
                          {totalPoints} / {pointsNeeded} points
                        </span>
                        <span className="font-semibold text-[#5C4A3A]">
                          {remaining} more to {currentTierData.nextTier}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}

            {/* Section Title */}
            <div>
              <h2 className="text-xl font-bold text-[#5C4A3A] mb-1">Available Rewards</h2>
              <p className="text-sm text-[#8B7355]">Redeem your points for treats</p>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-[3/4] bg-stone-200 rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : filteredRewards.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 text-stone-300 mx-auto mb-4" />
                <p className="text-stone-500">No rewards available in this category</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <AnimatePresence>
                  {filteredRewards.map((reward, i) => (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <RewardCard
                        reward={reward}
                        userPoints={customer?.points_balance || 0}
                        onRedeem={() => redeemMutation.mutate(reward)}
                        isRedeeming={redeemMutation.isPending}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : (
          /* Leaderboard Content */
          <>
            {/* Your Rank Card */}
            {customer && userRank > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#8B7355] to-[#6B5744] text-white rounded-2xl p-5 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm text-[#E8DED8]">Your Rank</div>
                      <div className="text-2xl font-bold">#{userRank}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[#E8DED8]">Total Points</div>
                    <div className="text-2xl font-bold">{customer.total_points_earned || 0}</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Top 3 Podium */}
            {topCustomers.length >= 3 && (
              <div>
                <h3 className="text-sm font-semibold text-[#8B7355] mb-3 px-1">Top 3</h3>
                <div className="flex items-end justify-center gap-2 mb-6">
                  {/* 2nd Place */}
                  <div className="flex-1">
                    <div className="text-center mb-2">
                      <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center mb-2 border-4 border-white shadow-lg">
                        <span className="text-xl">🥈</span>
                      </div>
                      <div className="text-xs font-semibold text-[#5C4A3A] truncate px-1">
                        {topCustomers[1].created_by?.split('@')[0]}
                      </div>
                      <div className="text-sm font-bold text-[#8B7355]">
                        {topCustomers[1].total_points_earned || 0}
                      </div>
                    </div>
                    <div className="bg-gradient-to-b from-gray-300 to-gray-400 rounded-t-2xl h-20 flex items-center justify-center font-bold text-gray-800 shadow-lg">
                      2
                    </div>
                  </div>

                  {/* 1st Place */}
                  <div className="flex-1">
                    <div className="text-center mb-2">
                      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mb-2 border-4 border-white shadow-xl relative">
                        <Crown className="h-6 w-6 text-white absolute -top-5" />
                        <span className="text-2xl">👑</span>
                      </div>
                      <div className="text-xs font-semibold text-[#5C4A3A] truncate px-1">
                        {topCustomers[0].created_by?.split('@')[0]}
                      </div>
                      <div className="text-sm font-bold text-[#8B7355]">
                        {topCustomers[0].total_points_earned || 0}
                      </div>
                    </div>
                    <div className="bg-gradient-to-b from-amber-400 to-yellow-500 rounded-t-2xl h-28 flex items-center justify-center font-bold text-white text-xl shadow-xl">
                      1
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex-1">
                    <div className="text-center mb-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center mb-2 border-4 border-white shadow-lg">
                        <span className="text-lg">🥉</span>
                      </div>
                      <div className="text-xs font-semibold text-[#5C4A3A] truncate px-1">
                        {topCustomers[2].created_by?.split('@')[0]}
                      </div>
                      <div className="text-sm font-bold text-[#8B7355]">
                        {topCustomers[2].total_points_earned || 0}
                      </div>
                    </div>
                    <div className="bg-gradient-to-b from-orange-400 to-amber-600 rounded-t-2xl h-16 flex items-center justify-center font-bold text-white shadow-lg">
                      3
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rest of Leaderboard */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[#8B7355] mb-3 px-1">Rankings</h3>
              {loadingLeaderboard ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />
                  ))}
                </div>
              ) : (
                topCustomers.slice(3, 10).map((c, index) => {
                  const rank = index + 4;
                  const isCurrentUser = c.created_by === user?.email;

                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${isCurrentUser ? "border-[#8B7355] shadow-md" : "border-[#E8DED8]"
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isCurrentUser ? "bg-[#8B7355] text-white" : "bg-[#F5EBE8] text-[#8B7355]"
                        }`}>
                        {rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${isCurrentUser ? "text-[#8B7355]" : "text-[#5C4A3A]"}`}>
                          {c.created_by?.split('@')[0]}{isCurrentUser && " (You)"}
                        </div>
                        <div className="text-xs text-[#C9B8A6] flex items-center gap-1">
                          <Medal className="h-3 w-3" />
                          {c.tier}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#8B7355]">
                          {c.total_points_earned || 0}
                        </div>
                        <div className="text-xs text-[#C9B8A6]">points</div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Success Dialog */}
      <Dialog open={successDialog.open} onOpenChange={(open) => setSuccessDialog({ ...successDialog, open })}>
        <DialogContent className="max-w-sm rounded-3xl">
          <div className="text-center py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="w-20 h-20 rounded-full bg-[#EDE8E3] flex items-center justify-center mx-auto mb-4"
            >
              <Check className="h-10 w-10 text-[#8B7355]" />
            </motion.div>
            <h3 className="text-xl font-bold text-[#5C4A3A]">Reward Redeemed!</h3>
            <p className="text-[#8B7355] mt-2">
              You've redeemed <strong>{successDialog.reward?.name}</strong>
            </p>

            <div className="mt-6 bg-[#F5EBE8] rounded-2xl p-4">
              <p className="text-xs text-[#8B7355] mb-1">Your redemption code</p>
              <code className="text-2xl font-bold text-[#5C4A3A] tracking-wider">
                {successDialog.code}
              </code>
            </div>

            <p className="text-xs text-[#8B7355] mt-4">
              Show this code to our barista to claim your reward
            </p>

            <Button
              onClick={() => setSuccessDialog({ open: false, reward: null, code: "" })}
              className="w-full mt-6 rounded-xl bg-[#8B7355] hover:bg-[#6B5744]"
            >
              Awesome!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}