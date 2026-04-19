import { motion } from "framer-motion";
import { 
  Coffee, Star, Gift, Zap, Megaphone, Sparkles, 
  ChevronRight, Heart, Trophy, Bell, Tag, Clock,
  Flame, Users, Snowflake, Sun, Moon, Crown
} from "lucide-react";

export const TEMPLATE_CATEGORIES = [
  "Flash Drop", "Loyalty", "Re-engagement", "Seasonal", 
  "VIP", "Product", "Milestone", "Challenge", "Promo", "Event"
];

export const TEMPLATES = [
  // Flash Drop
  { id: "flash_live", category: "Flash Drop", color: "from-amber-500 to-orange-600", icon: Zap, label: "⚡ Flash Drop Live", title: "⚡ Flash Drop is LIVE!", body: "Quick! A limited Flash Drop just went live. Claim your free reward before it runs out — only a few left! 🔥", deepLink: "/FlashDrops", audience: "all" },
  { id: "flash_ending", category: "Flash Drop", color: "from-red-500 to-rose-600", icon: Clock, label: "⏰ Flash Drop Ending", title: "⏰ Last chance — Flash Drop ending soon!", body: "The current Flash Drop expires in 30 minutes. Rush over before it's gone for good! 🏃", deepLink: "/FlashDrops", audience: "all" },
  { id: "flash_weekend", category: "Flash Drop", color: "from-orange-400 to-amber-500", icon: Flame, label: "🔥 Weekend Flash", title: "🔥 Weekend Flash Drop is HERE!", body: "Your weekend just got sweeter — a surprise Flash Drop is live at Bean right now. First come, first served!", deepLink: "/FlashDrops", audience: "all" },

  // Loyalty
  { id: "tier_up", category: "Loyalty", color: "from-yellow-400 to-amber-500", icon: Star, label: "⭐ Tier Upgrade", title: "You've levelled up! 🏆", body: "Congratulations — you've reached a new loyalty tier at Bean! Unlock exclusive perks and rewards in your profile.", deepLink: "/Rewards", audience: "all" },
  { id: "pts_milestone", category: "Loyalty", color: "from-amber-400 to-yellow-500", icon: Trophy, label: "🏅 Points Milestone", title: "Big milestone unlocked! 🎉", body: "You just hit a major points milestone at Bean. Check your profile to see what you've unlocked!", deepLink: "/UserProfile", audience: "all" },
  { id: "pts_expiry", category: "Loyalty", color: "from-orange-400 to-red-500", icon: Clock, label: "⚠️ Points Expiring", title: "Your Bean points expire soon ⚠️", body: "Don't let your hard-earned points go to waste! Redeem them before they expire — visit Bean today.", deepLink: "/Rewards", audience: "all" },
  { id: "double_pts", category: "Loyalty", color: "from-green-400 to-emerald-600", icon: Sparkles, label: "✨ Double Points Day", title: "Double Points TODAY only! ✨", body: "Today is a special Double Points day at Bean! Every purchase earns you 2× the reward points. Don't miss out! ☕", deepLink: "/Home", audience: "all" },

  // Re-engagement
  { id: "miss_you", category: "Re-engagement", color: "from-pink-500 to-rose-400", icon: Heart, label: "💌 We Miss You", title: "We miss you at Bean ☕", body: "It's been a while! Your reward points are waiting. Come back for a fresh cup and enjoy a special welcome-back bonus.", deepLink: "/Home", audience: "all" },
  { id: "dormant_offer", category: "Re-engagement", color: "from-purple-400 to-pink-500", icon: Gift, label: "🎁 Come Back Offer", title: "A surprise is waiting for you 🎁", body: "We've prepared a special offer just because we miss you. Open Bean to claim it — valid for 48 hours only!", deepLink: "/Rewards", audience: "all" },
  { id: "social_proof", category: "Re-engagement", color: "from-blue-400 to-indigo-500", icon: Users, label: "👥 What You're Missing", title: "Your coffee community is buzzing ☕", body: "While you were away, 200+ Bean members earned rewards, caught flash drops, and shared moments. Come rejoin the fun!", deepLink: "/Community", audience: "all" },

  // Seasonal
  { id: "summer", category: "Seasonal", color: "from-yellow-400 to-orange-400", icon: Sun, label: "☀️ Summer Vibes", title: "Beat the heat with Bean ☀️", body: "Summer is here — our cold brew menu is live! Refreshing, smooth, and worth every sip. Come chill with us today.", deepLink: "/Home", audience: "all" },
  { id: "winter", category: "Seasonal", color: "from-blue-400 to-sky-600", icon: Snowflake, label: "❄️ Winter Warmth", title: "Warm up with Bean this winter ❄️", body: "Cold outside? Perfect excuse for a hot cup from Bean. Our seasonal winter blends are here — come warm up!", deepLink: "/Home", audience: "all" },
  { id: "ramadan", category: "Seasonal", color: "from-emerald-500 to-teal-600", icon: Moon, label: "🌙 Ramadan Special", title: "Ramadan Mubarak from Bean 🌙", body: "Wishing you and your family a blessed Ramadan! Special Sehri & Iftar blends are available. Join us this holy month. ☕", deepLink: "/Home", audience: "all" },

  // VIP
  { id: "gold_exclusive", category: "VIP", color: "from-yellow-600 to-orange-500", icon: Crown, label: "👑 Gold Exclusive", title: "Exclusive offer for Gold members 👑", body: "As a valued Gold member, you've unlocked a special surprise. Open Bean now to see what we've prepared just for you!", deepLink: "/Rewards", audience: "tier_gold" },
  { id: "platinum_vip", category: "VIP", color: "from-slate-500 to-gray-700", icon: Crown, label: "💎 Platinum VIP", title: "Platinum VIP Access: Something special awaits 💎", body: "As one of Bean's most loyal members, you get first access to something very special. Open the app to discover your exclusive offer.", deepLink: "/Rewards", audience: "tier_platinum" },
  { id: "early_access", category: "VIP", color: "from-violet-500 to-purple-700", icon: Star, label: "🔓 Early Access", title: "Early access — just for you 🔓", body: "Before we announce it publicly, you get first access as a valued Bean member. Tap to see what's new!", deepLink: "/Home", audience: "tier_silver" },

  // Product
  { id: "new_arrival", category: "Product", color: "from-teal-500 to-emerald-600", icon: Sparkles, label: "✨ New Arrival", title: "Something new just dropped! ✨", body: "Fresh arrivals are now in the Bean store. Check out our latest blends and seasonal offerings — first come, first served!", deepLink: "/Shop", audience: "all" },
  { id: "cold_brew", category: "Product", color: "from-sky-400 to-blue-500", icon: Coffee, label: "🧊 Cold Brew Drop", title: "Cold Brew is back at Bean! 🧊", body: "Our signature slow-steeped Cold Brew is back and better than ever. Smooth, bold, and absolutely worth the hype. ☕", deepLink: "/Shop", audience: "all" },
  { id: "limited_edition", category: "Product", color: "from-rose-500 to-pink-600", icon: Tag, label: "🏷️ Limited Edition", title: "Limited Edition blend — available NOW 🏷️", body: "Our exclusive limited-edition blend just dropped in limited quantities. Once it's gone, it's gone. Get yours today!", deepLink: "/Shop", audience: "all" },

  // Milestone
  { id: "birthday", category: "Milestone", color: "from-pink-400 to-purple-500", icon: Gift, label: "🎂 Birthday Treat", title: "Happy Birthday from Bean! 🎂", body: "Wishing you the most wonderful birthday! We've got a special gift waiting for you in the app. Come celebrate with us! 🎉", deepLink: "/Rewards", audience: "all" },
  { id: "first_scan", category: "Milestone", color: "from-green-400 to-teal-500", icon: Star, label: "🌟 First Scan", title: "Welcome to Bean Rewards! 🌟", body: "You just earned your first Bean points — welcome to the club! Tap to see your balance and discover how to earn more.", deepLink: "/Home", audience: "all" },
  { id: "anniversary", category: "Milestone", color: "from-amber-500 to-orange-500", icon: Trophy, label: "🎊 Bean Anniversary", title: "Happy Bean-iversary! 🎊", body: "One year with Bean — you're officially one of our most loyal coffee lovers! Thank you. A special gift is waiting for you.", deepLink: "/UserProfile", audience: "all" },

  // Challenge
  { id: "weekly_challenge", category: "Challenge", color: "from-violet-500 to-indigo-600", icon: Flame, label: "🔥 Weekly Challenge", title: "Weekly Challenge is live! 🔥", body: "This week's Bean Challenge: Visit 3 times and earn 100 bonus points! Check your app to track your progress.", deepLink: "/Rewards", audience: "all" },
  { id: "streak", category: "Challenge", color: "from-orange-400 to-red-500", icon: Zap, label: "⚡ Streak Challenge", title: "Keep your streak alive! ⚡", body: "You're on a roll at Bean! Don't break your visit streak — come by today and keep those bonus points stacking! ☕", deepLink: "/Home", audience: "all" },

  // Promo
  { id: "weekend_special", category: "Promo", color: "from-[#8B7355] to-[#5C4A3A]", icon: Coffee, label: "☕ Weekend Special", title: "Weekend vibes at Bean ☕", body: "This weekend only — double points on every visit! Come enjoy your favourite brew and stack up those rewards. 🌟", deepLink: "/Home", audience: "all" },
  { id: "referral_bonus", category: "Promo", color: "from-green-500 to-emerald-600", icon: Users, label: "👥 Referral Bonus", title: "Invite friends, earn big rewards! 👥", body: "Share Bean with a friend and when they spend Rs. 2,000, you BOTH earn 25 bonus points! Share your link now.", deepLink: "/Home", audience: "all" },

  // Event
  { id: "launch", category: "Event", color: "from-purple-500 to-indigo-600", icon: Megaphone, label: "🚀 Launch Announcement", title: "BEAN is officially LIVE! ☕", body: "The wait is over — Bean Islamabad is now open! Come visit us today and earn your first reward points. See you soon! ☕🎉", deepLink: "/Home", audience: "all" },
  { id: "event_invite", category: "Event", color: "from-blue-500 to-violet-600", icon: Bell, label: "📅 Event Invite", title: "You're invited to a Bean event! 📅", body: "We're hosting a special coffee tasting event exclusively for Bean members. Limited spots — tap to RSVP before it fills up!", deepLink: "/Community", audience: "all" },
];

export default function TemplateLibrary({ onApply }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        {TEMPLATES.length} professional templates across {TEMPLATE_CATEGORIES.length} categories. Tap any to pre-fill the composer.
      </p>
      {TEMPLATE_CATEGORIES.map(category => {
        const group = TEMPLATES.filter(t => t.category === category);
        if (!group.length) return null;
        return (
          <div key={category}>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{category}</h3>
            <div className="space-y-2">
              {group.map(template => {
                const Icon = template.icon;
                return (
                  <motion.div
                    key={template.id}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-all group"
                    onClick={() => onApply(template)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-gray-800">{template.label}</span>
                          <span className="text-xs text-[#8B7355] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                            Use <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-600 mb-0.5">{template.title}</p>
                        <p className="text-xs text-gray-400 line-clamp-2">{template.body}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">→ {template.deepLink}</span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{template.audience.replace('tier_', '')}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}