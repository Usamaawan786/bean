import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PointsAnimation({ startValue, endValue, onClose }) {
  const [displayValue, setDisplayValue] = useState(startValue);
  const pointsEarned = endValue - startValue;

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
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [startValue, endValue]);

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
        className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-[#F5EBE8] rounded-full transition-colors"
        >
          <X className="h-5 w-5 text-[#8B7355]" />
        </button>
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
        <h2 className="text-xl font-bold text-[#5C4A3A] mb-6">Points Earned!</h2>
        
        <div className="bg-[#F5EBE8] rounded-2xl p-6 mb-4">
          <div className="text-sm text-[#8B7355] mb-2">You Earned</div>
          <motion.div
            className="text-5xl font-bold text-[#8B7355] mb-4"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 0.5 }}
          >
            +{pointsEarned}
          </motion.div>
          
          <div className="border-t border-[#E8DED8] pt-4">
            <div className="text-sm text-[#8B7355] mb-2">Total Balance</div>
            <div className="text-3xl font-bold text-[#5C4A3A]">
              {displayValue}
            </div>
          </div>
        </div>
        
        <Button
          onClick={onClose}
          className="mt-4 bg-[#8B7355] hover:bg-[#6B5744] rounded-xl w-full"
        >
          Got it!
        </Button>
      </motion.div>
    </motion.div>
  );
}