import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export const BADGE_DEFINITIONS = {
  founding_member: {
    emoji: "🌟",
    label: "FM",
    title: "Founding Member",
    color: "bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900",
    description: "Founding Members were among the very first to join Bean — they were on the original waitlist before the doors even opened.",
    howToGet: "This badge was awarded exclusively to early waitlist members and cannot be earned retroactively.",
  },
  eba: {
    emoji: "⭐",
    label: "EBA",
    title: "Elite Bean Ambassador",
    color: "bg-gradient-to-r from-purple-500 to-indigo-500 text-white",
    description: "Elite Bean Ambassadors are our most passionate community advocates who have brought 5 or more coffee lovers to the Bean family.",
    howToGet: "Refer 5 or more friends who sign up and spend at least PKR 2,000 in-store.",
  },
  gold: {
    emoji: "🥇",
    label: "Gold",
    title: "Gold Member",
    color: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white",
    description: "Gold members have earned 500+ loyalty points through purchases and engagement.",
    howToGet: "Earn 500+ total loyalty points through in-store purchases.",
  },
  platinum: {
    emoji: "💎",
    label: "Platinum",
    title: "Platinum Member",
    color: "bg-gradient-to-r from-slate-400 to-slate-600 text-white",
    description: "Platinum members are our top-tier loyalists with 1,000+ lifetime points.",
    howToGet: "Earn 1,000+ total loyalty points.",
  },
  coffee_creator: {
    emoji: "✍️",
    label: "Creator",
    title: "Coffee Creator",
    color: "bg-gradient-to-r from-rose-400 to-pink-500 text-white",
    description: "Coffee Creators are active community contributors who regularly share content, reviews, and tips with the Bean community.",
    howToGet: "Share 10+ approved posts in the community.",
  },
};

export function getBadgesForCustomer(customer, postCount = 0) {
  const badges = [];
  if (!customer) return badges;
  if (customer.is_founding_member) badges.push("founding_member");
  if (customer.is_eba) badges.push("eba");
  if (customer.tier === "Platinum") badges.push("platinum");
  else if (customer.tier === "Gold") badges.push("gold");
  if (postCount >= 10) badges.push("coffee_creator");
  return badges;
}

export default function UserBadge({ badgeKey, size = "sm" }) {
  const [showModal, setShowModal] = useState(false);
  const def = BADGE_DEFINITIONS[badgeKey];
  if (!def) return null;

  const sizeClass = size === "sm"
    ? "text-xs px-1.5 py-0.5"
    : "text-sm px-2.5 py-1";

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
        className={`inline-flex items-center gap-1 rounded-full font-bold ${def.color} ${sizeClass} shadow-sm hover:opacity-90 transition-opacity`}
      >
        <span>{def.emoji}</span>
        <span>{def.label}</span>
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold text-base ${def.color} shadow`}>
                  <span className="text-xl">{def.emoji}</span>
                  <span>{def.title}</span>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full hover:bg-[#F5EBE8] text-[#8B7355]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[#5C4A3A] text-sm leading-relaxed mb-4">{def.description}</p>
              <div className="bg-[#F5EBE8] rounded-2xl p-4">
                <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1">How to earn</p>
                <p className="text-sm text-[#5C4A3A]">{def.howToGet}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}