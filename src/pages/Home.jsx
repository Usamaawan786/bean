import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Coffee, Star, Gift, Users, Zap, ChevronRight, 
  TrendingUp, Award, Bell, Trophy, Sparkles, TrendingDown, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/dashboard/StatsCard";
import TierBadge from "@/components/dashboard/TierBadge";
import FlashDropCard from "@/components/flashdrop/FlashDropCard";
import ReferralCard from "@/components/referral/ReferralCard";
import RewardProgress from "@/components/dashboard/RewardProgress";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import PersonalizedOffers from "@/components/rewards/PersonalizedOffers";
import PullToRefresh from "@/components/shared/PullToRefresh";
import OnboardingNameModal from "@/components/shared/OnboardingNameModal";
import { useQueryClient } from "@tanstack/react-query";
import NotificationBell from "@/components/community/NotificationBell";
import PointsHistoryList from "@/components/dashboard/PointsHistoryList";

export default function Home() {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPointsHistory, setShowPointsHistory] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: activeDrops = [] } = useQuery({
    queryKey: ["active-drops"],
    queryFn: () => base44.entities.FlashDrop.filter({ status: "active" }),
    refetchInterval: 30000,
    enabled: authChecked && !!user,
    staleTime: 30000,
    initialData: []
  });

  const { data: upcomingDrops = [] } = useQuery({
    queryKey: ["upcoming-drops"],
    queryFn: () => base44.entities.FlashDrop.filter({ status: "upcoming" }),
    enabled: authChecked && !!user,
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

    const qrCode = `FD-${drop.id.slice(-5)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    await base44.entities.FlashDropClaim.create({
      drop_id: drop.id,
      drop_title: drop.title,
      user_email: user.email,
      qr_code: qrCode,
      is_redeemed: false,
      expires_at: drop.end_time,
    });

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

  const handleNameComplete = (name, phone) => {
    setShowNameModal(false);
    setUser(prev => ({ ...prev, display_name: name }));
    setCustomer(prev => prev ? { ...prev, display_name: name, phone } : prev);
  };

  const processReferralParam = async (customerId) => {
    const params = new URLSearchParams(window.location.search);
    // Check URL param first, then localStorage fallback (survives login redirect)
    const refParam = params.get('ref') || localStorage.getItem('pending_ref');
    if (!refParam) return;

    // Clear immediately to prevent duplicate attempts
    localStorage.removeItem('pending_ref');

    // Use backend function for reliable server-side processing
    const result = await base44.functions.invoke('processReferral', { refCode: refParam, customerId });
    if (result?.data?.success) {
      console.log('Referral captured successfully');
    }
  };

  const getGreeting = () => {
    const pkHour = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })).getHours();
    if (pkHour >= 5 && pkHour < 12) return "Good morning";
    if (pkHour >= 12 && pkHour < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["active-drops"] }),
      queryClient.invalidateQueries({ queryKey: ["upcoming-drops"] })
    ]);
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) return;

        const u = await base44.auth.me();
        if (!u || !u.email) return;
        setUser(u);
        if (!u.display_name) setShowNameModal(true);

        const customers = await base44.entities.Customer.filter({ created_by: u.email });
        if (customers.length > 0) {
          let cust = customers[0];
          setCustomer(cust);
          // If existing customer has no referrer yet but there's a ref param, capture it now
          if (!cust.referred_by) {
            await processReferralParam(cust.id);
          }
        } else {
          const refCode = u.email.split("@")[0].toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

          // Check if this user was on the waitlist (Founding Member)
          let isFM = false;
          let isEBA = false;
          let fmBonusPoints = 0;
          try {
            const waitlistMatches = await base44.entities.WaitlistSignup.filter({ email: u.email });
            if (waitlistMatches.length > 0) {
              isFM = true;
              fmBonusPoints = 50; // extra 50 on top of welcome 50

              // Check EBA: 5+ unique referrals using their referral_code
              const signupRecord = waitlistMatches[0];
              if (signupRecord.referral_code) {
                const allSignups = await base44.entities.WaitlistSignup.list();
                const referrals = allSignups.filter(s => s.referred_by === signupRecord.referral_code);
                const uniqueReferralEmails = [...new Set(referrals.map(r => r.email))];
                if (uniqueReferralEmails.length >= 5) {
                  isEBA = true;
                }
              }
            }
          } catch (e) {
            console.error('FM/EBA check failed:', e);
          }

          const startingPoints = 50 + fmBonusPoints;
          const newCustomer = await base44.entities.Customer.create({
            user_email: u.email,
            referral_code: refCode,
            points_balance: startingPoints,
            total_points_earned: startingPoints,
            tier: "Bronze",
            is_founding_member: isFM,
            is_eba: isEBA,
          });
          setCustomer(newCustomer);

          await processReferralParam(newCustomer.id);
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setAuthChecked(true);
      }
    };
    loadUser();
  }, []);

  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-secondary)]">
        <div className="w-8 h-8 border-4 border-[#D4C4B0] border-t-[#8B7355] rounded-full animate-spin" />
      </div>
    );
  }

  // Guest mode
  if (!user || !customer) {
    return (
      <div className="h-screen overflow-y-auto bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-secondary)]">
        <div className="relative bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white overflow-hidden">
          <div className="relative max-w-lg mx-auto px-5 pt-12 pb-16">
            <div className="flex items-center gap-2 text-[#D4C4B0] text-sm font-medium mb-3">
              <Coffee className="h-4 w-4" />
              <span>Bean Rewards</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Welcome to Bean! ☕</h1>
            <p className="text-[#E8DED8] text-base">Premium coffee, rewards & community</p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-5 pt-6 pb-24 space-y-5">
          <Link to={createPageUrl("Shop")}>
            <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="rounded-2xl bg-gradient-to-br from-[#F5EBE8] to-[#EDE3DF] p-4">
                <Coffee className="h-7 w-7 text-[#8B7355]" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#5C4A3A] text-lg">Browse the Shop</h3>
                <p className="text-xs text-[#8B7355] mt-1">Coffee beans, equipment & more</p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#C9B8A6]" />
            </div>
          </Link>

          <Link to={createPageUrl("Community")}>
            <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="rounded-2xl bg-gradient-to-br from-[#EDE3DF] to-[#E0D5CE] p-4">
                <Users className="h-7 w-7 text-[#8B7355]" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#5C4A3A] text-lg">Community</h3>
                <p className="text-xs text-[#8B7355] mt-1">See what coffee lovers are sharing</p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#C9B8A6]" />
            </div>
          </Link>

          <a href="https://maps.app.goo.gl/f4dy4jkQ9cbrFq7VA?g_st=ic" target="_blank" rel="noopener noreferrer">
            <div className="relative bg-gradient-to-br from-[#5C4A3A] to-[#8B7355] rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-white/20 p-4 flex-shrink-0">
                  <MapPin className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white text-lg leading-tight">Find Us on Maps</h3>
                    <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide uppercase whitespace-nowrap flex-shrink-0">
                      🕐 Soon
                    </span>
                  </div>
                  <p className="text-xs text-[#E8DED8]">Get directions to our store</p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/70 flex-shrink-0" />
              </div>
            </div>
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
    {showNameModal && <OnboardingNameModal onComplete={handleNameComplete} userEmail={user?.email} customerId={customer?.id} />}
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="h-screen overflow-y-auto bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-secondary)]">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] dark:from-[#2a241e] dark:via-[#201b16] dark:to-[#1a1612] text-white overflow-hidden select-none">
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-30">
            <motion.div
              animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-20 left-10 w-64 h-64 bg-[#D4C4B0]/40 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ x: [0, -80, 0], y: [0, -40, 0] }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-10 right-10 w-96 h-96 bg-[#C9B8A6]/30 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
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
            {/* Notification Bell — top-right inside hero */}
            <div className="absolute top-4 right-5">
              <NotificationBell userEmail={user.email} />
            </div>

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
                {getGreeting()}, {(user?.display_name || user?.full_name)?.split(" ")[0]}! ☕
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

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 gap-4 mt-8"
            >
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 shadow-xl cursor-pointer"
                onClick={() => setShowPointsHistory(true)}
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
                <div className="text-xs text-amber-200/70 mt-1">Tap to see history</div>
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

          {/* Founding Member Bonus Banner — visible for 24h after first login */}
          {customer?.is_founding_member && (() => {
            const firstSeenKey = `fm_banner_first_seen_${user?.email}`;
            const firstSeen = localStorage.getItem(firstSeenKey);
            if (!firstSeen) localStorage.setItem(firstSeenKey, Date.now().toString());
            const elapsed = Date.now() - parseInt(localStorage.getItem(firstSeenKey) || Date.now());
            const show = elapsed < 24 * 60 * 60 * 1000;
            if (!show) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="bg-gradient-to-br from-[#5C4A3A] to-[#8B7355] rounded-3xl p-5 shadow-lg relative overflow-hidden"
              >
                <div className="absolute -top-4 -right-4 text-6xl opacity-10 select-none">☕</div>
                <div className="absolute -bottom-4 -left-4 text-6xl opacity-5 select-none">☕</div>
                <div className="relative flex items-start gap-3">
                  <div className="text-2xl">⭐</div>
                  <div>
                    <p className="font-bold text-white text-base leading-tight">Founding Member Bonus!</p>
                    <p className="text-[#E8DED8] text-sm mt-1 leading-relaxed">
                      You received <span className="font-bold text-white">+50 extra points</span> on top of the welcome 50 — that's <span className="font-bold text-white">100 pts</span> to kick things off, just for being one of our earliest supporters.
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <PersonalizedOffers userEmail={user.email} />
            </motion.div>
          )}

          {customer && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.75 }}
            >
              <TierBadge tier={customer.tier || "Bronze"} totalPoints={customer.total_points_earned || 0} />
            </motion.div>
          )}

          {customer && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <RewardProgress currentPoints={customer.points_balance || 0} />
            </motion.div>
          )}

          {allDrops.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
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
                <Link to={createPageUrl("FlashDrops")} className="text-[#8B7355] text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
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
                    <FlashDropCard drop={drop} currentUserEmail={user?.email} onClaim={handleClaimDrop} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {customer?.referral_code && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              <ReferralCard referralCode={customer.referral_code} referralCount={customer.referral_count || 0} />
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
                  <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="rounded-2xl bg-gradient-to-br from-[#F5EBE8] to-[#EDE3DF] p-4 w-fit mb-4 shadow-sm">
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
                  <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.3 }} className="rounded-2xl bg-gradient-to-br from-[#EDE3DF] to-[#E0D5CE] p-4 w-fit mb-4 shadow-sm">
                    <Users className="h-7 w-7 text-[#8B7355]" />
                  </motion.div>
                  <h3 className="font-bold text-[#5C4A3A] text-lg">Community</h3>
                  <p className="text-xs text-[#8B7355] mt-1.5 leading-relaxed">Join the conversation</p>
                </div>
              </motion.div>
            </Link>
          </motion.div>

          {/* Find Us on Maps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.25 }}
          >
            <a href="https://maps.app.goo.gl/f4dy4jkQ9cbrFq7VA?g_st=ic" target="_blank" rel="noopener noreferrer">
              <motion.div
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
                className="relative bg-gradient-to-br from-[#5C4A3A] to-[#8B7355] rounded-3xl p-6 shadow-lg overflow-hidden"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white/20 p-4 flex-shrink-0">
                    <MapPin className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white text-lg leading-tight">Find Us on Maps</h3>
                      <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide uppercase whitespace-nowrap flex-shrink-0">
                        🕐 Soon
                      </span>
                    </div>
                    <p className="text-xs text-[#E8DED8]">Get directions to our store</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/70 flex-shrink-0" />
                </div>
              </motion.div>
            </a>
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
    </PullToRefresh>

    {/* Points History Modal */}
    <AnimatePresence>
      {showPointsHistory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setShowPointsHistory(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="bg-white w-full max-w-lg rounded-t-3xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8DED8]">
              <div>
                <h2 className="text-xl font-bold text-[#5C4A3A]">Points History</h2>
                <p className="text-sm text-[#8B7355]">Total balance: <span className="font-bold text-[#5C4A3A]">{customer?.points_balance || 0} pts</span></p>
              </div>
              <button
                onClick={() => setShowPointsHistory(false)}
                className="w-9 h-9 rounded-full bg-[#F5EBE8] flex items-center justify-center text-[#8B7355] hover:bg-[#EDE3DF] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 px-6 py-3 bg-[#F9F6F3]">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#5C4A3A]">{customer?.total_points_earned || 0}</div>
                <div className="text-xs text-[#8B7355]">Total Earned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#5C4A3A]">{(customer?.total_points_earned || 0) - (customer?.points_balance || 0)}</div>
                <div className="text-xs text-[#8B7355]">Total Spent</div>
              </div>
            </div>

            {/* Activity list */}
            <div className="flex-1 overflow-y-auto">
              <PointsHistoryList userEmail={user?.email} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}