import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Gift, Users, Copy, Check, Share2, Trophy, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Referral() {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const customers = await base44.entities.Customer.filter({ created_by: u.email });
      if (customers.length > 0) {
        setCustomer(customers[0]);
      } else {
        // Create new customer with referral code if not exists
        const refCode = u.email.split("@")[0].toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
        const newCustomer = await base44.entities.Customer.create({
          referral_code: refCode,
          points_balance: 50,
          total_points_earned: 50,
          tier: "Bronze"
        });
        setCustomer(newCustomer);
      }

      // Check for referral code in URL
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');
      
      if (refCode && customers.length === 0) {
        // This is a new user with a referral code
        const referrers = await base44.entities.Customer.filter({ referral_code: refCode });
        if (referrers.length > 0) {
          const referrer = referrers[0];
          
          // Update new customer with referrer info
          await base44.entities.Customer.update(customers[0].id, {
            referred_by: referrer.created_by
          });
          
          // Award points to referrer
          await base44.entities.Customer.update(referrer.id, {
            points_balance: referrer.points_balance + 100,
            total_points_earned: referrer.total_points_earned + 100,
            referral_count: (referrer.referral_count || 0) + 1
          });

          // Log activity for referrer
          await base44.entities.Activity.create({
            user_email: referrer.created_by,
            action_type: "referral",
            description: `Friend joined using your code`,
            points_amount: 100,
            metadata: { referred_email: u.email }
          });
          
          toast.success("Referral bonus applied! 🎉");
        }
      }
    };
    loadUser();
  }, []);

  // Get customers referred by this user
  const { data: referredCustomers = [] } = useQuery({
    queryKey: ["referred-customers", user?.email],
    queryFn: () => base44.entities.Customer.filter({ referred_by: user?.email }),
    enabled: !!user?.email
  });

  const referralLink = customer?.referral_code 
    ? `${window.location.origin}?ref=${customer.referral_code}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Join BrewCrew!",
        text: `Join me on BrewCrew and get free coffee! Use my code: ${customer?.referral_code}`,
        url: referralLink
      });
    } else {
      handleCopy();
    }
  };

  const milestones = [
    { count: 5, reward: "Free Latte", earned: (customer?.referral_count || 0) >= 5 },
    { count: 10, reward: "Gold Status", earned: (customer?.referral_count || 0) >= 10 },
    { count: 25, reward: "Merch Pack", earned: (customer?.referral_count || 0) >= 25 },
    { count: 50, reward: "VIP Status", earned: (customer?.referral_count || 0) >= 50 }
  ];

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-lg mx-auto px-5 pt-6 pb-10">
          <Link 
            to={createPageUrl("Home")}
            className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/20 p-3">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Refer & Earn</h1>
              <p className="text-[#E8DED8] text-sm">Share the love, get rewards</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold">{customer?.referral_count || 0}</div>
              <div className="text-xs text-[#E8DED8] mt-1">Friends Referred</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold">{(customer?.referral_count || 0) * 100}</div>
              <div className="text-xs text-[#E8DED8] mt-1">Points Earned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 -mt-4 pb-24 space-y-6">
        {/* Share Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-lg"
        >
          <h3 className="font-semibold text-[#5C4A3A] mb-4">Your Referral Code</h3>
          
          <div className="bg-[#F5EBE8] rounded-2xl p-4 mb-4">
            <code className="text-2xl font-bold text-[#5C4A3A] tracking-wider block text-center">
              {customer?.referral_code || "Loading..."}
            </code>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-1 rounded-xl"
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              onClick={handleShare}
              className="flex-1 rounded-xl bg-[#8B7355] hover:bg-[#6B5744]"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </motion.div>

        {/* How It Works */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-6">
          <h3 className="font-semibold text-[#5C4A3A] mb-4">How It Works</h3>
          <div className="space-y-4">
            {[
              { step: 1, text: "Share your unique code with friends" },
              { step: 2, text: "They sign up using your code" },
              { step: 3, text: "You both get 100 bonus points!" }
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F5EBE8] flex items-center justify-center font-bold text-[#8B7355]">
                  {item.step}
                </div>
                <span className="text-[#6B5744]">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-[#C9B8A6]" />
            <h3 className="font-semibold text-[#5C4A3A]">Milestones</h3>
          </div>
          <div className="space-y-3">
            {milestones.map(milestone => (
              <div 
                key={milestone.count}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  milestone.earned ? "bg-[#EDE8E3] border border-[#D4C4B0]" : "bg-[#F8F6F4]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    milestone.earned ? "bg-[#8B7355] text-white" : "bg-[#E8DED8] text-[#C9B8A6]"
                  }`}>
                    {milestone.earned ? <Check className="h-5 w-5" /> : milestone.count}
                  </div>
                  <div>
                    <div className="font-medium text-[#5C4A3A]">{milestone.count} Referrals</div>
                    <div className="text-xs text-[#8B7355]">{milestone.reward}</div>
                  </div>
                </div>
                {milestone.earned && (
                  <span className="text-xs font-medium text-[#8B7355] bg-[#F5EBE8] px-2 py-1 rounded-full">
                    Unlocked!
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Referred Friends */}
        {referredCustomers.length > 0 && (
          <div className="bg-white rounded-3xl border border-[#E8DED8] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-[#8B7355]" />
              <h3 className="font-semibold text-[#5C4A3A]">Your Referrals</h3>
            </div>
            <div className="space-y-3">
              {referredCustomers.map(c => (
                <div 
                  key={c.id}
                  className="flex items-center justify-between py-2 border-b border-[#F5EBE8] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F5EBE8] flex items-center justify-center text-[#8B7355] font-semibold">
                      {c.created_by?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#5C4A3A]">{c.created_by}</div>
                      <div className="text-xs text-[#C9B8A6]">
                        Joined {c.created_date && format(new Date(c.created_date), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-[#8B7355]">+100 pts</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}