import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Coffee, Zap, Users, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function FlashDropCard({ drop, currentUserEmail, onClaim }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);

  const hasClaimed = drop.claimed_by?.includes(currentUserEmail);
  const isActive = drop.status === "active";
  const isUpcoming = drop.status === "upcoming";
  const isEnded = drop.status === "ended" || drop.items_remaining <= 0;

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const target = isUpcoming ? new Date(drop.start_time) : new Date(drop.end_time);
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(isUpcoming ? "Starting now!" : "Ended");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor(diff % (1000 * 60 * 60) / (1000 * 60));
      const seconds = Math.floor(diff % (1000 * 60) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [drop, isUpcoming]);

  const handleClaim = async () => {
    setIsClaiming(true);
    await onClaim(drop);
    setIsClaiming(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative rounded-3xl overflow-hidden shadow-lg ${
      isActive ? "ring-2 ring-[#C9B8A6] ring-offset-2" : ""}`
      }>

      {isActive &&
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-r from-[#D4C4B0]/20 to-[#C9B8A6]/20 pointer-events-none" />

      }
      
      <div className="relative bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white p-6">
        {isActive &&
        <div className="bg-red-500 px-3 py-1 rounded-full absolute top-4 right-4 flex items-center gap-1.5">
            <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="h-2 w-2 rounded-full bg-white" />

            <span className="text-xs font-bold uppercase">Live</span>
          </div>
        }
        
        {isUpcoming &&
        <div className="absolute top-4 right-4 bg-[#C9B8A6] px-3 py-1 rounded-full">
            <span className="text-xs font-bold uppercase">Upcoming</span>
          </div>
        }
        
        <div className="my-4 flex items-start gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#D4C4B0] to-[#C9B8A6] p-3">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">{drop.title}</h3>
            <p className="text-[#E8DED8] text-sm mt-1">{drop.description}</p>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-[#E8DED8]">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{drop.location_name || drop.location}</span>
          </div>
          <div className="flex items-center gap-2 text-[#E8DED8]">
            <Coffee className="h-4 w-4" />
            <span className="text-sm">{drop.items_remaining || 0} / {drop.total_items} left</span>
          </div>
          <div className="flex items-center gap-2 text-[#E8DED8]">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              {isUpcoming ? "Starts in " : isActive ? "Ends in " : ""}
              {timeLeft}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[#E8DED8]">
            <Users className="h-4 w-4" />
            <span className="text-sm">{drop.claimed_by?.length || 0} claimed</span>
          </div>
        </div>
        
        <div className="mt-6">
          {hasClaimed ?
          <div className="flex items-center justify-center gap-2 bg-[#EDE8E3]/40 text-[#8B7355] py-3 rounded-xl">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">You've claimed this drop!</span>
            </div> :
          isEnded ?
          <Button disabled className="w-full rounded-xl bg-[#8B7355]/30 text-[#D4C4B0]">
              Drop Ended
            </Button> :
          isUpcoming ?
          <Button disabled className="w-full rounded-xl bg-[#8B7355]/30 text-[#E8DED8]">
              <Clock className="h-4 w-4 mr-2" />
              Starts {format(new Date(drop.start_time), "h:mm a")}
            </Button> :

          <Button
            onClick={handleClaim}
            disabled={isClaiming || drop.items_remaining <= 0}
            className="w-full rounded-xl bg-gradient-to-r from-[#D4C4B0] to-[#C9B8A6] hover:from-[#C9B8A6] hover:to-[#B8AFA4] text-[#5C4A3A] font-bold py-3">

              {isClaiming ? "Claiming..." : "Claim Your Free Coffee! ☕"}
            </Button>
          }
        </div>
      </div>
    </motion.div>);

}