import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Gift, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function RewardProgress({ currentPoints }) {
  const { data: rewards = [] } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => base44.entities.Reward.filter({ is_active: true }),
    initialData: []
  });

  // Find the next reward the user can work toward
  const nextReward = (rewards || [])
    .filter(r => r.points_required > currentPoints)
    .sort((a, b) => a.points_required - b.points_required)[0];

  if (!nextReward) return null;

  const progress = (currentPoints / nextReward.points_required) * 100;
  const pointsNeeded = nextReward.points_required - currentPoints;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] rounded-3xl p-6 mb-6 shadow-lg"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-[#F5EBE8] fill-[#F5EBE8]" />
            <h3 className="font-bold text-white text-lg">Almost There!</h3>
          </div>
          <p className="text-[#E8DED8] text-sm">Your next reward is so close</p>
        </div>
        <Gift className="h-8 w-8 text-[#F5EBE8]" />
      </div>

      {/* Reward Preview */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          {nextReward.image_url && (
            <img 
              src={nextReward.image_url} 
              alt={nextReward.name}
              className="w-16 h-16 rounded-xl object-cover"
            />
          )}
          <div className="flex-1">
            <h4 className="font-bold text-white">{nextReward.name}</h4>
            <p className="text-[#E8DED8] text-xs mt-0.5">{nextReward.points_required} points</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-3 bg-white/20" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#E8DED8]">
            <span className="font-bold text-white">{currentPoints}</span> / {nextReward.points_required} points
          </span>
          <span className="font-bold text-[#F5EBE8]">
            {pointsNeeded} more to go! 🎉
          </span>
        </div>
      </div>

      {/* Motivational Text */}
      <div className="mt-4 pt-4 border-t border-white/20">
        <p className="text-[#F5EBE8] text-xs text-center">
          ☕ Every PKR 100 = 1 point • Keep scanning receipts!
        </p>
      </div>
    </motion.div>
  );
}