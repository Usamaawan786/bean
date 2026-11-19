import { useEffect } from "react";
import { motion } from "framer-motion";
import { Coffee, Sparkles } from "lucide-react";

export default function PostRewardCelebration({ points = 5, balance, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-5"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative w-full max-w-xs rounded-3xl bg-gradient-to-b from-white to-[#F5F1ED] p-7 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="absolute text-[#C9A227]"
            style={{ left: `${12 + i * 18}%`, top: "18%" }}
            initial={{ opacity: 0, y: 10, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], y: [-2, -34, -58], scale: [0.4, 1, 0.6] }}
            transition={{ duration: 1.6, delay: 0.25 + i * 0.12, repeat: 1, repeatDelay: 0.4 }}
          >
            <Sparkles className="h-4 w-4" />
          </motion.span>
        ))}

        <motion.div
          animate={{ rotate: [-6, 6, -6] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] shadow-lg"
        >
          <Coffee className="h-10 w-10 text-[#F5EBE8]" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7355]"
        >
          You earned
        </motion.p>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }}
          className="my-1 text-5xl font-bold text-[#5C4A3A]"
        >
          +{points}
        </motion.div>

        <p className="text-lg font-semibold text-[#5C4A3A]">free points</p>
        <p className="mt-2 text-sm text-[#8B7355] leading-relaxed">
          Thanks for sharing with the community. One post earns points every 24 hours.
        </p>

        {balance != null && (
          <div className="mt-4 rounded-2xl bg-white/80 border border-[#E8DED8] px-4 py-2">
            <span className="text-xs text-[#8B7355]">New balance </span>
            <span className="text-sm font-bold text-[#5C4A3A]">{balance} pts</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-[#8B7355] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6B5744]"
        >
          Nice!
        </button>
      </motion.div>
    </motion.div>
  );
}