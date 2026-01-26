import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Coffee, Gift, Star } from "lucide-react";

export default function RewardCard({ reward, userPoints, onRedeem, isRedeeming }) {
  const canRedeem = userPoints >= reward.points_required;
  
  const categoryIcons = {
    Drinks: Coffee,
    Food: Coffee,
    Merchandise: Gift,
    Experience: Star
  };
  
  const Icon = categoryIcons[reward.category] || Gift;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group rounded-3xl bg-white border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div className="aspect-[4/3] relative bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
        {reward.image_url ? (
          <img 
            src={reward.image_url} 
            alt={reward.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="h-16 w-16 text-amber-300" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-xs font-semibold text-amber-800 shadow-sm">
            {reward.category}
          </span>
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="font-semibold text-stone-800 text-lg">{reward.name}</h3>
        {reward.description && (
          <p className="text-sm text-stone-500 mt-1 line-clamp-2">{reward.description}</p>
        )}
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Star className="h-3 w-3 text-white fill-white" />
            </div>
            <span className="font-bold text-amber-800">{reward.points_required}</span>
            <span className="text-xs text-stone-400">pts</span>
          </div>
          
          <Button
            size="sm"
            onClick={() => onRedeem(reward)}
            disabled={!canRedeem || isRedeeming}
            className={`rounded-xl px-4 ${
              canRedeem 
                ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white" 
                : "bg-stone-100 text-stone-400 cursor-not-allowed"
            }`}
          >
            {canRedeem ? "Redeem" : "Need more pts"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}