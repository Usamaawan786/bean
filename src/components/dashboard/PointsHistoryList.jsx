import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Star, Gift, Users, Zap, TrendingUp, ShoppingBag } from "lucide-react";

const ACTION_CONFIG = {
  points_earned: { icon: Star, color: "text-amber-500", bg: "bg-amber-50", label: "Points Earned" },
  reward_redeemed: { icon: Gift, color: "text-red-500", bg: "bg-red-50", label: "Reward Redeemed" },
  referral: { icon: Users, color: "text-blue-500", bg: "bg-blue-50", label: "Referral Bonus" },
  flash_drop_claimed: { icon: Zap, color: "text-orange-500", bg: "bg-orange-50", label: "Flash Drop" },
  tier_upgraded: { icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50", label: "Tier Upgrade" },
};

export default function PointsHistoryList({ userEmail }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["points-history", userEmail],
    queryFn: () => base44.entities.Activity.filter({ user_email: userEmail }, "-created_date", 50),
    enabled: !!userEmail,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-100" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-2 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <Star className="h-10 w-10 text-[#D4C4B0] mb-3" />
        <p className="text-[#8B7355] font-medium">No activity yet</p>
        <p className="text-sm text-[#C9B8A6] mt-1">Start earning points by scanning your bills!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#F5EBE8]">
      {activities.map((activity) => {
        const config = ACTION_CONFIG[activity.action_type] || ACTION_CONFIG.points_earned;
        const Icon = config.icon;
        const isEarned = activity.action_type !== "reward_redeemed";

        return (
          <div key={activity.id} className="flex items-center gap-3 px-6 py-4 hover:bg-[#F9F6F3] transition-colors">
            <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#5C4A3A] leading-snug truncate">{activity.description}</p>
              <p className="text-xs text-[#C9B8A6] mt-0.5">
                {activity.created_date ? formatDistanceToNow(new Date(activity.created_date), { addSuffix: true }) : ""}
              </p>
            </div>
            {activity.points_amount != null && (
              <div className={`text-sm font-bold flex-shrink-0 ${isEarned ? "text-green-600" : "text-red-500"}`}>
                {isEarned ? "+" : "-"}{activity.points_amount} pts
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}