import { motion } from "framer-motion";
import { Crown, Star, Award, Gift, Zap, Coffee, Percent, ChevronRight } from "lucide-react";

// Points system: ~1 point per PKR 10 spent (so 100 PKR = 10 pts)
// Tiers based on total points earned
const tierData = {
  Bronze: {
    icon: Award,
    color: "#CD7F32",
    bg: "bg-amber-50",
    border: "border-amber-200",
    gradient: "from-[#CD7F32] to-[#A0522D]",
    label: "Bronze",
    minPoints: 0,
    nextTier: "Silver",
    pointsNeeded: 500,
    spendNeeded: 5000, // PKR
    benefits: [
      { icon: Star, text: "1 point per PKR 10 spent" },
      { icon: Coffee, text: "Free coffee at 200 points (~PKR 2,000 spend)" },
      { icon: Gift, text: "Birthday surprise drink" },
    ],
  },
  Silver: {
    icon: Star,
    color: "#9CA3AF",
    bg: "bg-slate-50",
    border: "border-slate-200",
    gradient: "from-[#9CA3AF] to-[#6B7280]",
    label: "Silver",
    minPoints: 500,
    nextTier: "Gold",
    pointsNeeded: 1500,
    spendNeeded: 15000,
    benefits: [
      { icon: Star, text: "1.2 points per PKR 10 spent" },
      { icon: Coffee, text: "Free coffee at 180 points (~PKR 1,500 spend)" },
      { icon: Gift, text: "Birthday reward + 1 surprise gift/month" },
      { icon: Zap, text: "Early access to Flash Drops" },
      { icon: Percent, text: "5% off every in-store order" },
    ],
  },
  Gold: {
    icon: Crown,
    color: "#D97706",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    gradient: "from-[#F59E0B] to-[#D97706]",
    label: "Gold",
    minPoints: 1500,
    nextTier: "Platinum",
    pointsNeeded: 3000,
    spendNeeded: 30000,
    benefits: [
      { icon: Star, text: "1.5 points per PKR 10 spent" },
      { icon: Coffee, text: "Free coffee at 150 points (~PKR 1,000 spend)" },
      { icon: Gift, text: "Premium birthday reward" },
      { icon: Zap, text: "Priority Flash Drop access" },
      { icon: Percent, text: "10% off every in-store order" },
      { icon: Crown, text: "Exclusive Gold member events" },
    ],
  },
  Platinum: {
    icon: Zap,
    color: "#7C3AED",
    bg: "bg-purple-50",
    border: "border-purple-200",
    gradient: "from-[#7C3AED] to-[#5B21B6]",
    label: "Platinum",
    minPoints: 3000,
    nextTier: null,
    pointsNeeded: null,
    spendNeeded: null,
    benefits: [
      { icon: Star, text: "2 points per PKR 10 spent" },
      { icon: Coffee, text: "Free coffee at 120 points (~PKR 600 spend)" },
      { icon: Gift, text: "VIP birthday experience + monthly reward" },
      { icon: Zap, text: "First pick on all Flash Drops" },
      { icon: Percent, text: "15% off every in-store order" },
      { icon: Crown, text: "Exclusive Platinum events & tastings" },
    ],
  },
};

const TIER_ORDER = ["Bronze", "Silver", "Gold", "Platinum"];

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
  return { Bronze: 0, Silver: 0.05, Gold: 0.10, Platinum: 0.15 }[tier] || 0;
}

// Single tier benefits card (used in rewards tab)
export default function TierBenefits({ tier }) {
  const data = getTierData(tier);
  const Icon = data.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${data.border} ${data.bg} p-5`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`rounded-xl bg-gradient-to-br ${data.gradient} p-2.5`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-[#5C4A3A]">{tier} Benefits</h3>
          <p className="text-xs text-[#8B7355]">Your current perks</p>
        </div>
      </div>
      <div className="space-y-2">
        {data.benefits.map((benefit, idx) => {
          const BenefitIcon = benefit.icon;
          return (
            <div key={idx} className="flex items-center gap-2.5">
              <BenefitIcon className="h-3.5 w-3.5 text-[#8B7355] flex-shrink-0" />
              <span className="text-sm text-[#5C4A3A]">{benefit.text}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Full all-tiers overview panel (used in "Tiers" tab)
export function AllTiersPanel({ currentTier, totalPoints }) {
  const currentIdx = TIER_ORDER.indexOf(currentTier);

  return (
    <div className="space-y-3">
      {TIER_ORDER.map((tierName, idx) => {
        const data = tierData[tierName];
        const Icon = data.icon;
        const isCurrent = tierName === currentTier;
        const isUnlocked = idx <= currentIdx;
        const isNext = idx === currentIdx + 1;

        return (
          <motion.div
            key={tierName}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07 }}
            className={`rounded-2xl border bg-white p-5 transition-all ${
              isCurrent ? `${data.border} ring-2 ring-offset-1` : "border-[#E8DED8]"
            }`}
            style={isCurrent ? { ringColor: data.color } : {}}
          >
            {/* Tier header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`rounded-xl p-2.5 bg-gradient-to-br ${data.gradient} ${!isUnlocked ? "opacity-40" : ""}`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-base ${isUnlocked ? "text-[#5C4A3A]" : "text-[#C9B8A6]"}`}>
                    {tierName}
                  </span>
                  {isCurrent && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: data.color }}
                    >
                      YOU ARE HERE
                    </span>
                  )}
                  {isNext && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5EBE8] text-[#8B7355]">
                      NEXT TIER
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#C9B8A6]">
                  {data.minPoints === 0
                    ? "Starting tier"
                    : `From ${data.minPoints.toLocaleString()} points (≈ PKR ${(data.minPoints * 10).toLocaleString()} spend)`}
                </span>
              </div>
            </div>

            {/* Progress bar for current tier */}
            {isCurrent && data.nextTier && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-[#8B7355] mb-1">
                  <span>{totalPoints} pts</span>
                  <span>{data.pointsNeeded} pts for {data.nextTier}</span>
                </div>
                <div className="h-2 bg-[#F5EBE8] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((totalPoints / data.pointsNeeded) * 100, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full bg-gradient-to-r ${data.gradient}`}
                  />
                </div>
                <p className="text-xs text-[#8B7355] mt-1">
                  {data.pointsNeeded - totalPoints} pts more · spend ≈ PKR {((data.pointsNeeded - totalPoints) * 10).toLocaleString()}
                </p>
              </div>
            )}

            {/* Benefits list — collapsed for locked tiers, shown for current/unlocked */}
            <div className={`space-y-1.5 ${!isUnlocked && !isNext ? "opacity-40" : ""}`}>
              {data.benefits.map((benefit, bIdx) => {
                const BenefitIcon = benefit.icon;
                return (
                  <div key={bIdx} className="flex items-center gap-2">
                    <BenefitIcon className="h-3.5 w-3.5 text-[#8B7355] flex-shrink-0" />
                    <span className="text-xs text-[#5C4A3A]">{benefit.text}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      <p className="text-center text-xs text-[#C9B8A6] pt-1">
        Points rate: PKR 10 spent = 1 point · Multipliers apply per tier
      </p>
    </div>
  );
}