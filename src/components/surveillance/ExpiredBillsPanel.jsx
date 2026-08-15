import { useState } from "react";
import { Clock, RotateCcw, Star, X, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { utcToPktDisplay } from "@/lib/pktTime";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

// Bills whose QR window (2h) has passed but were never scanned.
// Admins can re-allocate the same points to an upset customer from here.
export default function ExpiredBillsPanel({ sales }) {
  const now = new Date();
  const expired = sales
    .filter((s) => !s.is_scanned && s.qr_expires_at && new Date(s.qr_expires_at) < now)
    .sort((a, b) => new Date(b.qr_expires_at) - new Date(a.qr_expires_at));

  const reallocated = sales.filter((s) => s.reallocated_by);

  const [dialogSale, setDialogSale] = useState(null);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const reallocateMutation = useMutation({
    mutationFn: async ({ sale_id, customer_email, reason }) => {
      const res = await base44.functions.invoke("reallocateExpiredPoints", { sale_id, customer_email, reason });
      if (!res?.data?.success) throw new Error(res?.data?.error || "Re-allocation failed");
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`${data.points_awarded} pts re-allocated for bill ${data.bill_number}`);
      setDialogSale(null);
      setEmail("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["surv-sales"] });
      queryClient.invalidateQueries({ queryKey: ["surv-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["surv-activities"] });
    },
    onError: (err) => toast.error(err.message || "Re-allocation failed")
  });

  const openDialog = (sale) => {
    setDialogSale(sale);
    setEmail(sale.customer_name ? "" : "");
    setReason("");
  };

  const submit = () => {
    if (!email.trim() || !reason.trim()) {
      toast.error("Customer email and reason are required");
      return;
    }
    reallocateMutation.mutate({ sale_id: dialogSale.id, customer_email: email.trim(), reason: reason.trim() });
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-[#E8DED8] p-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2 bg-red-50 text-red-600"><Clock className="h-4 w-4" /></div>
          <div className="text-2xl font-bold text-[#5C4A3A]">{expired.length}</div>
          <div className="text-xs text-[#8B7355]">Expired Unscanned Bills</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8DED8] p-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2 bg-amber-50 text-amber-600"><Star className="h-4 w-4" /></div>
          <div className="text-2xl font-bold text-[#5C4A3A]">{expired.reduce((s, r) => s + (r.points_awarded || 0), 0)}</div>
          <div className="text-xs text-[#8B7355]">Points at Risk (unclaimed)</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8DED8] p-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2 bg-emerald-50 text-emerald-600"><RotateCcw className="h-4 w-4" /></div>
          <div className="text-2xl font-bold text-[#5C4A3A]">{reallocated.length}</div>
          <div className="text-xs text-[#8B7355]">Re-allocated by Admin</div>
        </div>
      </div>

      {/* Expired bills table */}
      <div>
        <h3 className="font-semibold text-[#5C4A3A] text-sm mb-2 flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-red-500" /> Expired Bills Awaiting Re-allocation ({expired.length})
        </h3>
        <p className="text-xs text-[#8B7355] mb-3">
          These bills passed the 3-hour scan window without being scanned. Use "Re-allocate" to award the same points to an upset customer — every re-allocation is logged in the permanent audit trail.
        </p>
        {expired.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 text-center">
            No expired unscanned bills — all points were claimed in time.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5EBE8]">
                <tr>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Bill #</th>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Cashier</th>
                  <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Total</th>
                  <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Points</th>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Sale Time (PKT)</th>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Expired (PKT)</th>
                  <th className="text-center px-3 py-3 text-[#8B7355] font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {expired.map((s) => (
                  <tr key={s.id} className="border-t border-[#F5EBE8] hover:bg-[#FDF9F7]">
                    <td className="px-3 py-2.5 font-mono font-bold text-[#5C4A3A] whitespace-nowrap">{s.bill_number || "—"}</td>
                    <td className="px-3 py-2.5 text-[#8B7355] truncate max-w-[140px]">{s.cashier_name || s.cashier_email || "—"}</td>
                    <td className="px-3 py-2.5 text-right text-[#5C4A3A]">PKR {Number(s.total_amount || 0).toFixed(0)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="flex items-center justify-end gap-1 font-bold text-[#5C4A3A]">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />{s.points_awarded || 0}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[#8B7355] whitespace-nowrap">{utcToPktDisplay(s.created_date)}</td>
                    <td className="px-3 py-2.5 text-red-600 whitespace-nowrap">{utcToPktDisplay(s.qr_expires_at)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Button size="sm" onClick={() => openDialog(s)} className="rounded-lg bg-[#8B7355] hover:bg-[#6B5744] text-xs">
                        <RotateCcw className="h-3 w-3 mr-1" /> Re-allocate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Re-allocation history */}
      {reallocated.length > 0 && (
        <div>
          <h3 className="font-semibold text-[#5C4A3A] text-sm mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Re-allocation History ({reallocated.length})
          </h3>
          <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5EBE8]">
                <tr>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Bill #</th>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Customer</th>
                  <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Points</th>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Admin</th>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Reason</th>
                  <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">When (PKT)</th>
                </tr>
              </thead>
              <tbody>
                {reallocated.sort((a, b) => new Date(b.reallocated_at) - new Date(a.reallocated_at)).map((s) => (
                  <tr key={s.id} className="border-t border-[#F5EBE8]">
                    <td className="px-3 py-2.5 font-mono font-bold text-[#5C4A3A]">{s.bill_number}</td>
                    <td className="px-3 py-2.5 text-[#5C4A3A] truncate max-w-[160px]">{s.scanned_by}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-[#5C4A3A]">{s.points_awarded || 0}</td>
                    <td className="px-3 py-2.5 text-[#8B7355] truncate max-w-[140px]">{s.reallocated_by}</td>
                    <td className="px-3 py-2.5 text-[#8B7355] max-w-[200px] truncate" title={s.reallocated_reason}>{s.reallocated_reason}</td>
                    <td className="px-3 py-2.5 text-[#8B7355] whitespace-nowrap">{utcToPktDisplay(s.reallocated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Re-allocate dialog */}
      <Dialog open={!!dialogSale} onOpenChange={(open) => !open && setDialogSale(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#5C4A3A]">
              <RotateCcw className="h-5 w-5 text-[#8B7355]" /> Re-allocate Expired Points
            </DialogTitle>
          </DialogHeader>
          {dialogSale && (
            <div className="space-y-4">
              <div className="bg-[#F5EBE8] rounded-xl p-3 text-sm">
                <div className="flex justify-between mb-1"><span className="text-[#8B7355]">Bill</span><span className="font-bold font-mono text-[#5C4A3A]">{dialogSale.bill_number}</span></div>
                <div className="flex justify-between mb-1"><span className="text-[#8B7355]">Total</span><span className="font-bold text-[#5C4A3A]">PKR {Number(dialogSale.total_amount || 0).toFixed(0)}</span></div>
                <div className="flex justify-between"><span className="text-[#8B7355]">Points to award</span><span className="font-bold text-amber-600">{dialogSale.points_awarded || 0} pts</span></div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#8B7355] mb-1 block">Customer Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full rounded-xl border border-[#E8DED8] px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#8B7355] mb-1 block">Reason (required — logged permanently)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Customer missed the 3-hour window and requested points be added"
                  rows={3}
                  className="w-full rounded-xl border border-[#E8DED8] px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355] resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogSale(null)} className="rounded-xl">Cancel</Button>
                <Button onClick={submit} disabled={reallocateMutation.isPending} className="rounded-xl bg-[#8B7355] hover:bg-[#6B5744]">
                  {reallocateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Re-allocating…</> : <><RotateCcw className="h-4 w-4 mr-2" />Re-allocate Points</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}