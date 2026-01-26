import { motion } from "framer-motion";
import { Crown, Zap, Star, Award, Truck, Gift, Sparkles, ShoppingBag } from "lucide-react";

const tierData = {
  Bronze: {
    icon: Award,
    gradient: "from-[#CD7F32] to-[#A0522D]",
    benefits: [
      { icon: Star, text: "Earn 10 points per $1 spent" },
      { icon: Gift, text: "Free cup every 100 points" },
      { icon: Sparkles, text: "Birthday reward" }
    ],
    nextTier: "Silver",
    pointsNeeded: 500
  },
  Silver: {
    icon: Star,
    gradient: "from-[#C0C0C0] to-[#A8A8A8]",
    benefits: [
      { icon: Star, text: "Earn 12 points per $1 spent" },
      { icon: Gift, text: "Free cup every 90 points" },
      { icon: Sparkles, text: "Birthday reward + surprise gift" },
      { icon: Zap, text: "Early access to Flash Drops" },
      { icon: ShoppingBag, text: "5% off all shop purchases" }
    ],
    nextTier: "Gold",
    pointsNeeded: 1500
  },
  Gold: {
    icon: Crown,
    gradient: "from-[#FFD700] to-[#FFA500]",
    benefits: [
      { icon: Star, text: "Earn 15 points per $1 spent" },
      { icon: Gift, text: "Free cup every 80 points" },
      { icon: Sparkles, text: "Premium birthday rewards" },
      { icon: Zap, text: "Exclusive Flash Drop access" },
      { icon: ShoppingBag, text: "10% off all shop purchases" },
      { icon: Truck, text: "Free shipping on all orders" }
    ],
    nextTier: "Platinum",
    pointsNeeded: 3000
  },
  Platinum: {
    icon: Sparkles,
    gradient: "from-[#E5E4E2] to-[#B9B9B9]",
    benefits: [
      { icon: Star, text: "Earn 20 points per $1 spent" },
      { icon: Gift, text: "Free cup every 70 points" },
      { icon: Sparkles, text: "VIP birthday experience" },
      { icon: Zap, text: "First priority on all drops" },
      { icon: ShoppingBag, text: "15% off all shop purchases" },
      { icon: Truck, text: "Free express shipping" },
      { icon: Crown, text: "Exclusive member events" }
    ],
    nextTier: null,
    pointsNeeded: null
  }
};

export function getTierData(tierName) {
  return tierData[tierName] || tierData.Bronze;
}

export function calculateTier(totalPoints) {
  if (totalPoints >= 3000) return "Platinum";
  if (totalPoints >= 1500) return "Gold";
  if (totalPoints >= 500) return "Silver";
  return "Bronze";
}

export function getTierDiscount(tier) {
  const discounts = {
    Bronze: 0,
    Silver: 0.05,
    Gold: 0.10,
    Platinum: 0.15
  };
  return discounts[tier] || 0;
}

export default function TierBenefits({ tier }) {
  const data = getTierData(tier);
  const Icon = data.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-[#E8DED8] p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className={`rounded-2xl bg-gradient-to-br ${data.gradient} p-3`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#5C4A3A]">{tier} Tier Benefits</h3>
          <p className="text-xs text-[#8B7355]">Your exclusive perks</p>
        </div>
      </div>

      <div className="space-y-3">
        {data.benefits.map((benefit, idx) => {
          const BenefitIcon = benefit.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#F5EBE8]"
            >
              <div className="rounded-lg bg-white p-2">
                <BenefitIcon className="h-4 w-4 text-[#8B7355]" />
              </div>
              <span className="text-sm text-[#5C4A3A]">{benefit.text}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}