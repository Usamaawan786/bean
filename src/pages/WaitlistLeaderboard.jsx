import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal, Award, Users, TrendingUp, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function WaitlistLeaderboard() {
  const [userRank, setUserRank] = useState(null);

  // Fetch all signups
  const { data: signups = [], isLoading } = useQuery({
    queryKey: ['waitlist-leaderboard'],
    queryFn: async () => {
      const all = await base44.asServiceRole.entities.WaitlistSignup.list();
      return all;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Calculate referral counts
  const leaderboard = signups
    .map(signup => {
      const referralCount = signups.filter(s => s.referred_by === signup.referral_code).length;
      return {
        ...signup,
        referralCount
      };
    })
    .filter(s => s.referralCount > 0)
    .sort((a, b) => b.referralCount - a.referralCount)
    .slice(0, 50); // Top 50

  useEffect(() => {
    // Try to find user's rank if they have a referral code in URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('ref');
    if (code) {
      const userIndex = leaderboard.findIndex(s => s.referral_code === code);
      if (userIndex !== -1) {
        setUserRank({
          rank: userIndex + 1,
          ...leaderboard[userIndex]
        });
      }
    }
  }, [leaderboard]);

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-[var(--text-tertiary)]">#{index + 1}</span>;
  };

  const getPrizeText = (index) => {
    if (index === 0) return "🎁 Free Coffee for 6 Months";
    if (index === 1) return "🎁 Free Coffee for 3 Months";
    if (index === 2) return "🎁 Free Coffee for 1 Month";
    if (index < 10) return "🎁 100 Bonus Points";
    return "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1ED] to-[#EBE5DF] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#8B7355] to-[#6B5744] text-white px-6 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-yellow-300" />
            <h1 className="text-3xl font-bold">Referral Champions</h1>
          </div>
          <p className="text-center text-white/90 text-sm">
            Invite friends to climb the leaderboard and win amazing prizes!
          </p>
        </motion.div>
      </div>

      {/* User's Rank Card (if found) */}
      {userRank && (
        <div className="max-w-4xl mx-auto px-6 -mt-6 mb-6">
          <Card className="bg-gradient-to-r from-[#8B7355]/10 to-[#6B5744]/10 border-[#8B7355]/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#8B7355] text-white font-bold text-lg">
                  #{userRank.rank}
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Your Rank</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {userRank.referralCount} referrals
                  </p>
                </div>
              </div>
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Prize Pool */}
      <div className="max-w-4xl mx-auto px-6 mb-8">
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 p-6">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            Prize Pool
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="font-semibold text-sm">1st Place</p>
              <p className="text-xs text-[var(--text-secondary)]">Free Coffee for 6 Months</p>
            </div>
            <div className="text-center">
              <Medal className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="font-semibold text-sm">2nd Place</p>
              <p className="text-xs text-[var(--text-secondary)]">Free Coffee for 3 Months</p>
            </div>
            <div className="text-center">
              <Award className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <p className="font-semibold text-sm">3rd Place</p>
              <p className="text-xs text-[var(--text-secondary)]">Free Coffee for 1 Month</p>
            </div>
          </div>
          <p className="text-xs text-center mt-4 text-[var(--text-tertiary)]">
            Top 10 also get 100 bonus points! 🎉
          </p>
        </Card>
      </div>

      {/* Leaderboard */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Referrers
          </h2>
          <Button
            size="sm"
            className="bg-[#8B7355] hover:bg-[#6B5744]"
            onClick={() => window.location.href = '/Waitlist'}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Join Waitlist
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            Loading leaderboard...
          </div>
        ) : leaderboard.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">
              Be the first to invite friends and top the leaderboard!
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((signup, index) => (
              <motion.div
                key={signup.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`p-4 ${index < 3 ? 'bg-gradient-to-r from-yellow-50/50 to-amber-50/50 border-yellow-200' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-12 h-12">
                        {getRankIcon(index)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {signup.full_name}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {signup.referralCount} {signup.referralCount === 1 ? 'referral' : 'referrals'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getPrizeText(index) && (
                        <p className="text-xs text-[var(--text-secondary)] font-medium">
                          {getPrizeText(index)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* How to Win */}
      <div className="max-w-4xl mx-auto px-6 mt-8 mb-12">
        <Card className="bg-[#8B7355]/5 border-[#8B7355]/20 p-6">
          <h3 className="font-bold text-lg mb-3 text-[var(--text-primary)]">
            How to Win
          </h3>
          <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li>1. Join the waitlist if you haven't already</li>
            <li>2. Share your unique referral link with friends</li>
            <li>3. Climb the leaderboard as more friends join</li>
            <li>4. Top referrers win amazing prizes when we launch!</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}