import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Star, Crown, ArrowLeft, Coffee } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

function Avatar({ name, size = "md" }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const sizes = { sm: "w-9 h-9 text-xs", md: "w-12 h-12 text-sm", lg: "w-16 h-16 text-lg", xl: "w-20 h-20 text-xl" };
  const palettes = [
    "from-violet-400 to-purple-600",
    "from-blue-400 to-blue-600",
    "from-emerald-400 to-teal-600",
    "from-rose-400 to-pink-600",
    "from-amber-400 to-orange-500",
    "from-[#8B7355] to-[#5C4A3A]",
  ];
  const color = palettes[(name || "").charCodeAt(0) % palettes.length];
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md`}>
      {initials}
    </div>
  );
}

const PODIUM = [
  { rank: 2, idx: 1, barH: "h-20", barBg: "from-slate-300 to-slate-400", label: "2nd", avatarSize: "lg" },
  { rank: 1, idx: 0, barH: "h-28", barBg: "from-amber-400 to-yellow-500", label: "1st", avatarSize: "xl" },
  { rank: 3, idx: 2, barH: "h-14", barBg: "from-orange-300 to-amber-500", label: "3rd", avatarSize: "lg" },
];

export default function Leaderboard() {
  const [me, setMe] = useState(null);
  const [myCustomer, setMyCustomer] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (auth) => {
      if (!auth) return;
      const u = await base44.auth.me();
      if (!u) return;
      setMe(u);
      const list = await base44.entities.Customer.filter({ created_by: u.email });
      if (list.length > 0) setMyCustomer(list[0]);
    });
  }, []);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["leaderboard-full"],
    queryFn: () => base44.entities.Customer.list("-total_points_earned", 50),
    staleTime: 60000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["leaderboard-users"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 300000,
  });

  const userMap = users.reduce((acc, u) => { acc[u.email] = u; return acc; }, {});
  const getName = (c) => {
    const u = userMap[c.created_by];
    return u?.display_name || u?.full_name || c.created_by?.split("@")[0] || "Coffee Lover";
  };

  const top3 = customers.slice(0, 3);
  const rest = customers.slice(3);
  const myRank = myCustomer ? customers.findIndex((c) => c.created_by === myCustomer.created_by) + 1 : 0;

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-10 select-none">
          <span className="absolute text-6xl top-4 left-6">☕</span>
          <span className="absolute text-5xl top-14 right-10">⭐</span>
          <span className="absolute text-4xl bottom-6 left-1/3">🏆</span>
        </div>
        <div className="relative max-w-lg mx-auto px-5 pt-10 pb-10">
          <Link to={createPageUrl("Rewards")} className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-5 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Rewards
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/15 rounded-2xl p-3 backdrop-blur">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Bean Leaderboard</h1>
              <p className="text-[#E8DED8] text-sm">Top coffee lovers by lifetime points</p>
            </div>
          </div>

          {myRank > 0 && myCustomer && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5 text-sm"
            >
              <Star className="h-4 w-4 text-amber-300 fill-amber-300 flex-shrink-0" />
              <span>You're <strong>#{myRank}</strong> · <strong>{myCustomer.total_points_earned?.toLocaleString()} pts</strong></span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-28 space-y-4 -mt-2">
        {isLoading ? (
          <div className="space-y-3 pt-6">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-[#E8DED8] shadow-lg px-4 pt-6 pb-0 mt-4 overflow-hidden"
              >
                <div className="flex items-end justify-center gap-3">
                  {PODIUM.map(({ rank, idx, barH, barBg, avatarSize }) => {
                    const c = top3[idx];
                    if (!c) return null;
                    const name = getName(c);
                    const isMe = myCustomer?.created_by === c.created_by;
                    return (
                      <motion.div
                        key={rank}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex flex-col items-center flex-1"
                      >
                        {rank === 1 && (
                          <Crown className="h-5 w-5 text-amber-500 fill-amber-400 mb-1" />
                        )}
                        <Avatar name={name} size={avatarSize} />
                        <p className={`text-xs font-semibold mt-2 mb-0.5 text-center truncate w-full px-1 ${isMe ? "text-[#8B7355]" : "text-[#5C4A3A]"}`}>
                          {isMe ? "You" : name.split(" ")[0]}
                        </p>
                        <div className="flex items-center gap-0.5 mb-2">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-bold text-[#5C4A3A]">{c.total_points_earned?.toLocaleString()}</span>
                        </div>
                        <div className={`w-full ${barH} bg-gradient-to-b ${barBg} rounded-t-2xl flex items-start justify-center pt-2`}>
                          <span className="text-white font-black text-lg drop-shadow">{rank}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Rest of list */}
            {rest.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-widest px-1">Rankings</p>
                {rest.map((c, i) => {
                  const rank = i + 4;
                  const name = getName(c);
                  const isMe = myCustomer?.created_by === c.created_by;
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.035 }}
                      className={`bg-white rounded-2xl border px-4 py-3 flex items-center gap-3 ${
                        isMe ? "border-[#8B7355] ring-1 ring-[#8B7355]/20 shadow-sm" : "border-[#E8DED8]"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isMe ? "bg-[#8B7355] text-white" : "bg-[#F5EBE8] text-[#8B7355]"
                      }`}>
                        {rank}
                      </div>
                      <Avatar name={name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isMe ? "text-[#8B7355]" : "text-[#5C4A3A]"}`}>
                          {isMe ? "You" : name}
                        </p>
                        <p className="text-xs text-[#C9B8A6]">{c.tier || "Bronze"}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-bold text-[#5C4A3A]">{c.total_points_earned?.toLocaleString()}</span>
                        <span className="text-xs text-[#C9B8A6]">pts</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Guest CTA */}
            {!me && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] rounded-3xl p-6 text-white text-center mt-4"
              >
                <Coffee className="h-8 w-8 mx-auto mb-3 opacity-80" />
                <h3 className="font-bold text-lg mb-1">Join the Competition</h3>
                <p className="text-[#E8DED8] text-sm mb-4">Sign in to see your rank and start earning points</p>
                <button
                  onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
                  className="bg-white text-[#5C4A3A] font-bold px-6 py-2.5 rounded-2xl text-sm hover:bg-[#F5EBE8] transition-colors"
                >
                  Sign In →
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}