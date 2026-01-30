import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Gift, TrendingUp, Award, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const offerIcons = {
  discount: Gift,
  bonus_points: TrendingUp,
  free_item: Award,
  challenge: Sparkles,
  recommendation: Gift
};

const offerColors = {
  discount: "from-green-500 to-emerald-600",
  bonus_points: "from-amber-500 to-orange-600",
  free_item: "from-purple-500 to-pink-600",
  challenge: "from-blue-500 to-cyan-600",
  recommendation: "from-rose-500 to-red-600"
};

export default function PersonalizedOffers({ userEmail }) {
  const queryClient = useQueryClient();

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["personalized-offers", userEmail],
    queryFn: async () => {
      const allOffers = await base44.entities.PersonalizedOffer.filter({ 
        user_email: userEmail,
        is_active: true,
        is_redeemed: false
      });
      
      // Filter out expired offers
      return allOffers.filter(offer => new Date(offer.expiry_date) > new Date());
    },
    enabled: !!userEmail,
    refetchInterval: 60000 // Refetch every minute
  });

  const redeemMutation = useMutation({
    mutationFn: async (offerId) => {
      await base44.entities.PersonalizedOffer.update(offerId, {
        is_redeemed: true,
        is_active: false,
        redeemed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personalized-offers"] });
      toast.success("Offer saved! Show this to the cashier when ordering.");
    }
  });

  if (isLoading || offers.length === 0) return null;

  const getTimeLeft = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const hoursLeft = Math.floor((expiry - now) / (1000 * 60 * 60));
    
    if (hoursLeft < 1) {
      const minutesLeft = Math.floor((expiry - now) / (1000 * 60));
      return `${minutesLeft}m left`;
    }
    return `${hoursLeft}h left`;
  };

  // Only show the first (most premium) offer
  const premiumOffer = offers[0];
  if (!premiumOffer) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Sparkles className="h-5 w-5 text-amber-500" />
        </motion.div>
        <h2 className="text-lg font-bold text-[#5C4A3A]">Handpicked for You</h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative overflow-hidden rounded-3xl bg-white border-2 border-[#E8DED8] shadow-lg"
      >
        {/* Subtle Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#F5EBE8] via-transparent to-transparent opacity-30" />
        
        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-bold text-[#5C4A3A] text-xl mb-2">{premiumOffer.title}</h3>
              <p className="text-[#8B7355] text-sm leading-relaxed mb-4">
                {premiumOffer.description}
              </p>
            </div>
          </div>

          {premiumOffer.product_name && (
            <div className="bg-gradient-to-r from-[#F5EBE8] to-[#EDE3DF] rounded-2xl p-4 mb-4">
              <p className="text-xs text-[#8B7355] mb-1 uppercase tracking-wide">Your Next Sip</p>
              <p className="font-bold text-[#5C4A3A] text-lg">{premiumOffer.product_name}</p>
              {premiumOffer.points_bonus > 0 && (
                <p className="text-amber-600 font-semibold text-sm mt-1">
                  Earn {premiumOffer.points_bonus} bonus points
                </p>
              )}
            </div>
          )}

          <Button
            onClick={() => redeemMutation.mutate(premiumOffer.id)}
            disabled={redeemMutation.isPending}
            className="w-full bg-[#8B7355] hover:bg-[#6B5744] text-white rounded-2xl h-12 font-medium"
          >
            I'll Try This
          </Button>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E8DED8]">
            <p className="text-xs text-[#C9B8A6] italic">
              {premiumOffer.ai_reasoning}
            </p>
            <div className="flex items-center gap-1 text-[#8B7355] text-xs font-medium">
              <Clock className="h-3 w-3" />
              {getTimeLeft(premiumOffer.expiry_date)}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}