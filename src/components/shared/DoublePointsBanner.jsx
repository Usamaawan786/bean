import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";

const formatEnd = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });
};

// Shows while a points-multiplier campaign is live; disappears on its own
// once the campaign's end time passes.
export default function DoublePointsBanner() {
  const { data } = useQuery({
    queryKey: ["live-points-multiplier"],
    queryFn: async () => (await base44.functions.invoke("getLivePointsMultiplier", {})).data,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const multiplier = data?.multiplier || 1;
  const endsAt = data?.ends_at ? new Date(data.ends_at) : null;
  const isLive = multiplier > 1 && (!endsAt || endsAt > new Date());
  if (!isLive) return null;

  const endLabel = formatEnd(data.ends_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="relative bg-gradient-to-br from-[#5C4A3A] via-[#8B7355] to-[#B5A593] rounded-3xl p-5 shadow-lg overflow-hidden"
    >
      <div className="absolute -top-4 -right-4 text-6xl opacity-10 select-none">⚡</div>
      <div className="relative flex items-start gap-3">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="mt-0.5"
        >
          <Zap className="h-6 w-6 text-amber-300" />
        </motion.div>
        <div>
          <p className="font-bold text-white text-base leading-tight">
            Double Points Weekend!
          </p>
          <p className="text-[#E8DED8] text-sm mt-1 leading-relaxed">
            You earn <span className="font-bold text-white">{multiplier}× points</span> on every bill
            this weekend{endLabel ? ` — ends ${endLabel} PKT` : ""}.
          </p>
        </div>
      </div>
    </motion.div>
  );
}