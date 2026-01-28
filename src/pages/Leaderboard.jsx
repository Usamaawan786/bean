import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Star, Users, TrendingUp, Medal, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Leaderboard() {
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState("points"); // "points" or "referrals"

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
    };
    loadUser();
  }, []);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => base44.entities.Customer.list("-total_points_earned", 100)
  });

  const sortedCustomers = viewMode === "points"
    ? [...customers].sort((a, b) => (b.total_points_earned || 0) - (a.total_points_earned || 0))
    : [...customers].sort((a, b) => (b.referral_count || 0) - (a.referral_count || 0));

  const userRank = sortedCustomers.findIndex(c => c.created_by === user?.email) + 1;
  const userCustomer = sortedCustomers.find(c => c.created_by === user?.email);

  const podiumPositions = sortedCustomers.slice(0, 3);
  const restOfLeaderboard = sortedCustomers.slice(3, 20);

  const getPodiumColors = (index) => {
    if (index === 0) return "from-amber-400 to-yellow-500 text-white";
    if (index === 1) return "from-gray-300 to-gray-400 text-gray-800";
    if (index === 2) return "from-orange-400 to-amber-600 text-white";
  };

  const getPodiumHeight = (index) => {
    if (index === 0) return "h-32";
    if (index === 1) return "h-24";
    if (index === 2) return "h-20";
  };

  const getPodiumIcon = (index) => {
    if (index === 0) return <Crown className="h-8 w-8" />;
    if (index === 1) return <Medal className="h-7 w-7" />;
    if (index === 2) return <Medal className="h-6 w-6" />;
  };

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-lg mx-auto px-5 pt-6 pb-8">
          <Link 
            to={createPageUrl("Home")}
            className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-2xl bg-white/20 p-3">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Leaderboard</h1>
              <p className="text-[#E8DED8] text-sm">Top coffee enthusiasts</p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2 bg-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode("points")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                viewMode === "points" 
                  ? "bg-white text-[#8B7355]" 
                  : "text-white/80 hover:text-white"
              }`}
            >
              <Star className="h-4 w-4 inline mr-1" />
              Points
            </button>
            <button
              onClick={() => setViewMode("referrals")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                viewMode === "referrals" 
                  ? "bg-white text-[#8B7355]" 
                  : "text-white/80 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4 inline mr-1" />
              Referrals
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 py-6 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Your Rank */}
            {userCustomer && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#8B7355] to-[#6B5744] text-white rounded-3xl p-5 mb-6 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm text-[#E8DED8]">Your Rank</div>
                      <div className="text-2xl font-bold">#{userRank}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[#E8DED8]">
                      {viewMode === "points" ? "Total Points" : "Referrals"}
                    </div>
                    <div className="text-2xl font-bold">
                      {viewMode === "points" 
                        ? (userCustomer.total_points_earned || 0)
                        : (userCustomer.referral_count || 0)
                      }
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Top 3 Podium */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[#8B7355] mb-4 px-1">Top 3</h2>
              <div className="flex items-end justify-center gap-2">
                {/* 2nd Place */}
                {podiumPositions[1] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex-1"
                  >
                    <div className="text-center mb-2">
                      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center mb-2 border-4 border-white shadow-lg">
                        <span className="text-2xl">🥈</span>
                      </div>
                      <div className="text-xs font-semibold text-[#5C4A3A] truncate px-1">
                        {podiumPositions[1].created_by?.split('@')[0]}
                      </div>
                      <div className="text-sm font-bold text-[#8B7355]">
                        {viewMode === "points" 
                          ? (podiumPositions[1].total_points_earned || 0)
                          : (podiumPositions[1].referral_count || 0)
                        }
                      </div>
                    </div>
                    <div className={`bg-gradient-to-b ${getPodiumColors(1)} rounded-t-2xl ${getPodiumHeight(1)} flex items-center justify-center font-bold text-xl shadow-lg`}>
                      2
                    </div>
                  </motion.div>
                )}

                {/* 1st Place */}
                {podiumPositions[0] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1"
                  >
                    <div className="text-center mb-2">
                      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mb-2 border-4 border-white shadow-xl relative">
                        <Crown className="h-8 w-8 text-white absolute -top-6" />
                        <span className="text-3xl">👑</span>
                      </div>
                      <div className="text-xs font-semibold text-[#5C4A3A] truncate px-1">
                        {podiumPositions[0].created_by?.split('@')[0]}
                      </div>
                      <div className="text-sm font-bold text-[#8B7355]">
                        {viewMode === "points" 
                          ? (podiumPositions[0].total_points_earned || 0)
                          : (podiumPositions[0].referral_count || 0)
                        }
                      </div>
                    </div>
                    <div className={`bg-gradient-to-b ${getPodiumColors(0)} rounded-t-2xl ${getPodiumHeight(0)} flex items-center justify-center font-bold text-2xl shadow-xl`}>
                      1
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place */}
                {podiumPositions[2] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex-1"
                  >
                    <div className="text-center mb-2">
                      <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center mb-2 border-4 border-white shadow-lg">
                        <span className="text-xl">🥉</span>
                      </div>
                      <div className="text-xs font-semibold text-[#5C4A3A] truncate px-1">
                        {podiumPositions[2].created_by?.split('@')[0]}
                      </div>
                      <div className="text-sm font-bold text-[#8B7355]">
                        {viewMode === "points" 
                          ? (podiumPositions[2].total_points_earned || 0)
                          : (podiumPositions[2].referral_count || 0)
                        }
                      </div>
                    </div>
                    <div className={`bg-gradient-to-b ${getPodiumColors(2)} rounded-t-2xl ${getPodiumHeight(2)} flex items-center justify-center font-bold text-lg shadow-lg`}>
                      3
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Rest of Leaderboard */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[#8B7355] mb-4 px-1">Top 20</h2>
              {restOfLeaderboard.map((customer, index) => {
                const rank = index + 4;
                const isCurrentUser = customer.created_by === user?.email;
                
                return (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`bg-white rounded-2xl border p-4 flex items-center gap-4 ${
                      isCurrentUser 
                        ? "border-[#8B7355] shadow-md" 
                        : "border-[#E8DED8] shadow-sm"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      isCurrentUser 
                        ? "bg-[#8B7355] text-white" 
                        : "bg-[#F5EBE8] text-[#8B7355]"
                    }`}>
                      {rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${
                        isCurrentUser ? "text-[#8B7355]" : "text-[#5C4A3A]"
                      }`}>
                        {customer.created_by?.split('@')[0]}
                        {isCurrentUser && " (You)"}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#C9B8A6] mt-1">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          {customer.tier}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#8B7355]">
                        {viewMode === "points" 
                          ? (customer.total_points_earned || 0)
                          : (customer.referral_count || 0)
                        }
                      </div>
                      <div className="text-xs text-[#C9B8A6]">
                        {viewMode === "points" ? "points" : "referrals"}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {sortedCustomers.length === 0 && (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-[#C9B8A6] mx-auto mb-4" />
                <p className="text-[#8B7355]">No rankings yet. Be the first!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}