import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Coffee, Star, Gift, Users, Zap, ChevronRight, 
  TrendingUp, Award, Bell, Trophy, Sparkles, TrendingDown, Loader2
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import TierBadge from "@/components/dashboard/TierBadge";
import FlashDropCard from "@/components/flashdrop/FlashDropCard";
import ReferralCard from "@/components/referral/ReferralCard";
import RewardProgress from "@/components/dashboard/RewardProgress";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import PersonalizedOffers from "@/components/rewards/PersonalizedOffers";

export default function Home() {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const { data: activeDrops = [] } = useQuery({
    queryKey: ["active-drops"],
    queryFn: () => base44.entities.FlashDrop.filter({ status: "active" }),
    refetchInterval: 30000,
    enabled: !!user && !!customer && authChecked,
    staleTime: 30000,
    initialData: []
  });

  const { data: upcomingDrops = [] } = useQuery({
    queryKey: ["upcoming-drops"],
    queryFn: () => base44.entities.FlashDrop.filter({ status: "upcoming" }),
    enabled: !!user && !!customer && authChecked,
    staleTime: 60000,
    initialData: []
  });

  const handleClaimDrop = async (drop) => {
    if (!user) return;
    
    const newClaimedBy = [...(drop.claimed_by || []), user.email];
    await base44.entities.FlashDrop.update(drop.id, {
      claimed_by: newClaimedBy,
      items_remaining: Math.max(0, (drop.items_remaining || drop.total_items) - 1)
    });
    
    // Award points
    if (customer) {
      await base44.entities.Customer.update(customer.id, {
        points_balance: customer.points_balance + 25,
        total_points_earned: customer.total_points_earned + 25
      });
      setCustomer(prev => ({
        ...prev,
        points_balance: prev.points_balance + 25,
        total_points_earned: prev.total_points_earned + 25
      }));

      // Log activity
      await base44.entities.Activity.create({
        user_email: user.email,
        action_type: "flash_drop_claimed",
        description: `Claimed ${drop.title}`,
        points_amount: 25,
        metadata: { drop_id: drop.id }
      });
    }
  };

  const allDrops = [...activeDrops, ...upcomingDrops];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Try to get user first - this will throw if not authenticated
        const u = await base44.auth.me();
        setUser(u);
        setAuthChecked(true);
        
        // Load or create customer profile in parallel
        const customers = await base44.entities.Customer.filter({ created_by: u.email });
        if (customers.length > 0) {
          setCustomer(customers[0]);
        } else {
          // Create new customer with referral code
          const refCode = u.email.split("@")[0].toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
          const newCustomer = await base44.entities.Customer.create({
            referral_code: refCode,
            points_balance: 50,
            total_points_earned: 50,
            tier: "Bronze"
          });
          setCustomer(newCustomer);
        }
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Authentication failed:', error);
        setIsCheckingAuth(false);
        setAuthChecked(true);
        // Use Base44's built-in redirect method
        window.location.href = 'https://app.base44.com/login';
      }
    };
    loadUser();
  }, []);

  if (isCheckingAuth || !authChecked) {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF]">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-30">
          <motion.div
            animate={{ 
              x: [0, 100, 0],
              y: [0, 50, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-20 left-10 w-64 h-64 bg-[#D4C4B0]/40 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              x: [0, -80, 0],
              y: [0, -40, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-10 right-10 w-96 h-96 bg-[#C9B8A6]/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl"
          />
        </div>

        {/* Coffee Bean Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-20">☕</div>
          <div className="absolute top-32 right-16">☕</div>
          <div className="absolute bottom-20 left-32">☕</div>
          <div className="absolute bottom-40 right-24">☕</div>
        </div>
        
        <div className="relative max-w-lg mx-auto px-5 pt-12 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 text-[#D4C4B0] text-sm font-medium mb-3"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Coffee className="h-4 w-4" />
              </motion.div>
              <span>Bean Rewards</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold mb-2"
            >
              {getGreeting()}, {user?.full_name?.split(" ")[0]}! ☕
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[#E8DED8] text-base"
            >
              Your daily dose of rewards awaits
            </motion.p>
          </motion.div>
          
          {/* Enhanced Quick Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-4 mt-8"
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 shadow-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <Star className="h-5 w-5 text-amber-300" />
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7, type: "spring" }}
                  className="text-xs bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full"
                >
                  Active
                </motion.span>
              </div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="text-3xl font-bold mb-1"
              >
                {customer?.points_balance || 0}
              </motion.div>
              <div className="text-sm text-[#E8DED8]">Points Balance</div>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 shadow-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <Gift className="h-5 w-5 text-green-300" />
                <Sparkles className="h-4 w-4 text-green-200" />
              </div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, type: "spring" }}
                className="text-3xl font-bold mb-1"
              >
                {customer?.cups_redeemed || 0}
              </motion.div>
              <div className="text-sm text-[#E8DED8]">Cups Redeemed</div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Branding Logo - Overlapping Hero */}
      <div className="relative z-10 flex justify-center -mt-12">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="bg-white rounded-full p-4 shadow-2xl border-4 border-white"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D4C4B0] via-[#C9B8A6] to-[#B5A593] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-br from-amber-200/30 to-transparent"
            />
            <Coffee className="h-8 w-8 text-[#5C4A3A] relative z-10" />
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-5 pt-6 pb-24 space-y-6">
        {/* Personalized AI Offers - Premium First */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <PersonalizedOffers userEmail={user.email} />
          </motion.div>
        )}

        {/* Tier Badge */}
        {customer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.75 }}
          >
            <TierBadge 
              tier={customer.tier || "Bronze"} 
              totalPoints={customer.total_points_earned || 0} 
            />
          </motion.div>
        )}

        {/* Reward Progress */}
        {customer && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <RewardProgress currentPoints={customer.points_balance || 0} />
          </motion.div>
        )}

        {/* Flash Drops Alert */}
        {allDrops.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Zap className="h-5 w-5 text-amber-500" />
                </motion.div>
                <h2 className="text-lg font-bold text-[#5C4A3A]">Flash Drops</h2>
                {activeDrops.length > 0 && (
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-lg"
                  >
                    LIVE
                  </motion.span>
                )}
              </div>
              <Link 
                to={createPageUrl("FlashDrops")}
                className="text-[#8B7355] text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
              >
                See all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {allDrops.slice(0, 2).map((drop, index) => (
                <motion.div
                  key={drop.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + index * 0.1 }}
                >
                  <FlashDropCard
                    drop={drop}
                    currentUserEmail={user?.email}
                    onClaim={handleClaimDrop}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Referral Card */}
        {customer?.referral_code && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            <ReferralCard 
              referralCode={customer.referral_code}
              referralCount={customer.referral_count || 0}
            />
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="grid grid-cols-2 gap-4"
        >
          <Link to={createPageUrl("Rewards")}>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-lg hover:shadow-xl transition-shadow group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#F5EBE8] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <motion.div 
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="rounded-2xl bg-gradient-to-br from-[#F5EBE8] to-[#EDE3DF] p-4 w-fit mb-4 shadow-sm"
                >
                  <Gift className="h-7 w-7 text-[#8B7355]" />
                </motion.div>
                <h3 className="font-bold text-[#5C4A3A] text-lg">Rewards</h3>
                <p className="text-xs text-[#8B7355] mt-1.5 leading-relaxed">Redeem your points</p>
              </div>
            </motion.div>
          </Link>
          
          <Link to={createPageUrl("Community")}>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-lg hover:shadow-xl transition-shadow group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#EDE3DF] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl bg-gradient-to-br from-[#EDE3DF] to-[#E0D5CE] p-4 w-fit mb-4 shadow-sm"
                >
                  <Users className="h-7 w-7 text-[#8B7355]" />
                </motion.div>
                <h3 className="font-bold text-[#5C4A3A] text-lg">Community</h3>
                <p className="text-xs text-[#8B7355] mt-1.5 leading-relaxed">Join the conversation</p>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Activity Feed */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
          >
            <ActivityFeed userEmail={user.email} limit={5} />
          </motion.div>
        )}
      </div>
    </div>
  );
}