import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Coffee, Star, Gift, Users, Zap, ChevronRight, 
  TrendingUp, Award, Bell 
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import TierBadge from "@/components/dashboard/TierBadge";
import FlashDropCard from "@/components/flashdrop/FlashDropCard";
import ReferralCard from "@/components/referral/ReferralCard";

export default function Home() {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
      
      // Load or create customer profile
      const customers = await base44.entities.Customer.filter({ created_by: u.email });
      if (customers.length > 0) {
        setCustomer(customers[0]);
      } else {
        // Create new customer with referral code
        const refCode = u.email.split("@")[0].toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
        const newCustomer = await base44.entities.Customer.create({
          referral_code: refCode,
          points_balance: 50, // Welcome bonus
          total_points_earned: 50,
          tier: "Bronze"
        });
        setCustomer(newCustomer);
      }
    };
    loadUser();
  }, []);

  const { data: activeDrops = [] } = useQuery({
    queryKey: ["active-drops"],
    queryFn: () => base44.entities.FlashDrop.filter({ status: "active" }),
    refetchInterval: 30000
  });

  const { data: upcomingDrops = [] } = useQuery({
    queryKey: ["upcoming-drops"],
    queryFn: () => base44.entities.FlashDrop.filter({ status: "upcoming" })
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
    }
  };

  const allDrops = [...activeDrops, ...upcomingDrops];

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#D4C4B0]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#C9B8A6]/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-lg mx-auto px-5 pt-10 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 text-[#D4C4B0] text-sm font-medium mb-2">
              <Coffee className="h-4 w-4" />
              <span>Bean Rewards</span>
            </div>
            <h1 className="text-3xl font-bold">
              Welcome back, {user?.full_name?.split(" ")[0] || "Coffee Lover"}! ☕
            </h1>
            <p className="text-[#E8DED8] mt-2">
              Your daily dose of rewards awaits
            </p>
          </motion.div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <StatsCard 
              icon={Star} 
              label="Points" 
              value={customer?.points_balance || 0}
              color="brown"
            />
            <StatsCard 
              icon={Gift} 
              label="Cups Redeemed" 
              value={customer?.cups_redeemed || 0}
              color="green"
            />
          </div>
        </div>
      </div>

      {/* Branding Logo - Overlapping Hero */}
      <div className="relative z-10 flex justify-center -mt-16">
        <div className="bg-white rounded-full p-4 shadow-lg border-4 border-[#F5F1ED]">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#C9B8A6] flex items-center justify-center">
            <Coffee className="h-10 w-10 text-[#5C4A3A]" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-5 pt-4 pb-24 space-y-6">
        {/* Tier Badge */}
        {customer && (
          <TierBadge 
            tier={customer.tier || "Bronze"} 
            totalPoints={customer.total_points_earned || 0} 
          />
        )}

        {/* Flash Drops Alert */}
        {allDrops.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#8B7355]" />
                <h2 className="text-lg font-bold text-[#5C4A3A]">Flash Drops</h2>
                {activeDrops.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <Link 
                to={createPageUrl("FlashDrops")}
                className="text-[#8B7355] text-sm font-medium flex items-center gap-1"
              >
                See all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {allDrops.slice(0, 2).map(drop => (
                <FlashDropCard
                  key={drop.id}
                  drop={drop}
                  currentUserEmail={user?.email}
                  onClaim={handleClaimDrop}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Referral Card */}
        {customer?.referral_code && (
          <ReferralCard 
            referralCode={customer.referral_code}
            referralCount={customer.referral_count || 0}
          />
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to={createPageUrl("Rewards")}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-2xl border border-[#E8DED8] p-5 shadow-sm"
            >
              <div className="rounded-xl bg-[#F5EBE8] p-3 w-fit">
                <Gift className="h-6 w-6 text-[#8B7355]" />
              </div>
              <h3 className="font-semibold text-[#5C4A3A] mt-3">Rewards</h3>
              <p className="text-xs text-[#8B7355] mt-1">Redeem your points</p>
            </motion.div>
          </Link>
          
          <Link to={createPageUrl("Community")}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-2xl border border-[#E8DED8] p-5 shadow-sm"
            >
              <div className="rounded-xl bg-[#EDE3DF] p-3 w-fit">
                <Users className="h-6 w-6 text-[#8B7355]" />
              </div>
              <h3 className="font-semibold text-[#5C4A3A] mt-3">Community</h3>
              <p className="text-xs text-[#8B7355] mt-1">Join the conversation</p>
            </motion.div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-[#8B7355]" />
            <h3 className="font-semibold text-[#5C4A3A]">Your Progress</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[#F5EBE8]">
              <span className="text-sm text-[#8B7355]">Total points earned</span>
              <span className="font-semibold text-[#5C4A3A]">{customer?.total_points_earned || 0} pts</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#F5EBE8]">
              <span className="text-sm text-[#8B7355]">Friends referred</span>
              <span className="font-semibold text-[#5C4A3A]">{customer?.referral_count || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#8B7355]">Current tier</span>
              <span className="font-semibold text-[#8B7355]">{customer?.tier || "Bronze"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}