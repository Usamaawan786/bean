import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function PointsAnimation({ startValue, endValue, onComplete }) {
  const [displayValue, setDisplayValue] = useState(startValue);

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = (endValue - startValue) / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep <= steps) {
        setDisplayValue(Math.floor(startValue + increment * currentStep));
      } else {
        setDisplayValue(endValue);
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [startValue, endValue, onComplete]);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className="bg-white rounded-3xl p-8 text-center shadow-2xl"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
          }}
          transition={{ 
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 0.5
          }}
          className="text-6xl mb-4"
        >
          🎉
        </motion.div>
        <h2 className="text-2xl font-bold text-[#5C4A3A] mb-2">Points Earned!</h2>
        <motion.div
          className="text-6xl font-bold text-[#8B7355]"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 0.5 }}
        >
          {displayValue}
        </motion.div>
        <p className="text-[#8B7355] mt-4">Adding points to your balance...</p>
      </motion.div>
    </motion.div>
  );
}