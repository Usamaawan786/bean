import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Gift, Loader2, Printer, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { printRedemptionVoucher } from "@/lib/redemptionVoucher";

// Shows the customer's own redemption codes (the ones they redeemed on the
// Rewards page) so they can retrieve a code to show the barista even after the
// one-time success dialog has closed. Each code is honoured once at the counter.
export default function MyRedemptions({ customerEmail }) {
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!customerEmail) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await base44.entities.Redemption.filter({ customer_email: customerEmail });
      // Pending (unclaimed) first, then newest first.
      list.sort((a, b) => {
        const ap = a.status === "pending" ? 0 : 1;
        const bp = b.status === "pending" ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return new Date(b.created_date) - new Date(a.created_date);
      });
      setRedemptions(list);
    } catch (e) {
      setRedemptions([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerEmail]);

  const pending = redemptions.filter(r => r.status === "pending");

  return (
    <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm space-y-4">
      <h3 className="font-semibold text-[#5C4A3A] flex items-center gap-2">
        <Ticket className="h-5 w-5 text-[#8B7355]" /> My Reward Codes
      </h3>
      <p className="text-sm text-[#8B7355]">
        Show these codes to our barista to claim your rewards. Each code works once.
      </p>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#8B7355]" />
        </div>
      ) : pending.length === 0 ? (
        <div className="text-center py-4 text-sm text-[#C9B8A6]">
          No unclaimed rewards yet. Redeem your points on the Rewards page to get a code.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(r => (
            <div key={r.id} className="bg-[#F5EBE8] rounded-2xl p-4 border border-[#E8DED8]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Gift className="h-4 w-4 text-[#8B7355] flex-shrink-0" />
                  <span className="font-semibold text-[#5C4A3A] text-sm truncate">{r.reward_name}</span>
                </div>
                <span className="text-xs text-[#8B7355] flex-shrink-0 ml-2">{r.points_spent} pts</span>
              </div>
              <div className="bg-white rounded-xl py-3 text-center mb-3">
                <p className="text-[10px] text-[#C9B8A6] mb-1">Show this code</p>
                <code className="text-xl font-bold text-[#5C4A3A] tracking-widest">{r.redemption_code}</code>
              </div>
              <Button
                onClick={() => printRedemptionVoucher({
                  reward_name: r.reward_name,
                  points_spent: r.points_spent,
                  redemption_code: r.redemption_code,
                  customer_email: customerEmail,
                  date: new Date(r.created_date).toLocaleString()
                })}
                variant="outline"
                className="w-full rounded-xl border-[#E8DED8] text-[#8B7355] hover:bg-[#F5EBE8] gap-2"
              >
                <Printer className="h-4 w-4" /> Print / Save Voucher
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}