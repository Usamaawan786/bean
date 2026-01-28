import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Star, Gift, Users, Zap, TrendingUp, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const activityIcons = {
  points_earned: Star,
  reward_redeemed: Gift,
  referral: Users,
  flash_drop_claimed: Zap,
  tier_upgraded: Award
};

const activityColors = {
  points_earned: "text-[#8B7355] bg-[#F5EBE8]",
  reward_redeemed: "text-green-600 bg-green-50",
  referral: "text-blue-600 bg-blue-50",
  flash_drop_claimed: "text-orange-600 bg-orange-50",
  tier_upgraded: "text-purple-600 bg-purple-50"
};

export default function ActivityFeed({ userEmail, limit = 5 }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', userEmail],
    queryFn: () => base44.entities.Activity.filter({ user_email: userEmail }, '-created_date', limit),
    enabled: !!userEmail
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-[#E8DED8] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-[#8B7355]" />
          <h3 className="font-semibold text-[#5C4A3A]">Recent Activity</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-[#F5EBE8]" />
              <div className="flex-1">
                <div className="h-4 bg-[#F5EBE8] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#F5EBE8] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-[#E8DED8] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-[#8B7355]" />
          <h3 className="font-semibold text-[#5C4A3A]">Recent Activity</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-[#8B7355] text-sm">No activity yet. Start earning points!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-[#E8DED8] p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-[#8B7355]" />
        <h3 className="font-semibold text-[#5C4A3A]">Recent Activity</h3>
      </div>
      <div className="space-y-3">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.action_type] || Star;
          const colorClass = activityColors[activity.action_type] || activityColors.points_earned;
          
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-3 pb-3 border-b border-[#F5EBE8] last:border-0 last:pb-0"
            >
              <div className={`rounded-full p-2 ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#5C4A3A] font-medium">
                  {activity.description}
                </p>
                {activity.points_amount && (
                  <p className="text-xs text-[#8B7355] font-semibold mt-0.5">
                    +{activity.points_amount} points
                  </p>
                )}
                <p className="text-xs text-[#C9B8A6] mt-1">
                  {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}