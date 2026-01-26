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
      if (customers.length > 0) setCustomer(customers[0]);
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
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-purple-700 text-white">
        <div className="max-w-lg mx-auto px-5 pt-6 pb-10">
          <Link 
            to={createPageUrl("Home")}
            className="inline-flex items-center gap-1 text-violet-200 text-sm mb-4 hover:text-white transition-colors"
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
              <p className="text-violet-200 text-sm">Share the love, get rewards</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold">{customer?.referral_count || 0}</div>
              <div className="text-xs text-violet-200 mt-1">Friends Referred</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold">{(customer?.referral_count || 0) * 100}</div>
              <div className="text-xs text-violet-200 mt-1">Points Earned</div>
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
          className="bg-white rounded-3xl border border-stone-200 p-6 shadow-lg"
        >
          <h3 className="font-semibold text-stone-800 mb-4">Your Referral Code</h3>
          
          <div className="bg-stone-50 rounded-2xl p-4 mb-4">
            <code className="text-2xl font-bold text-violet-700 tracking-wider block text-center">
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
              className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </motion.div>

        {/* How It Works */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6">
          <h3 className="font-semibold text-stone-800 mb-4">How It Works</h3>
          <div className="space-y-4">
            {[
              { step: 1, text: "Share your unique code with friends" },
              { step: 2, text: "They sign up using your code" },
              { step: 3, text: "You both get 100 bonus points!" }
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center font-bold text-violet-600">
                  {item.step}
                </div>
                <span className="text-stone-600">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-stone-800">Milestones</h3>
          </div>
          <div className="space-y-3">
            {milestones.map(milestone => (
              <div 
                key={milestone.count}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  milestone.earned ? "bg-emerald-50 border border-emerald-200" : "bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    milestone.earned ? "bg-emerald-500 text-white" : "bg-stone-200 text-stone-500"
                  }`}>
                    {milestone.earned ? <Check className="h-5 w-5" /> : milestone.count}
                  </div>
                  <div>
                    <div className="font-medium text-stone-800">{milestone.count} Referrals</div>
                    <div className="text-xs text-stone-500">{milestone.reward}</div>
                  </div>
                </div>
                {milestone.earned && (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                    Unlocked!
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Referred Friends */}
        {referredCustomers.length > 0 && (
          <div className="bg-white rounded-3xl border border-stone-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-violet-500" />
              <h3 className="font-semibold text-stone-800">Your Referrals</h3>
            </div>
            <div className="space-y-3">
              {referredCustomers.map(c => (
                <div 
                  key={c.id}
                  className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold">
                      {c.created_by?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-stone-700">{c.created_by}</div>
                      <div className="text-xs text-stone-400">
                        Joined {c.created_date && format(new Date(c.created_date), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-emerald-600">+100 pts</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}