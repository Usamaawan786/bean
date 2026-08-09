import { useState } from "react";
import { Ban, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Voids a fraudulent redemption so it can never be honoured at the counter.
// The points are NOT refunded (they were fraudulently earned). The void reason
// is stored permanently on the redemption record.
export default function VoidRedemptionDialog({ redemption, onConfirm, onClose, pending }) {
  const [reason, setReason] = useState("");

  const submit = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={!!redemption} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Ban className="h-5 w-5" /> Void Fraudulent Redemption
          </DialogTitle>
        </DialogHeader>
        {redemption && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">
                Voiding this redemption permanently invalidates the code — the customer will <strong>not</strong> be able to collect the item at the counter. The spent points are <strong>not refunded</strong> (they were fraudulently earned). This action cannot be undone.
              </p>
            </div>
            <div className="bg-[#F5EBE8] rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-[#8B7355]">Code</span><span className="font-mono font-bold text-[#5C4A3A]">{redemption.redemption_code}</span></div>
              <div className="flex justify-between"><span className="text-[#8B7355]">Reward</span><span className="font-bold text-[#5C4A3A]">{redemption.reward_name}</span></div>
              <div className="flex justify-between"><span className="text-[#8B7355]">Customer</span><span className="text-[#5C4A3A] truncate max-w-[180px]">{redemption.customer_email}</span></div>
              <div className="flex justify-between"><span className="text-[#8B7355]">Points spent</span><span className="font-bold text-amber-600">{redemption.points_spent} pts</span></div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8B7355] mb-1 block">Reason (required — recorded permanently)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Points were earned via fraudulent self-scan — redemption cancelled to prevent theft"
                rows={3}
                className="w-full rounded-xl border border-[#E8DED8] px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
              <Button onClick={submit} disabled={pending || !reason.trim()} className="rounded-xl bg-red-600 hover:bg-red-700">
                {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Voiding…</> : <><Ban className="h-4 w-4 mr-2" />Void Redemption</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}