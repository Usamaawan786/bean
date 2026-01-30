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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Sparkles className="h-5 w-5 text-amber-500" />
        </motion.div>
        <h2 className="text-lg font-bold text-[#5C4A3A]">Just for You</h2>
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
          AI Powered
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {offers.map((offer, index) => {
          const Icon = offerIcons[offer.offer_type] || Gift;
          const gradient = offerColors[offer.offer_type] || offerColors.recommendation;

          return (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.1 }}
              className="relative overflow-hidden rounded-3xl bg-white border-2 border-[#E8DED8] shadow-lg"
            >
              {/* Gradient Background */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full -mr-16 -mt-16`} />
              
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradient}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#5C4A3A] text-lg">{offer.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {offer.discount_percentage > 0 && (
                          <span className="text-green-600 font-bold text-sm">
                            {offer.discount_percentage}% OFF
                          </span>
                        )}
                        {offer.points_bonus > 0 && (
                          <span className="text-amber-600 font-bold text-sm">
                            +{offer.points_bonus} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-[#8B7355] text-xs">
                    <Clock className="h-3 w-3" />
                    {getTimeLeft(offer.expiry_date)}
                  </div>
                </div>

                <p className="text-[#8B7355] text-sm mb-4 leading-relaxed">
                  {offer.description}
                </p>

                {offer.product_name && (
                  <div className="bg-[#F5EBE8] rounded-xl p-3 mb-4">
                    <p className="text-xs text-[#8B7355] mb-1">Recommended Product</p>
                    <p className="font-semibold text-[#5C4A3A]">{offer.product_name}</p>
                  </div>
                )}

                <Button
                  onClick={() => redeemMutation.mutate(offer.id)}
                  disabled={redeemMutation.isPending}
                  className={`w-full bg-gradient-to-r ${gradient} hover:opacity-90 transition-opacity`}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Claim Offer
                </Button>

                {offer.ai_reasoning && (
                  <p className="text-xs text-[#C9B8A6] mt-3 italic">
                    💡 {offer.ai_reasoning}
                  </p>
                )}
              </div>

              {/* Decorative corner badge */}
              <div className="absolute top-4 right-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 bg-amber-400 rounded-full"
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}