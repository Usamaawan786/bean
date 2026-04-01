import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Search, CheckCircle, XCircle, Clock, Gift,
  AlertTriangle, Shield, Star, Users, Tag, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const statusConfig = {
  pending: { label: "Valid – Not Claimed", color: "bg-green-100 text-green-700 border-green-200", icon: Clock },
  claimed: { label: "Already Claimed", color: "bg-gray-100 text-gray-500 border-gray-200", icon: CheckCircle },
  expired: { label: "Expired", color: "bg-red-100 text-red-600 border-red-200", icon: XCircle },
};

function FMBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
      <Shield className="h-2.5 w-2.5" /> FM
    </span>
  );
}

function EBABadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
      ⭐ EBA
    </span>
  );
}

function DiscountRow({ customer, user: appUser, onMarkDiscount }) {
  const [expanded, setExpanded] = useState(false);
  const isFM = customer.is_founding_member;
  const isEBA = customer.is_eba;
  const fmUsed = customer.fm_discount_used || 0;
  const ebaUsed = customer.eba_discount_used || 0;
  const FM_TOTAL = 3;
  const EBA_TOTAL = 3;

  return (
    <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#F9F6F3] transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {(appUser?.full_name || customer.created_by || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#5C4A3A] text-sm">{appUser?.full_name || appUser?.display_name || "Unknown"}</span>
            {isFM && <FMBadge />}
            {isEBA && <EBABadge />}
          </div>
          <p className="text-xs text-[#8B7355] truncate">{customer.created_by}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isFM && (
            <div className="text-center">
              <div className={`text-sm font-bold ${fmUsed >= FM_TOTAL ? "text-gray-400" : "text-amber-600"}`}>{fmUsed}/{FM_TOTAL}</div>
              <div className="text-[10px] text-[#C9B8A6]">FM Disc.</div>
            </div>
          )}
          {isEBA && (
            <div className="text-center">
              <div className={`text-sm font-bold ${ebaUsed >= EBA_TOTAL ? "text-gray-400" : "text-purple-600"}`}>{ebaUsed}/{EBA_TOTAL}</div>
              <div className="text-[10px] text-[#C9B8A6]">EBA Disc.</div>
            </div>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-[#C9B8A6]" /> : <ChevronDown className="h-4 w-4 text-[#C9B8A6]" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-[#F5EBE8] space-y-4">
              <div className="grid grid-cols-3 gap-3 pt-3">
                <div className="bg-[#F5F1ED] rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-[#8B7355]">{customer.points_balance || 0}</div>
                  <div className="text-xs text-[#C9B8A6]">Points</div>
                </div>
                <div className="bg-[#F5F1ED] rounded-xl p-3 text-center">
                  <div className="text-sm font-bold text-[#8B7355] capitalize">{customer.tier || "Bronze"}</div>
                  <div className="text-xs text-[#C9B8A6]">Tier</div>
                </div>
                <div className="bg-[#F5F1ED] rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-[#8B7355]">PKR {(customer.total_spend_pkr || 0).toLocaleString()}</div>
                  <div className="text-xs text-[#C9B8A6]">Total Spent</div>
                </div>
              </div>

              {/* FM Discount Section */}
              {isFM && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FMBadge />
                    <span className="font-semibold text-amber-800 text-sm">Founding Member — 10% Discount</span>
                    <span className="ml-auto text-xs font-bold text-amber-700">{FM_TOTAL - fmUsed} remaining</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    {Array.from({ length: FM_TOTAL }).map((_, i) => (
                      <div key={i} className={`flex-1 h-2.5 rounded-full ${i < fmUsed ? "bg-amber-400" : "bg-amber-200"}`} />
                    ))}
                  </div>
                  {fmUsed < FM_TOTAL ? (
                    <Button
                      onClick={() => onMarkDiscount(customer, "fm")}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-9 text-sm gap-2"
                    >
                      <Tag className="h-4 w-4" /> Mark 10% Discount Used (Order #{fmUsed + 1}/3)
                    </Button>
                  ) : (
                    <div className="text-center text-xs text-amber-600 font-semibold py-1">✅ All 3 FM discounts used</div>
                  )}
                </div>
              )}

              {/* EBA Discount Section */}
              {isEBA && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <EBABadge />
                    <span className="font-semibold text-purple-800 text-sm">EBA — 10% Discount</span>
                    <span className="ml-auto text-xs font-bold text-purple-700">{EBA_TOTAL - ebaUsed} remaining</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    {Array.from({ length: EBA_TOTAL }).map((_, i) => (
                      <div key={i} className={`flex-1 h-2.5 rounded-full ${i < ebaUsed ? "bg-purple-400" : "bg-purple-200"}`} />
                    ))}
                  </div>
                  {ebaUsed < EBA_TOTAL ? (
                    <Button
                      onClick={() => onMarkDiscount(customer, "eba")}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 text-sm gap-2"
                    >
                      <Tag className="h-4 w-4" /> Mark 10% Discount Used (Order #{ebaUsed + 1}/3)
                    </Button>
                  ) : (
                    <div className="text-center text-xs text-purple-700 font-semibold py-1">✅ All 3 EBA discounts used</div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminRedemptions() {
  const [user, setUser] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [lookedUp, setLookedUp] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("discounts"); // discounts | codes
  const [searchFM, setSearchFM] = useState("");
  const [filterType, setFilterType] = useState("all"); // all | fm | eba
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.role !== "admin") { window.location.href = "/"; return; }
      setUser(u);
    });
  }, []);

  const { data: recentRedemptions = [] } = useQuery({
    queryKey: ["all-redemptions"],
    queryFn: () => base44.entities.Redemption.list("-created_date", 50),
    enabled: !!user && tab === "codes",
    refetchInterval: 15000,
  });

  const { data: allCustomers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["fm-eba-customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500),
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users-admin"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const userMap = {};
  allUsers.forEach(u => { userMap[u.email] = u; });

  const specialCustomers = allCustomers.filter(c => c.is_founding_member || c.is_eba);

  const filteredCustomers = specialCustomers
    .filter(c => {
      if (filterType === "fm") return c.is_founding_member;
      if (filterType === "eba") return c.is_eba;
      return true;
    })
    .filter(c => {
      if (!searchFM) return true;
      const u = userMap[c.created_by];
      const name = (u?.full_name || u?.display_name || "").toLowerCase();
      return name.includes(searchFM.toLowerCase()) || (c.created_by || "").toLowerCase().includes(searchFM.toLowerCase());
    });

  const stats = {
    totalFM: allCustomers.filter(c => c.is_founding_member).length,
    totalEBA: allCustomers.filter(c => c.is_eba).length,
    fmDiscountsLeft: allCustomers.filter(c => c.is_founding_member).reduce((s, c) => s + Math.max(0, 3 - (c.fm_discount_used || 0)), 0),
    ebaDiscountsLeft: allCustomers.filter(c => c.is_eba).reduce((s, c) => s + Math.max(0, 3 - (c.eba_discount_used || 0)), 0),
  };

  const handleMarkDiscount = async (customer, type) => {
    const field = type === "fm" ? "fm_discount_used" : "eba_discount_used";
    const current = customer[field] || 0;
    if (current >= 3) { toast.error("All discounts already used!"); return; }
    await base44.entities.Customer.update(customer.id, { [field]: current + 1 });
    queryClient.invalidateQueries({ queryKey: ["fm-eba-customers"] });
    const label = type === "fm" ? "Founding Member" : "EBA";
    toast.success(`✅ ${label} 10% discount marked — ${current + 1}/3 used`);
  };

  const handleLookup = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setNotFound(false); setLookedUp(null);
    const results = await base44.entities.Redemption.filter({ redemption_code: code });
    if (results.length === 0) setNotFound(true);
    else setLookedUp(results[0]);
  };

  const handleClaim = async (redemption) => {
    await base44.entities.Redemption.update(redemption.id, { status: "claimed" });
    setLookedUp(prev => ({ ...prev, status: "claimed" }));
    queryClient.invalidateQueries({ queryKey: ["all-redemptions"] });
    toast.success("Redemption marked as claimed!");
  };

  const handleExpire = async (redemption) => {
    await base44.entities.Redemption.update(redemption.id, { status: "expired" });
    setLookedUp(prev => ({ ...prev, status: "expired" }));
    queryClient.invalidateQueries({ queryKey: ["all-redemptions"] });
    toast.success("Redemption expired.");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white">
        <div className="max-w-5xl mx-auto px-5 pt-8 pb-6">
          <Link to="/AdminDashboard" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-4 mb-5">
            <div className="bg-white/15 rounded-2xl p-3"><Gift className="h-7 w-7" /></div>
            <div>
              <h1 className="text-2xl font-bold">Redemptions & Discounts</h1>
              <p className="text-white/70 text-sm">FM · EBA discounts + reward code verifier</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Founding Members", value: stats.totalFM, icon: "🏅" },
              { label: "FM Discounts Left", value: stats.fmDiscountsLeft, icon: "🏷️" },
              { label: "EBA Members", value: stats.totalEBA, icon: "⭐" },
              { label: "EBA Discounts Left", value: stats.ebaDiscountsLeft, icon: "🎖️" },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-2xl p-3 text-center">
                <div className="text-lg mb-0.5">{s.icon}</div>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-white/70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#E8DED8] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 py-2">
          {[
            { id: "discounts", label: "🏅 FM & EBA Discounts" },
            { id: "codes", label: "🎁 Reward Codes" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? "bg-[#5C4A3A] text-white shadow" : "text-[#8B7355] hover:bg-[#F5EBE8]"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 pb-20 space-y-5">

        {/* ─── FM & EBA Discount Dashboard ─── */}
        {tab === "discounts" && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
              <p className="font-bold mb-1">📋 Cashier Instructions</p>
              <p>When a customer claims FM or EBA discount, search their name/email below, expand their card, and tap <strong>"Mark Discount Used"</strong>. Each member gets <strong>3 × 10% off</strong> on separate orders. Never give discount once all 3 are used.</p>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
                <input value={searchFM} onChange={e => setSearchFM(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full border border-[#E8DED8] rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30" />
              </div>
              <div className="flex gap-2">
                {[{ id: "all", label: "All" }, { id: "fm", label: "🏅 FM" }, { id: "eba", label: "⭐ EBA" }].map(f => (
                  <button key={f.id} onClick={() => setFilterType(f.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filterType === f.id ? "bg-[#5C4A3A] text-white" : "bg-white border border-[#E8DED8] text-[#8B7355] hover:bg-[#F5EBE8]"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {customersLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#8B7355]" /></div>
            ) : filteredCustomers.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#E8DED8] p-12 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 text-[#C9B8A6]" />
                <p className="text-[#8B7355] font-medium">No members found</p>
                <p className="text-xs text-[#C9B8A6] mt-1">FM members are automatically detected when waitlist users sign up</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCustomers.map(c => (
                  <DiscountRow key={c.id} customer={c} user={userMap[c.created_by]} onMarkDiscount={handleMarkDiscount} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── Reward Codes Tab ─── */}
        {tab === "codes" && (
          <>
            {/* Code Lookup */}
            <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm">
              <h2 className="font-bold text-[#5C4A3A] mb-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-[#8B7355]" /> Look Up Redemption Code
              </h2>
              <div className="flex gap-3">
                <Input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleLookup()}
                  placeholder="Enter code (e.g. 3Z79DYJK)"
                  className="font-mono text-lg tracking-widest border-[#E8DED8] uppercase" />
                <Button onClick={handleLookup} className="bg-[#8B7355] hover:bg-[#6B5744] px-6 rounded-xl">Verify</Button>
              </div>

              <AnimatePresence>
                {notFound && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                    <XCircle className="h-6 w-6 text-red-500" />
                    <div><p className="font-semibold text-red-700">Code Not Found</p><p className="text-sm text-red-500">Do not honour this reward.</p></div>
                  </motion.div>
                )}
                {lookedUp && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`mt-4 rounded-2xl border-2 p-5 ${lookedUp.status === "pending" ? "bg-green-50 border-green-300" : lookedUp.status === "claimed" ? "bg-gray-50 border-gray-300" : "bg-red-50 border-red-300"}`}>
                    {lookedUp.status === "pending" && <div className="flex items-center gap-2 mb-4 text-green-700 font-bold text-lg"><CheckCircle className="h-6 w-6" />✅ Valid Code — OK to Honour</div>}
                    {lookedUp.status === "claimed" && <div className="flex items-center gap-2 mb-4 text-gray-600 font-bold text-lg"><AlertTriangle className="h-6 w-6" />⚠️ Already Claimed — Do NOT Honour Again</div>}
                    {lookedUp.status === "expired" && <div className="flex items-center gap-2 mb-4 text-red-600 font-bold text-lg"><XCircle className="h-6 w-6" />❌ Expired — Do Not Honour</div>}
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div><p className="text-[#8B7355] text-xs">Code</p><p className="font-mono font-bold text-[#5C4A3A] text-lg tracking-widest">{lookedUp.redemption_code}</p></div>
                      <div><p className="text-[#8B7355] text-xs">Reward</p><p className="font-bold text-[#5C4A3A]">{lookedUp.reward_name}</p></div>
                      <div><p className="text-[#8B7355] text-xs">Customer</p><p className="font-medium text-[#5C4A3A]">{lookedUp.customer_email}</p></div>
                      <div><p className="text-[#8B7355] text-xs">Points Spent</p><p className="font-bold text-[#5C4A3A]">{lookedUp.points_spent} pts</p></div>
                      <div><p className="text-[#8B7355] text-xs">Date</p><p className="font-medium text-[#5C4A3A]">{format(new Date(lookedUp.created_date), "MMM d, yyyy HH:mm")}</p></div>
                      <div><p className="text-[#8B7355] text-xs">Status</p><Badge className={`${statusConfig[lookedUp.status]?.color} border`}>{statusConfig[lookedUp.status]?.label}</Badge></div>
                    </div>
                    {lookedUp.status === "pending" && (
                      <div className="flex gap-3">
                        <Button onClick={() => handleClaim(lookedUp)} className="flex-1 bg-green-600 hover:bg-green-700 rounded-xl"><CheckCircle className="h-4 w-4 mr-2" />Mark as Claimed</Button>
                        <Button onClick={() => handleExpire(lookedUp)} variant="outline" className="rounded-xl border-red-200 text-red-600 hover:bg-red-50">Expire</Button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Recent Redemptions */}
            <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm">
              <h2 className="font-bold text-[#5C4A3A] mb-4 flex items-center gap-2"><Gift className="h-5 w-5 text-[#8B7355]" />Recent Redemptions</h2>
              {recentRedemptions.length === 0 ? (
                <p className="text-[#8B7355] text-center py-8">No redemptions yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E8DED8] text-left">
                        <th className="pb-3 text-[#8B7355] font-medium">Code</th>
                        <th className="pb-3 text-[#8B7355] font-medium">Reward</th>
                        <th className="pb-3 text-[#8B7355] font-medium">Customer</th>
                        <th className="pb-3 text-[#8B7355] font-medium">Points</th>
                        <th className="pb-3 text-[#8B7355] font-medium">Date</th>
                        <th className="pb-3 text-[#8B7355] font-medium">Status</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRedemptions.map(r => {
                        const cfg = statusConfig[r.status] || statusConfig.pending;
                        return (
                          <tr key={r.id} className="border-b border-[#F5EBE8] last:border-0">
                            <td className="py-3 font-mono font-bold text-[#5C4A3A] tracking-widest">{r.redemption_code}</td>
                            <td className="py-3 text-[#5C4A3A]">{r.reward_name}</td>
                            <td className="py-3 text-[#8B7355] max-w-[140px] truncate">{r.customer_email}</td>
                            <td className="py-3 font-medium text-[#5C4A3A]">{r.points_spent}</td>
                            <td className="py-3 text-[#8B7355] whitespace-nowrap">{format(new Date(r.created_date), "MMM d, HH:mm")}</td>
                            <td className="py-3"><Badge className={`${cfg.color} border text-xs`}>{cfg.label}</Badge></td>
                            <td className="py-3">
                              {r.status === "pending" && (
                                <Button size="sm" onClick={() => base44.entities.Redemption.update(r.id, { status: "claimed" }).then(() => { queryClient.invalidateQueries({ queryKey: ["all-redemptions"] }); toast.success("Marked as claimed"); })}
                                  className="bg-green-600 hover:bg-green-700 rounded-lg h-7 text-xs px-3">Claim</Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}