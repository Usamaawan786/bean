import { motion } from "framer-motion";
import { Crown, Star, Award, Medal } from "lucide-react";

const tierConfig = {
  Bronze: {
    icon: Medal,
    gradient: "from-[#C9B8A6] to-[#A89684]",
    bg: "bg-[#F5EBE8]",
    text: "text-[#8B7355]",
    next: "Silver",
    pointsToNext: 500
  },
  Silver: {
    icon: Award,
    gradient: "from-[#B8AFA4] to-[#9A8F84]",
    bg: "bg-[#EDE8E3]",
    text: "text-[#6B5744]",
    next: "Gold",
    pointsToNext: 1500
  },
  Gold: {
    icon: Star,
    gradient: "from-[#D4C4B0] to-[#C9B8A6]",
    bg: "bg-[#F8F6F4]",
    text: "text-[#8B7355]",
    next: "Platinum",
    pointsToNext: 3000
  },
  Platinum: {
    icon: Crown,
    gradient: "from-[#8B7355] to-[#6B5744]",
    bg: "bg-[#EDE3DF]",
    text: "text-[#5C4A3A]",
    next: null,
    pointsToNext: null
  }
};

export default function TierBadge({ tier = "Bronze", totalPoints = 0 }) {
  const config = tierConfig[tier];
  const Icon = config.icon;
  
  const progress = config.next 
    ? Math.min((totalPoints / config.pointsToNext) * 100, 100)
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl bg-white border border-[#E8DED8] p-6 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className={`rounded-2xl bg-gradient-to-br ${config.gradient} p-4 shadow-lg`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${config.text}`}>{tier}</span>
            <span className="text-xs text-[#C9B8A6]">Member</span>
          </div>
          {config.next && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-[#8B7355] mb-1">
                <span>{totalPoints} pts</span>
                <span>{config.pointsToNext} pts to {config.next}</span>
              </div>
              <div className="h-2 rounded-full bg-[#F5EBE8] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full bg-gradient-to-r ${config.gradient}`}
                />
              </div>
            </div>
          )}
          {!config.next && (
            <p className="text-xs text-[#8B7355] mt-1">You've reached the highest tier! ✨</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}