import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Star, Crown, Medal, ArrowLeft, Coffee } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const TIER_CONFIG = {
  Platinum: { color: "text-purple-600", bg: "bg-purple-100", border: "border-purple-200" },
  Gold: { color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200" },
  Silver: { color: "text-gray-500", bg: "bg-gray-100", border: "border-gray-200" },
  Bronze: { color: "text-orange-500", bg: "bg-orange-100", border: "border-orange-200" },
};

const PODIUM_CONFIG = [
  { rank: 2, height: "h-24", bg: "from-gray-300 to-gray-400", icon: Medal, iconColor: "text-gray-600", delay: 0.2 },
  { rank: 1, height: "h-32", bg: "from-amber-400 to-amber-500", icon: Crown, iconColor: "text-amber-700", delay: 0 },
  { rank: 3, height: "h-16", bg: "from-orange-300 to-orange-400", icon: Medal, iconColor: "text-orange-600", delay: 0.3 },
];

function Avatar({ name, size = "md" }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const sizeClass = size === "lg" ? "w-14 h-14 text-lg" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  const colors = ["from-[#8B7355] to-[#6B5744]", "from-purple-400 to-purple-600", "from-blue-400 to-blue-600", "from-green-400 to-green-600", "from-pink-400 to-pink-600"];
  const color = colors[(name || "").charCodeAt(0) % colors.length];
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function Leaderboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (auth) => {
      if (!auth) return;
      const u = await base44.auth.me();
      if (!u) return;
      setCurrentUser(u);
      const customers = await base44.entities.Customer.filter({ created_by: u.email });
      if (customers.length > 0) setCurrentCustomer(customers[0]);
    });
  }, []);

  const { data: topCustomers = [], isLoading } = useQuery({
    queryKey: ["public-leaderboard"],
    queryFn: () => base44.entities.Customer.list("-total_points_earned", 50),
    staleTime: 60000,
  });

  // Fetch User display names
  const { data: users = [] } = useQuery({
    queryKey: ["leaderboard-users"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 300000,
  });

  const userMap = users.reduce((acc, u) => {
    acc[u.email] = u;
    return acc;
  }, {});

  const getName = (customer) => {
    const u = userMap[customer.created_by];
    return u?.display_name || u?.full_name || customer.created_by?.split("@")[0] || "Coffee Lover";
  };

  const top3 = topCustomers.slice(0, 3);
  const rest = topCustomers.slice(3);

  const myRank = currentCustomer
    ? topCustomers.findIndex(c => c.created_by === currentCustomer.created_by) + 1
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white px-5 pt-10 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-8 text-4xl">☕</div>
          <div className="absolute top-12 right-16 text-3xl">⭐</div>
          <div className="absolute bottom-8 left-1/3 text-3xl">🏆</div>
        </div>
        <div className="relative max-w-lg mx-auto">
          <Link to={createPageUrl("Home")} className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/15 rounded-2xl p-3">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Bean Leaderboard</h1>
              <p className="text-[#E8DED8] text-sm">Top coffee lovers by points</p>
            </div>
          </div>

          {/* Current user rank pill */}
          {myRank && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-4 py-2 text-sm"
            >
              <Star className="h-4 w-4 text-amber-300 fill-amber-300" />
              <span>You're ranked <strong>#{myRank}</strong> with <strong>{currentCustomer?.total_points_earned || 0} pts</strong></span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 -mt-8 pb-24 space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-lg"
              >
                <div className="flex items-end justify-center gap-4 mt-2">
                  {PODIUM_CONFIG.map(({ rank, height, bg, icon: Icon, iconColor, delay }) => {
                    const customer = top3[rank - 1];
                    if (!customer) return null;
                    const name = getName(customer);
                    const isMe = currentCustomer?.created_by === customer.created_by;
                    return (
                      <motion.div
                        key={rank}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay }}
                        className="flex flex-col items-center gap-2 flex-1"
                      >
                        <Avatar name={name} size="lg" />
                        <div className={`text-xs font-semibold text-[#5C4A3A] text-center truncate w-full ${isMe ? "text-[#8B7355]" : ""}`}>
                          {isMe ? "You" : name.split(" ")[0]}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[#8B7355]">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          <span className="font-bold">{customer.total_points_earned?.toLocaleString()}</span>
                        </div>
                        <div className={`w-full ${height} bg-gradient-to-b ${bg} rounded-t-2xl flex flex-col items-center justify-start pt-2 relative`}>
                          <Icon className={`h-5 w-5 ${iconColor}`} />
                          <span className="text-white font-black text-lg mt-1">{rank}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Ranks 4+ */}
            {rest.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide px-1">Rankings</h3>
                {rest.map((customer, i) => {
                  const rank = i + 4;
                  const name = getName(customer);
                  const isMe = currentCustomer?.created_by === customer.created_by;
                  const tier = customer.tier || "Bronze";
                  const tierCfg = TIER_CONFIG[tier] || TIER_CONFIG.Bronze;
                  return (
                    <motion.div
                      key={customer.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`bg-white rounded-2xl border px-4 py-3 flex items-center gap-3 ${isMe ? "border-[#8B7355] ring-1 ring-[#8B7355]/30" : "border-[#E8DED8]"}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[#F5EBE8] text-[#8B7355]`}>
                        {rank}
                      </div>
                      <Avatar name={name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-semibold truncate ${isMe ? "text-[#8B7355]" : "text-[#5C4A3A]"}`}>
                            {isMe ? "You" : name}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${tierCfg.bg} ${tierCfg.color} hidden sm:inline`}>{tier}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-[#5C4A3A] text-sm">{customer.total_points_earned?.toLocaleString()}</span>
                        <span className="text-xs text-[#C9B8A6]">pts</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Not logged in CTA */}
            {!currentUser && (
              <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] rounded-3xl p-6 text-white text-center">
                <Coffee className="h-8 w-8 mx-auto mb-3 opacity-80" />
                <h3 className="font-bold text-lg mb-1">Join the Competition</h3>
                <p className="text-[#E8DED8] text-sm mb-4">Sign in to see your rank and start earning points</p>
                <button
                  onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
                  className="bg-white text-[#5C4A3A] font-bold px-6 py-2.5 rounded-2xl text-sm hover:bg-[#F5EBE8] transition-colors"
                >
                  Sign In →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}