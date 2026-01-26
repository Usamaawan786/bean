import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Gift, ArrowLeft, Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RewardCard from "@/components/rewards/RewardCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
      if (customers.length > 0) setCustomer(customers[0]);
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
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Rewards</h1>
              <p className="text-amber-100 text-sm mt-1">Treat yourself!</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-2xl px-5 py-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-[#F8F6F4] fill-[#F8F6F4]" />
                <span className="text-2xl font-bold">{customer?.points_balance || 0}</span>
              </div>
              <p className="text-xs text-[#E8DED8]">Available points</p>
            </div>
          </div>
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

      {/* Rewards Grid */}
      <div className="max-w-lg mx-auto px-5 pb-24">
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