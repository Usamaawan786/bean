import { motion } from "framer-motion";
import { Clock, Percent } from "lucide-react";

export default function SoftLaunchBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="relative overflow-hidden rounded-3xl shadow-lg bg-gradient-to-br from-[#3d2b12] via-[#5C4A3A] to-[#8B7355] p-6 text-white"
    >
      <div className="absolute -top-6 -right-6 w-32 h-32 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-amber-300/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
            Soft Launch
          </span>
          <span className="text-xs text-amber-200/80 font-medium">This Weekend</span>
        </div>

        <h3 className="text-xl font-bold mb-2 leading-tight">We're opening our doors! ☕</h3>

        <div className="flex items-center gap-2 text-sm text-[#E8DED8] mb-3">
          <Clock className="h-4 w-4 text-amber-300 flex-shrink-0" />
          <span>7 PM, Friday 10th July → Sunday 12th July</span>
        </div>

        <div className="flex items-start gap-2 bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/15">
          <Percent className="h-5 w-5 text-amber-300 flex-shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            <span className="font-bold text-white">Club members get 10% off</span> their first three orders during launch weekend.
          </p>
        </div>
      </div>
    </motion.div>
  );
}