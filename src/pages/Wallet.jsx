import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet as WalletIcon, Plus, TrendingUp, Gift, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Wallet() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
      
      // Get or create wallet
      const wallets = await base44.entities.Wallet.filter({ created_by: u.email });
      if (wallets.length > 0) {
        setWallet(wallets[0]);
      } else {
        const newWallet = await base44.entities.Wallet.create({
          balance: 0,
          total_topped_up: 0
        });
        setWallet(newWallet);
      }
    };
    loadUser();
  }, []);

  const { data: transactions = [] } = useQuery({
    queryKey: ["wallet-transactions", user?.email],
    queryFn: () => base44.entities.WalletTransaction.filter({ user_email: user?.email }, "-created_date", 20),
    enabled: !!user?.email
  });

  const topUpMutation = useMutation({
    mutationFn: async (amount) => {
      const numAmount = parseFloat(amount);
      const newBalance = wallet.balance + numAmount;
      
      // Update wallet
      await base44.entities.Wallet.update(wallet.id, {
        balance: newBalance,
        total_topped_up: wallet.total_topped_up + numAmount
      });

      // Create transaction record
      await base44.entities.WalletTransaction.create({
        user_email: user.email,
        type: "top_up",
        amount: numAmount,
        balance_after: newBalance,
        description: `Added PKR ${numAmount} to wallet`
      });

      return newBalance;
    },
    onSuccess: (newBalance) => {
      setWallet(prev => ({
        ...prev,
        balance: newBalance,
        total_topped_up: prev.total_topped_up + parseFloat(topUpAmount)
      }));
      queryClient.invalidateQueries(["wallet-transactions"]);
      setShowTopUp(false);
      setTopUpAmount("");
      toast.success("Wallet topped up successfully! 🎉");
    }
  });

  const quickAmounts = [500, 1000, 2000, 5000];

  const handleTopUp = () => {
    if (!topUpAmount || parseFloat(topUpAmount) < 100) {
      toast.error("Minimum top-up amount is PKR 100");
      return;
    }
    topUpMutation.mutate(topUpAmount);
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
              <WalletIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">My Wallet</h1>
              <p className="text-[#E8DED8] text-sm">Quick & easy payments</p>
            </div>
          </div>

          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur rounded-3xl p-6 border border-white/20"
          >
            <div className="text-sm text-[#E8DED8] mb-2">Current Balance</div>
            <div className="text-4xl font-bold mb-4">PKR {wallet?.balance || 0}</div>
            <Button
              onClick={() => setShowTopUp(true)}
              className="w-full bg-white text-[#8B7355] hover:bg-[#F5EBE8] rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Top Up Wallet
            </Button>
          </motion.div>
        </div>
      </div>

      {/* 2x Points Banner */}
      <div className="max-w-lg mx-auto px-5 -mt-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl p-5 shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 opacity-20">
            <Sparkles className="h-32 w-32 text-white" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-white fill-white" />
              <span className="font-bold text-white text-lg">2x Points!</span>
            </div>
            <p className="text-white text-sm">
              Get <strong>double rewards points</strong> when you pay with your wallet balance
            </p>
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 pb-24 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to={createPageUrl("GiftCards")}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-2xl border border-[#E8DED8] p-5 shadow-sm"
            >
              <div className="rounded-xl bg-[#F5EBE8] p-3 w-fit">
                <Gift className="h-6 w-6 text-[#8B7355]" />
              </div>
              <h3 className="font-semibold text-[#5C4A3A] mt-3">Gift Cards</h3>
              <p className="text-xs text-[#8B7355] mt-1">Send to friends</p>
            </motion.div>
          </Link>
          
          <Link to={createPageUrl("Shop")}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-2xl border border-[#E8DED8] p-5 shadow-sm"
            >
              <div className="rounded-xl bg-[#EDE3DF] p-3 w-fit">
                <WalletIcon className="h-6 w-6 text-[#8B7355]" />
              </div>
              <h3 className="font-semibold text-[#5C4A3A] mt-3">Shop Now</h3>
              <p className="text-xs text-[#8B7355] mt-1">Use wallet balance</p>
            </motion.div>
          </Link>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-[#8B7355]" />
            <h3 className="font-semibold text-[#5C4A3A]">Recent Transactions</h3>
          </div>
          
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#8B7355] text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => (
                <div 
                  key={txn.id}
                  className="flex items-center justify-between py-3 border-b border-[#F5EBE8] last:border-0"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#5C4A3A]">
                      {txn.description}
                    </div>
                    <div className="text-xs text-[#C9B8A6] mt-1">
                      {format(new Date(txn.created_date), "MMM d, yyyy • h:mm a")}
                    </div>
                  </div>
                  <div className={`text-right ${txn.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                    <div className="font-bold">
                      {txn.amount > 0 ? "+" : ""}PKR {Math.abs(txn.amount)}
                    </div>
                    <div className="text-xs text-[#8B7355]">
                      Balance: {txn.balance_after}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Up Dialog */}
      <Dialog open={showTopUp} onOpenChange={setShowTopUp}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Top Up Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm text-[#5C4A3A] mb-2 block">Amount (PKR)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="text-lg"
                min="100"
              />
              <p className="text-xs text-[#8B7355] mt-1">Minimum: PKR 100</p>
            </div>

            <div>
              <p className="text-sm text-[#5C4A3A] mb-2">Quick Select</p>
              <div className="grid grid-cols-2 gap-2">
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    onClick={() => setTopUpAmount(amount.toString())}
                    className="py-2 px-4 rounded-xl border-2 border-[#E8DED8] text-[#5C4A3A] font-semibold hover:border-[#8B7355] hover:bg-[#F5EBE8] transition-colors"
                  >
                    PKR {amount}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <Star className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0 fill-amber-600" />
              <p className="text-xs text-amber-900">
                <strong>2x Points Bonus!</strong> Earn double rewards when you use wallet balance for purchases
              </p>
            </div>

            <Button
              onClick={handleTopUp}
              disabled={topUpMutation.isPending}
              className="w-full bg-[#8B7355] hover:bg-[#6B5744] rounded-xl"
            >
              {topUpMutation.isPending ? "Processing..." : "Top Up Now"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}