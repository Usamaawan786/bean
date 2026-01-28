import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Gift, ArrowLeft, Check, Sparkles, TrendingUp } from "lucide-react";
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
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const customers = await base44.entities.Customer.filter({ created_by: u.email });
      if (customers.length > 0) {
        const customerData = customers[0];
        
        // Auto-update tier based on total points
        const calculatedTier = calculateTier(customerData.total_points_earned || 0);
        if (calculatedTier !== customerData.tier) {
          await base44.entities.Customer.update(customerData.id, { tier: calculatedTier });
          customerData.tier = calculatedTier;
        }
        
        setCustomer(customerData);
      }
    };
    loadUser();
  }, []);

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["rewards"],
    queryFn: () => base44.entities.Reward.filter({ is_active: true })
  });

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
  
  const filteredRewards = selectedCategory === "all" 
    ? rewards 
    : rewards.filter(r => r.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-lg mx-auto px-5 pt-6 pb-8">
          <Link 
            to={createPageUrl("Home")}
            className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Rewards</h1>
              <p className="text-[#E8DED8] text-sm mt-1">Treat yourself!</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-2xl px-5 py-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-[#F8F6F4] fill-[#F8F6F4]" />
                <span className="text-2xl font-bold">{customer?.points_balance || 0}</span>
              </div>
              <p className="text-xs text-[#E8DED8]">Available points</p>
            </div>
          </div>

          {/* Tier Badge */}
          {customer && (
            <TierBadge 
              tier={customer.tier || "Bronze"} 
              totalPoints={customer.total_points_earned || 0} 
            />
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-lg mx-auto px-5 py-4 overflow-x-auto">
        <div className="flex gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-[#8B7355] text-white"
                  : "bg-white text-[#5C4A3A] border border-[#E8DED8] hover:border-[#D4C4B0]"
              }`}
            >
              {cat === "all" ? "All Rewards" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-5 py-6 pb-24 space-y-6">
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