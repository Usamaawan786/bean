import { motion } from "framer-motion";
import { Crown, Star, Award, Medal } from "lucide-react";

const tierConfig = {
  Bronze: {
    icon: Medal,
    gradient: "from-amber-600 to-amber-800",
    bg: "bg-amber-100",
    text: "text-amber-800",
    next: "Silver",
    pointsToNext: 500
  },
  Silver: {
    icon: Award,
    gradient: "from-slate-400 to-slate-600",
    bg: "bg-slate-100",
    text: "text-slate-700",
    next: "Gold",
    pointsToNext: 1500
  },
  Gold: {
    icon: Star,
    gradient: "from-yellow-400 to-amber-500",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    next: "Platinum",
    pointsToNext: 3000
  },
  Platinum: {
    icon: Crown,
    gradient: "from-violet-500 to-purple-700",
    bg: "bg-violet-50",
    text: "text-violet-700",
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
      className="rounded-3xl bg-white border border-stone-200 p-6 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className={`rounded-2xl bg-gradient-to-br ${config.gradient} p-4 shadow-lg`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${config.text}`}>{tier}</span>
            <span className="text-xs text-stone-400">Member</span>
          </div>
          {config.next && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-stone-500 mb-1">
                <span>{totalPoints} pts</span>
                <span>{config.pointsToNext} pts to {config.next}</span>
              </div>
              <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
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
            <p className="text-xs text-stone-500 mt-1">You've reached the highest tier! ✨</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}