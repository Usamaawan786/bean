import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

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
            Thank You
          </span>
          <span className="text-xs text-amber-200/80 font-medium">Soft Launch Recap</span>
        </div>

        <h3 className="text-xl font-bold mb-2 leading-tight">Thank you for a beautiful soft launch! ☕</h3>

        <p className="text-sm text-[#E8DED8] leading-relaxed mb-3">
          Our community showed up in full force — thank you for being part of our first chapter. We can't wait to do it all over again.
        </p>

        <div className="flex items-start gap-2 bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/15">
          <Sparkles className="h-5 w-5 text-amber-300 flex-shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            <span className="font-bold text-white">Stay tuned</span> — our grand opening is coming soon.
          </p>
        </div>
      </div>
    </motion.div>
  );
}