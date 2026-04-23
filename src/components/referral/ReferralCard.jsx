import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Users, Gift, Check } from "lucide-react";

export default function ReferralCard({ referralCode, referralCount = 0 }) {
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  
  const referralLink = `https://bean.base44.app?ref=${referralCode}`;
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(referralLink);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-gradient-to-br from-[#8B7355] to-[#6B5744] p-6 text-white shadow-xl relative"
    >
      {/* iOS-style "Copied" pill */}
      <AnimatePresence>
        {shareCopied && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#1c1c1e]/90 text-white text-sm font-medium px-5 py-2 rounded-full shadow-xl backdrop-blur-sm pointer-events-none"
          >
            Link Copied
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Refer Friends, Earn Points
          </h3>
          <p className="text-[#E8DED8] text-sm mt-1">
            Earn 25 points when your friend spends PKR 2,000+
          </p>
        </div>
        <div className="text-right">
        <div className="text-3xl font-bold">{referralCount}</div>
        <div className="text-xs text-[#E8DED8]">referrals</div>
        </div>
      </div>
      
      <div className="mt-5 bg-white/10 backdrop-blur rounded-2xl p-4">
        <div className="text-xs text-[#E8DED8] mb-2">Your referral link</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-white/10 px-3 py-2.5 rounded-xl text-xs font-mono truncate text-[#E8DED8]">
            {referralLink}
          </code>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="hover:bg-white/20 text-white shrink-0"
          >
            {shareCopied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-1.5 text-[#E8DED8]">
          <Users className="h-4 w-4" />
          <span>Friend joins</span>
        </div>
        <span className="text-[#D4C4B0]">→</span>
        <div className="flex items-center gap-1.5 text-[#E8DED8]">
          <span>spends 2k PKR</span>
        </div>
        <span className="text-[#D4C4B0]">→</span>
        <div className="flex items-center gap-1.5 text-white font-semibold">
          <Gift className="h-4 w-4" />
          <span>+25 pts each</span>
        </div>
      </div>
      <p className="text-center text-[#D4C4B0]/60 text-xs mt-3">Points unlock once your friend's total spend reaches PKR 2,000</p>
    </motion.div>
  );
}