import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Loader2, RefreshCw } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 80], [0, 1]);
  const scale = useTransform(y, [0, 80], [0.5, 1]);
  const rotate = useTransform(y, [0, 80], [0, 180]);

  const handleDragEnd = async (event: any, info: PanInfo) => {
    if (info.offset.y > 80 && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    y.set(0);
  };

  return (
    <div className="relative">
      <motion.div
        className="absolute top-0 left-0 right-0 flex justify-center pt-4 z-10 pointer-events-none"
        style={{ opacity }}
      >
        <motion.div
          style={{ scale, rotate: isRefreshing ? 360 : rotate }}
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
          className="bg-white dark:bg-[var(--bg-card)] rounded-full p-2 shadow-lg border border-[#E8DED8] dark:border-[var(--border-light)]"
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 text-[var(--accent-primary)] animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5 text-[var(--accent-primary)]" />
          )}
        </motion.div>
      </motion.div>

      <motion.div
        drag="y"
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.3, bottom: 0 }}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}