import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Gift, Send, Check, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";

export default function GiftCards() {
  const [user, setUser] = useState(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const queryClient = useQueryClient();

  const [giftData, setGiftData] = useState({
    amount: "",
    recipient_email: "",
    recipient_name: "",
    message: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
    };
    loadUser();
  }, []);

  const { data: sentGiftCards = [] } = useQuery({
    queryKey: ["sent-gift-cards", user?.email],
    queryFn: () => base44.entities.GiftCard.filter({ sender_email: user?.email }, "-created_date"),
    enabled: !!user?.email
  });

  const { data: receivedGiftCards = [] } = useQuery({
    queryKey: ["received-gift-cards", user?.email],
    queryFn: () => base44.entities.GiftCard.filter({ recipient_email: user?.email }, "-created_date"),
    enabled: !!user?.email
  });

  const sendGiftMutation = useMutation({
    mutationFn: async (data) => {
      const code = "GIFT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      
      await base44.entities.GiftCard.create({
        code,
        amount: parseFloat(data.amount),
        sender_email: user.email,
        sender_name: user.full_name,
        recipient_email: data.recipient_email,
        recipient_name: data.recipient_name,
        message: data.message,
        status: "sent"
      });

      return code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries(["sent-gift-cards"]);
      setShowSendDialog(false);
      setGiftData({ amount: "", recipient_email: "", recipient_name: "", message: "" });
      toast.success(`Gift card sent! Code: ${code}`);
    }
  });

  const redeemMutation = useMutation({
    mutationFn: async (code) => {
      const giftCards = await base44.entities.GiftCard.filter({ code, status: "sent" });
      
      if (giftCards.length === 0) {
        throw new Error("Invalid or already redeemed gift card");
      }

      const giftCard = giftCards[0];

      if (giftCard.recipient_email !== user.email) {
        throw new Error("This gift card is not for you");
      }

      // Get or create wallet
      const wallets = await base44.entities.Wallet.filter({ created_by: user.email });
      let wallet;
      if (wallets.length > 0) {
        wallet = wallets[0];
      } else {
        wallet = await base44.entities.Wallet.create({
          balance: 0,
          total_topped_up: 0
        });
      }

      const newBalance = wallet.balance + giftCard.amount;

      // Update wallet
      await base44.entities.Wallet.update(wallet.id, {
        balance: newBalance
      });

      // Create transaction
      await base44.entities.WalletTransaction.create({
        user_email: user.email,
        type: "gift_card_redeem",
        amount: giftCard.amount,
        balance_after: newBalance,
        description: `Gift card from ${giftCard.sender_name}`,
        metadata: { gift_card_code: code }
      });

      // Mark gift card as redeemed
      await base44.entities.GiftCard.update(giftCard.id, {
        status: "redeemed",
        redeemed_at: new Date().toISOString(),
        redeemed_by: user.email
      });

      return giftCard.amount;
    },
    onSuccess: (amount) => {
      queryClient.invalidateQueries(["received-gift-cards"]);
      setShowRedeemDialog(false);
      setRedeemCode("");
      toast.success(`PKR ${amount} added to your wallet! 🎉`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const giftAmounts = [500, 1000, 2000, 5000];

  const handleSendGift = () => {
    if (!giftData.amount || parseFloat(giftData.amount) < 100) {
      toast.error("Minimum gift amount is PKR 100");
      return;
    }
    if (!giftData.recipient_email) {
      toast.error("Please enter recipient email");
      return;
    }
    sendGiftMutation.mutate(giftData);
  };

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="max-w-lg mx-auto px-5 pt-6 pb-12 relative z-10">
          <Link 
            to={createPageUrl("Profile")}
            className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-6 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 backdrop-blur"
            >
              <Gift className="h-10 w-10" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-2">Buy Coffee for Someone Special</h1>
            <p className="text-[#E8DED8] text-lg">
              Surprise your friends, family, or loved ones with the gift of great coffee
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 -mt-6 pb-24 space-y-6">
        {/* Hero CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-rose-400 via-pink-400 to-orange-400 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 opacity-20">
            <Gift className="h-48 w-48" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Make Someone's Day ☕</h2>
            <p className="text-white/90 mb-6">
              Whether it's your mom, best friend, or that special someone - nothing says "I'm thinking of you" like a warm cup of coffee
            </p>
            <Button
              onClick={() => setShowSendDialog(true)}
              size="lg"
              className="w-full bg-white text-pink-600 hover:bg-pink-50 rounded-2xl h-14 text-base font-bold shadow-lg"
            >
              <Send className="h-5 w-5 mr-2" />
              Send a Gift Card Now
            </Button>
          </div>
        </motion.div>

        {/* Have a Gift Card? */}
        <Button
          onClick={() => setShowRedeemDialog(true)}
          variant="outline"
          className="w-full border-2 border-[#8B7355] text-[#8B7355] hover:bg-[#F5EBE8] rounded-2xl h-12"
        >
          <Gift className="h-5 w-5 mr-2" />
          Have a gift card? Redeem here
        </Button>

        {/* Why Gift Cards Section */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 space-y-4">
          <h3 className="font-bold text-[#5C4A3A] text-lg">Perfect For:</h3>
          <div className="space-y-3">
            {[
              { emoji: "🎂", text: "Birthdays & Celebrations" },
              { emoji: "💝", text: "Valentine's Day" },
              { emoji: "👨‍👩‍👧‍👦", text: "Family & Friends" },
              { emoji: "🙏", text: "Thank You Gifts" },
              { emoji: "🎄", text: "Holidays & Special Occasions" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="text-2xl">{item.emoji}</div>
                <div className="text-[#5C4A3A]">{item.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gift Cards List */}
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white border border-[#E8DED8] rounded-2xl p-1">
            <TabsTrigger value="received" className="rounded-xl">Received</TabsTrigger>
            <TabsTrigger value="sent" className="rounded-xl">Sent</TabsTrigger>
          </TabsList>
          
          <TabsContent value="received" className="mt-4 space-y-3">
            {receivedGiftCards.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E8DED8] p-8 text-center">
                <Gift className="h-12 w-12 text-[#C9B8A6] mx-auto mb-3" />
                <p className="text-[#8B7355]">No gift cards received yet</p>
              </div>
            ) : (
              receivedGiftCards.map(card => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-[#E8DED8] p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-lg font-bold text-[#5C4A3A]">PKR {card.amount}</div>
                      <div className="text-sm text-[#8B7355]">From {card.sender_name}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      card.status === "redeemed" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {card.status === "redeemed" ? "Redeemed" : "Available"}
                    </span>
                  </div>
                  {card.message && (
                    <p className="text-sm text-[#6B5744] bg-[#F5EBE8] rounded-xl p-3 mb-3">
                      "{card.message}"
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-[#C9B8A6]">
                    <span>{format(new Date(card.created_date), "MMM d, yyyy")}</span>
                    <code className="bg-[#F5EBE8] px-2 py-1 rounded text-[#8B7355]">{card.code}</code>
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="sent" className="mt-4 space-y-3">
            {sentGiftCards.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E8DED8] p-8 text-center">
                <Send className="h-12 w-12 text-[#C9B8A6] mx-auto mb-3" />
                <p className="text-[#8B7355]">No gift cards sent yet</p>
              </div>
            ) : (
              sentGiftCards.map(card => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-[#E8DED8] p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-lg font-bold text-[#5C4A3A]">PKR {card.amount}</div>
                      <div className="text-sm text-[#8B7355]">To {card.recipient_name}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      card.status === "redeemed" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {card.status === "redeemed" ? "Redeemed" : "Sent"}
                    </span>
                  </div>
                  <div className="text-xs text-[#C9B8A6]">
                    {format(new Date(card.created_date), "MMM d, yyyy")}
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Send Gift Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              <div className="text-3xl mb-2">☕💝</div>
              Send Coffee Love
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm text-[#5C4A3A] mb-2 block">Amount (PKR)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={giftData.amount}
                onChange={(e) => setGiftData(prev => ({ ...prev, amount: e.target.value }))}
                min="100"
              />
              <div className="grid grid-cols-4 gap-2 mt-2">
                {giftAmounts.map(amount => (
                  <button
                    key={amount}
                    onClick={() => setGiftData(prev => ({ ...prev, amount: amount.toString() }))}
                    className="py-1.5 text-xs rounded-lg border border-[#E8DED8] text-[#5C4A3A] hover:border-[#8B7355] hover:bg-[#F5EBE8]"
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-[#5C4A3A] mb-2 block">Who's this for?</label>
              <Input
                placeholder="e.g., Mom, Sarah, Best Friend"
                value={giftData.recipient_name}
                onChange={(e) => setGiftData(prev => ({ ...prev, recipient_name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm text-[#5C4A3A] mb-2 block">Their Email</label>
              <Input
                type="email"
                placeholder="their@email.com"
                value={giftData.recipient_email}
                onChange={(e) => setGiftData(prev => ({ ...prev, recipient_email: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm text-[#5C4A3A] mb-2 block">Personal Message</label>
              <Textarea
                placeholder="e.g., Happy Birthday! Enjoy a coffee on me ☕"
                value={giftData.message}
                onChange={(e) => setGiftData(prev => ({ ...prev, message: e.target.value }))}
                className="h-20"
              />
            </div>

            <Button
              onClick={handleSendGift}
              disabled={sendGiftMutation.isPending}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl h-12 font-bold"
            >
              {sendGiftMutation.isPending ? "Sending..." : "🎁 Send Gift Card"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redeem Dialog */}
      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Redeem Gift Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm text-[#5C4A3A] mb-2 block">Gift Card Code</label>
              <Input
                placeholder="GIFT-XXXXXXXX"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
            </div>

            <Button
              onClick={() => redeemMutation.mutate(redeemCode)}
              disabled={redeemMutation.isPending || !redeemCode}
              className="w-full bg-[#8B7355] hover:bg-[#6B5744] rounded-xl"
            >
              {redeemMutation.isPending ? "Redeeming..." : "Redeem Now"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}