import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, CheckCircle, XCircle, Clock, Gift, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
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

export default function AdminRedemptions() {
  const [user, setUser] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [lookedUp, setLookedUp] = useState(null); // the redemption record found
  const [notFound, setNotFound] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      if (u.role !== "admin") {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(u);
    };
    loadUser();
  }, []);

  // Recent redemptions list
  const { data: recentRedemptions = [] } = useQuery({
    queryKey: ["all-redemptions"],
    queryFn: () => base44.entities.Redemption.list("-created_date", 50),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const handleLookup = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setNotFound(false);
    setLookedUp(null);

    const results = await base44.entities.Redemption.filter({ redemption_code: code });
    if (results.length === 0) {
      setNotFound(true);
    } else {
      setLookedUp(results[0]);
    }
  };

  const claimMutation = useMutation({
    mutationFn: async (redemption) => {
      await base44.entities.Redemption.update(redemption.id, { status: "claimed" });
    },
    onSuccess: () => {
      toast.success("Redemption marked as claimed!");
      setLookedUp(prev => ({ ...prev, status: "claimed" }));
      queryClient.invalidateQueries({ queryKey: ["all-redemptions"] });
    },
    onError: () => toast.error("Failed to update redemption"),
  });

  const expireMutation = useMutation({
    mutationFn: async (redemption) => {
      await base44.entities.Redemption.update(redemption.id, { status: "expired" });
    },
    onSuccess: () => {
      toast.success("Redemption marked as expired.");
      setLookedUp(prev => ({ ...prev, status: "expired" }));
      queryClient.invalidateQueries({ queryKey: ["all-redemptions"] });
    },
  });

  const pendingCount = recentRedemptions.filter(r => r.status === "pending").length;
  const claimedCount = recentRedemptions.filter(r => r.status === "claimed").length;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 pt-6 pb-4">
          <Link
            to={createPageUrl("AdminPOS")}
            className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Redemption Verifier</h1>
              <p className="text-[#E8DED8] text-sm">Verify and claim customer reward codes</p>
            </div>
            <div className="flex gap-3 text-center">
              <div className="bg-white/10 rounded-2xl px-4 py-2">
                <div className="text-2xl font-bold text-green-300">{pendingCount}</div>
                <div className="text-xs text-[#E8DED8]">Unclaimed</div>
              </div>
              <div className="bg-white/10 rounded-2xl px-4 py-2">
                <div className="text-2xl font-bold">{claimedCount}</div>
                <div className="text-xs text-[#E8DED8]">Claimed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">

        {/* Code Lookup */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm">
          <h2 className="font-bold text-[#5C4A3A] mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-[#8B7355]" />
            Look Up Redemption Code
          </h2>
          <div className="flex gap-3">
            <Input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="Enter code (e.g. 3Z79DYJK)"
              className="font-mono text-lg tracking-widest border-[#E8DED8] uppercase"
            />
            <Button onClick={handleLookup} className="bg-[#8B7355] hover:bg-[#6B5744] px-6 rounded-xl">
              Verify
            </Button>
          </div>

          {/* Result */}
          <AnimatePresence>
            {notFound && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4"
              >
                <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-700">Code Not Found</p>
                  <p className="text-sm text-red-500">This code does not exist. Do not honour this reward.</p>
                </div>
              </motion.div>
            )}

            {lookedUp && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 rounded-2xl border-2 p-5 ${
                  lookedUp.status === "pending"
                    ? "bg-green-50 border-green-300"
                    : lookedUp.status === "claimed"
                    ? "bg-gray-50 border-gray-300"
                    : "bg-red-50 border-red-300"
                }`}
              >
                {/* Status Banner */}
                {lookedUp.status === "pending" && (
                  <div className="flex items-center gap-2 mb-4 text-green-700 font-bold text-lg">
                    <CheckCircle className="h-6 w-6" />
                    ✅ Valid Code — OK to Honour
                  </div>
                )}
                {lookedUp.status === "claimed" && (
                  <div className="flex items-center gap-2 mb-4 text-gray-600 font-bold text-lg">
                    <AlertTriangle className="h-6 w-6" />
                    ⚠️ Already Claimed — Do NOT Honour Again
                  </div>
                )}
                {lookedUp.status === "expired" && (
                  <div className="flex items-center gap-2 mb-4 text-red-600 font-bold text-lg">
                    <XCircle className="h-6 w-6" />
                    ❌ Expired — Do Not Honour
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-[#8B7355] text-xs">Redemption Code</p>
                    <p className="font-mono font-bold text-[#5C4A3A] text-lg tracking-widest">{lookedUp.redemption_code}</p>
                  </div>
                  <div>
                    <p className="text-[#8B7355] text-xs">Reward</p>
                    <p className="font-bold text-[#5C4A3A]">{lookedUp.reward_name}</p>
                  </div>
                  <div>
                    <p className="text-[#8B7355] text-xs">Customer Email</p>
                    <p className="font-medium text-[#5C4A3A]">{lookedUp.customer_email}</p>
                  </div>
                  <div>
                    <p className="text-[#8B7355] text-xs">Points Spent</p>
                    <p className="font-bold text-[#5C4A3A]">{lookedUp.points_spent} pts</p>
                  </div>
                  <div>
                    <p className="text-[#8B7355] text-xs">Redeemed At</p>
                    <p className="font-medium text-[#5C4A3A]">{format(new Date(lookedUp.created_date), "MMM d, yyyy HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-[#8B7355] text-xs">Status</p>
                    <Badge className={`${statusConfig[lookedUp.status]?.color} border`}>
                      {statusConfig[lookedUp.status]?.label}
                    </Badge>
                  </div>
                </div>

                {lookedUp.status === "pending" && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => claimMutation.mutate(lookedUp)}
                      disabled={claimMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700 rounded-xl"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Claimed
                    </Button>
                    <Button
                      onClick={() => expireMutation.mutate(lookedUp)}
                      disabled={expireMutation.isPending}
                      variant="outline"
                      className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Expire
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent Redemptions Table */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm">
          <h2 className="font-bold text-[#5C4A3A] mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5 text-[#8B7355]" />
            Recent Redemptions
          </h2>

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
                  {recentRedemptions.map((r) => {
                    const cfg = statusConfig[r.status] || statusConfig.pending;
                    return (
                      <tr key={r.id} className="border-b border-[#F5EBE8] last:border-0">
                        <td className="py-3 font-mono font-bold text-[#5C4A3A] tracking-widest">{r.redemption_code}</td>
                        <td className="py-3 text-[#5C4A3A]">{r.reward_name}</td>
                        <td className="py-3 text-[#8B7355] max-w-[160px] truncate">{r.customer_email}</td>
                        <td className="py-3 font-medium text-[#5C4A3A]">{r.points_spent}</td>
                        <td className="py-3 text-[#8B7355] whitespace-nowrap">{format(new Date(r.created_date), "MMM d, HH:mm")}</td>
                        <td className="py-3">
                          <Badge className={`${cfg.color} border text-xs`}>{cfg.label}</Badge>
                        </td>
                        <td className="py-3">
                          {r.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                base44.entities.Redemption.update(r.id, { status: "claimed" }).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ["all-redemptions"] });
                                  toast.success("Marked as claimed");
                                });
                              }}
                              className="bg-green-600 hover:bg-green-700 rounded-lg h-7 text-xs px-3"
                            >
                              Claim
                            </Button>
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
    </div>
  );
}