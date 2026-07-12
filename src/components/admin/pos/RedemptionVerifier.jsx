import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, CheckCircle, XCircle, Clock, Gift, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", icon: Clock },
  claimed: { label: "Fulfilled", color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500", icon: CheckCircle },
  expired: { label: "Expired", color: "bg-red-100 text-red-600 border-red-200", dot: "bg-red-500", icon: XCircle },
};

export default function RedemptionVerifier() {
  const [codeInput, setCodeInput] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: redemptions = [], isLoading } = useQuery({
    queryKey: ["pos-redemptions"],
    queryFn: () => base44.entities.Redemption.list("-created_date", 500),
    refetchInterval: 15000,
  });

  const stats = useMemo(() => ({
    pending: redemptions.filter(r => r.status === "pending").length,
    claimed: redemptions.filter(r => r.status === "claimed").length,
    expired: redemptions.filter(r => r.status === "expired").length,
  }), [redemptions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return redemptions.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q) {
        const hay = [r.redemption_code, r.reward_name, r.customer_email].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [redemptions, statusFilter, search]);

  const handleVerify = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) { toast.error("Enter a redemption code"); return; }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const resp = await base44.functions.invoke("verifyRewardCode", { redemption_code: code, claim: false });
      setVerifyResult(resp.data);
    } catch (e) {
      toast.error("Verification failed: " + (e?.message || "unknown"));
    } finally {
      setVerifying(false);
    }
  };

  const handleFulfil = async () => {
    const code = (verifyResult?.redemption?.redemption_code || codeInput).trim().toUpperCase();
    if (!code) return;
    setClaiming(true);
    try {
      const resp = await base44.functions.invoke("verifyRewardCode", { redemption_code: code, claim: true });
      const data = resp.data;
      if (data.claimed) {
        toast.success("Reward fulfilled — marked as claimed!");
        setVerifyResult({ ...data, redemption: { ...data.redemption, status: "claimed" } });
        queryClient.invalidateQueries({ queryKey: ["pos-redemptions"] });
        setCodeInput("");
      } else {
        setVerifyResult(data);
        toast.error(data.reason === "already_claimed" ? "Already claimed — do not honour again" : "Could not claim this code");
        queryClient.invalidateQueries({ queryKey: ["pos-redemptions"] });
      }
    } catch (e) {
      toast.error("Failed to fulfil: " + (e?.message || "unknown"));
    } finally {
      setClaiming(false);
    }
  };

  const handleQuickClaim = async (redemption) => {
    try {
      const resp = await base44.functions.invoke("verifyRewardCode", { redemption_code: redemption.redemption_code, claim: true });
      if (resp.data?.claimed) {
        toast.success(`${redemption.reward_name} fulfilled!`);
        queryClient.invalidateQueries({ queryKey: ["pos-redemptions"] });
      } else {
        toast.error(resp.data?.reason === "already_claimed" ? "Already claimed" : "Could not claim");
        queryClient.invalidateQueries({ queryKey: ["pos-redemptions"] });
      }
    } catch (e) {
      toast.error("Failed: " + (e?.message || "unknown"));
    }
  };

  const resultState = verifyResult?.redemption
    ? verifyResult.claimed
      ? "claimed"
      : verifyResult.valid
        ? "pending"
        : verifyResult.reason === "not_found"
          ? "not_found"
          : verifyResult.reason === "expired" || verifyResult.redemption.status === "expired"
            ? "expired"
            : "already_claimed"
    : null;

  return (
    <div className="space-y-5">
      {/* Code Verifier */}
      <div className="bg-white rounded-2xl border border-[#E8DED8] p-5">
        <h2 className="font-semibold text-[#5C4A3A] mb-1 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#8B7355]" /> Verify Reward Code
        </h2>
        <p className="text-xs text-[#8B7355] mb-4">Enter the code shown on the customer's app to confirm the reward and mark it fulfilled.</p>
        <div className="flex gap-3">
          <Input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleVerify()}
            placeholder="e.g. 3Z79DYJK"
            className="font-mono text-lg tracking-widest border-[#E8DED8] uppercase"
          />
          <Button onClick={handleVerify} disabled={verifying} className="bg-[#8B7355] hover:bg-[#6B5744] px-6 rounded-xl">
            {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Verify
          </Button>
        </div>

        <AnimatePresence>
          {verifyResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              {resultState === "not_found" ? (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                  <XCircle className="h-6 w-6 text-red-500" />
                  <div><p className="font-semibold text-red-700">Invalid Code</p><p className="text-sm text-red-500">No redemption matches this code. Do not honour.</p></div>
                </div>
              ) : (
                <div className={`rounded-2xl border-2 p-5 ${
                  resultState === "pending" ? "bg-green-50 border-green-300" :
                  resultState === "claimed" ? "bg-gray-50 border-gray-300" :
                  "bg-red-50 border-red-300"
                }`}>
                  {resultState === "pending" && (
                    <div className="flex items-center gap-2 mb-4 text-green-700 font-bold"><CheckCircle className="h-6 w-6" /> Valid Code — OK to Fulfil</div>
                  )}
                  {resultState === "claimed" && (
                    <div className="flex items-center gap-2 mb-4 text-gray-600 font-bold"><AlertTriangle className="h-6 w-6" /> Already Fulfilled — Do NOT Honour Again</div>
                  )}
                  {resultState === "expired" && (
                    <div className="flex items-center gap-2 mb-4 text-red-600 font-bold"><XCircle className="h-6 w-6" /> Expired — Do Not Honour</div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div><p className="text-[#8B7355] text-xs">Code</p><p className="font-mono font-bold text-[#5C4A3A] tracking-widest">{verifyResult.redemption.redemption_code}</p></div>
                    <div><p className="text-[#8B7355] text-xs">Reward</p><p className="font-bold text-[#5C4A3A]">{verifyResult.redemption.reward_name}</p></div>
                    <div><p className="text-[#8B7355] text-xs">Customer</p><p className="font-medium text-[#5C4A3A]">{verifyResult.redemption.customer_email}</p></div>
                    <div><p className="text-[#8B7355] text-xs">Points Spent</p><p className="font-bold text-[#5C4A3A]">{verifyResult.redemption.points_spent} pts</p></div>
                    <div><p className="text-[#8B7355] text-xs">Date Redeemed</p><p className="font-medium text-[#5C4A3A]">{format(new Date(verifyResult.redemption.created_date), "MMM d, yyyy HH:mm")}</p></div>
                  </div>
                  {resultState === "pending" && (
                    <Button onClick={handleFulfil} disabled={claiming} className="w-full bg-green-600 hover:bg-green-700 rounded-xl">
                      {claiming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Mark as Fulfilled
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: stats.pending, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
          { label: "Fulfilled", value: stats.claimed, color: "text-green-600", bg: "bg-green-50 border-green-200" },
          { label: "Expired", value: stats.expired, color: "text-red-500", bg: "bg-red-50 border-red-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.bg}`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#8B7355]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Redemptions list */}
      <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden">
        <div className="p-4 border-b border-[#E8DED8] space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-semibold text-[#5C4A3A] flex items-center gap-2"><Gift className="h-4 w-4 text-[#8B7355]" /> All Redemptions</h3>
            <div className="flex gap-2">
              {[
                { key: "pending", label: "Pending" },
                { key: "claimed", label: "Fulfilled" },
                { key: "all", label: "All" },
              ].map(f => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statusFilter === f.key ? "border-[#8B7355] bg-[#8B7355] text-white" : "border-[#E8DED8] bg-white text-[#8B7355] hover:border-[#C9B8A6]"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code, reward, or customer..." className="pl-9 border-[#E8DED8]" />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-[#8B7355]"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading redemptions...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-[#8B7355]">
            <Gift className="h-10 w-10 text-[#C9B8A6] mb-3" />
            <p className="font-medium text-[#5C4A3A]">No redemptions found</p>
            <p className="text-sm">Try a different filter or search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F1ED] text-left text-[#8B7355] border-b border-[#E8DED8]">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Reward</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium text-center">Points</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  return (
                    <tr key={r.id} className="border-b border-[#E8DED8] last:border-0 hover:bg-[#F5EBE8] transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#5C4A3A] tracking-widest">{r.redemption_code}</td>
                      <td className="px-4 py-3 text-[#5C4A3A] font-medium">{r.reward_name}</td>
                      <td className="px-4 py-3 text-[#8B7355] max-w-[160px] truncate">{r.customer_email}</td>
                      <td className="px-4 py-3 text-center text-[#5C4A3A] font-medium">{r.points_spent}</td>
                      <td className="px-4 py-3 text-[#8B7355] whitespace-nowrap">{format(new Date(r.created_date), "MMM d, HH:mm")}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === "pending" ? (
                          <Button size="sm" onClick={() => handleQuickClaim(r)} className="bg-green-600 hover:bg-green-700 rounded-lg h-8 text-xs px-3">
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Fulfil
                          </Button>
                        ) : (
                          <span className="text-xs text-[#C9B8A6]">—</span>
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
    </div>
  );
}