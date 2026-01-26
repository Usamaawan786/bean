import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function CoffeeCupAnimation({ 
  pointsEarned, 
  currentPoints, 
  pointsNeeded = 100,
  onComplete 
}) {
  const [progress, setProgress] = useState(0);
  const [isPouring, setIsPouring] = useState(false);

  useEffect(() => {
    // Calculate initial and final progress
    const initialProgress = ((currentPoints - pointsEarned) / pointsNeeded) * 100;
    const finalProgress = Math.min((currentPoints / pointsNeeded) * 100, 100);
    
    setProgress(initialProgress);
    
    // Start pouring animation
    setTimeout(() => {
      setIsPouring(true);
      setProgress(finalProgress);
    }, 300);

    // Complete animation
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [currentPoints, pointsEarned, pointsNeeded, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Pouring coffee pot */}
      <motion.div
        initial={{ y: -100, opacity: 0, rotate: 0 }}
        animate={isPouring ? { 
          y: -40, 
          opacity: 1, 
          rotate: 45,
          x: 20
        } : { y: -100, opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          {/* Coffee pot */}
          <path
            d="M15 15 L15 35 L35 35 L35 15 L30 10 L20 10 Z"
            fill="#8B7355"
            stroke="#6B5744"
            strokeWidth="2"
          />
          {/* Spout */}
          <path
            d="M35 25 L42 28 L42 32 L35 30 Z"
            fill="#8B7355"
            stroke="#6B5744"
            strokeWidth="2"
          />
          {/* Handle */}
          <path
            d="M15 20 Q10 20 10 25 Q10 30 15 30"
            fill="none"
            stroke="#6B5744"
            strokeWidth="2"
          />
        </svg>
      </motion.div>

      {/* Coffee stream */}
      {isPouring && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 60, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="w-1.5 bg-gradient-to-b from-[#8B7355] to-[#6B5744] rounded-full"
          style={{ marginTop: -10, marginBottom: -10 }}
        />
      )}

      {/* Coffee cup */}
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 120 120" className="relative z-0">
          {/* Cup body */}
          <path
            d="M30 40 L25 90 Q25 95 30 95 L90 95 Q95 95 95 90 L90 40 Z"
            fill="white"
            stroke="#8B7355"
            strokeWidth="3"
          />
          
          {/* Handle */}
          <path
            d="M95 50 Q105 50 105 60 Q105 70 95 70"
            fill="none"
            stroke="#8B7355"
            strokeWidth="3"
          />

          {/* Coffee fill - clipped to cup shape */}
          <defs>
            <clipPath id="cupClip">
              <path d="M30 40 L25 90 Q25 95 30 95 L90 95 Q95 95 95 90 L90 40 Z" />
            </clipPath>
          </defs>

          {/* Animated coffee level */}
          <motion.rect
            x="25"
            y="40"
            width="70"
            height="55"
            fill="url(#coffeeGradient)"
            clipPath="url(#cupClip)"
            initial={{ y: 95 }}
            animate={{ y: 95 - (progress * 0.55) }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
          />

          {/* Coffee gradient */}
          <defs>
            <linearGradient id="coffeeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6B5744" />
              <stop offset="50%" stopColor="#8B7355" />
              <stop offset="100%" stopColor="#5C4A3A" />
            </linearGradient>
          </defs>

          {/* Steam animation */}
          {progress > 10 && (
            <>
              <motion.path
                d="M45 35 Q45 25 50 25 Q55 25 55 35"
                stroke="#C9B8A6"
                strokeWidth="2"
                fill="none"
                initial={{ opacity: 0, y: 5 }}
                animate={{ 
                  opacity: [0, 0.6, 0],
                  y: [5, -10, -15]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  delay: 1
                }}
              />
              <motion.path
                d="M55 35 Q55 25 60 25 Q65 25 65 35"
                stroke="#C9B8A6"
                strokeWidth="2"
                fill="none"
                initial={{ opacity: 0, y: 5 }}
                animate={{ 
                  opacity: [0, 0.6, 0],
                  y: [5, -10, -15]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  delay: 1.3
                }}
              />
              <motion.path
                d="M65 35 Q65 25 70 25 Q75 25 75 35"
                stroke="#C9B8A6"
                strokeWidth="2"
                fill="none"
                initial={{ opacity: 0, y: 5 }}
                animate={{ 
                  opacity: [0, 0.6, 0],
                  y: [5, -10, -15]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  delay: 1.6
                }}
              />
            </>
          )}
        </svg>

        {/* Progress text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, delay: 1.5 }}
              className="text-2xl font-bold text-white drop-shadow-lg"
              style={{ 
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                WebkitTextStroke: '1px #5C4A3A'
              }}
            >
              +{pointsEarned}
            </motion.div>
            <div className="text-xs text-[#5C4A3A] font-semibold mt-1">
              {currentPoints} / {pointsNeeded}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Points earned text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="text-center mt-4"
      >
        <div className="text-lg font-semibold text-[#5C4A3A]">
          {pointsEarned} points earned! ☕
        </div>
        <div className="text-sm text-[#8B7355] mt-1">
          {pointsNeeded - currentPoints > 0 
            ? `${pointsNeeded - currentPoints} more points until free cup!`
            : "Free cup ready to claim! 🎉"
          }
        </div>
      </motion.div>
    </div>
  );
}