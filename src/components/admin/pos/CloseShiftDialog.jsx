import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function CloseShiftDialog({ shift, user, onClose, onClosed }) {
  const [closingFloat, setClosingFloat] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["shift-sales", shift.id],
    queryFn: () => base44.entities.StoreSale.filter({ shift_id: shift.id })
  });
  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["shift-entries", shift.id],
    queryFn: () => base44.entities.ShiftExpense.filter({ shift_id: shift.id })
  });

  const isLoading = loadingSales || loadingEntries;
  const sum = (arr, key) => arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);

  const cashSales = sales.filter(s => s.payment_method === "Cash");
  const cardSales = sales.filter(s => s.payment_method === "Card");
  const compSales = sales.filter(s => s.payment_method === "Complimentary");
  const totalExpenses = sum(entries.filter(e => e.type === "expense"), "amount");
  const totalPettyCash = sum(entries.filter(e => e.type === "petty_cash"), "amount");
  const cashTotal = sum(cashSales, "total_amount");
  const expectedDrawer = Number(shift.opening_float || 0) + cashTotal - totalPettyCash - totalExpenses;
  const closingNum = Number(closingFloat) || 0;
  const variance = closingNum - expectedDrawer;

  const handleConfirm = async () => {
    if (closingFloat === "" || !Number.isFinite(Number(closingFloat))) {
      toast.error("Enter the counted closing float");
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Shift.update(shift.id, {
        status: "closed",
        closing_float: closingNum,
        cash_variance: variance,
        closed_by: user.email,
        closed_by_name: user.full_name || user.email,
        closed_at: new Date().toISOString()
      });
      toast.success("Shift closed");
      onClosed({
        ...shift,
        status: "closed",
        closing_float: closingNum,
        cash_variance: variance,
        closed_by: user.email,
        closed_by_name: user.full_name || user.email,
        closed_at: new Date().toISOString()
      });
    } catch (err) {
      toast.error("Failed to close shift: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#5C4A3A]">Close Shift</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-[#8B7355] text-center py-6">Loading summary...</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#F5EBE8] rounded-xl p-3">
                <p className="text-xs text-[#8B7355]">Cash</p>
                <p className="font-bold text-[#5C4A3A] text-sm">PKR {cashTotal.toFixed(0)}</p>
                <p className="text-[10px] text-[#C9B8A6]">{cashSales.length} sale(s)</p>
              </div>
              <div className="bg-[#F5EBE8] rounded-xl p-3">
                <p className="text-xs text-[#8B7355]">Card</p>
                <p className="font-bold text-[#5C4A3A] text-sm">PKR {sum(cardSales, "total_amount").toFixed(0)}</p>
                <p className="text-[10px] text-[#C9B8A6]">{cardSales.length} sale(s)</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-xs text-purple-700">Complimentary</p>
                <p className="font-bold text-purple-800 text-sm">{compSales.length}</p>
                <p className="text-[10px] text-purple-500">PKR {sum(compSales, "original_subtotal").toFixed(0)} value</p>
              </div>
            </div>
            <div className="flex justify-between text-sm px-1"><span className="text-[#8B7355]">Total Expenses</span><span className="text-[#5C4A3A] font-medium">PKR {totalExpenses.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm px-1"><span className="text-[#8B7355]">Total Petty Cash</span><span className="text-[#5C4A3A] font-medium">PKR {totalPettyCash.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm px-1 border-t border-[#E8DED8] pt-2"><span className="text-[#8B7355]">Opening Float</span><span className="text-[#5C4A3A] font-medium">PKR {Number(shift.opening_float).toFixed(2)}</span></div>
            <div className="flex justify-between text-sm px-1 font-semibold"><span className="text-[#5C4A3A]">Expected Drawer</span><span className="text-[#5C4A3A]">PKR {expectedDrawer.toFixed(2)}</span></div>

            <div className="pt-2">
              <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Closing Float (Actual counted PKR)</label>
              <Input type="number" value={closingFloat} onChange={e => setClosingFloat(e.target.value)} placeholder="e.g. 12000" className="border-[#E8DED8]" />
            </div>

            {closingFloat !== "" && (
              <div className={`rounded-xl p-3 text-center font-bold ${variance >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                Variance: {variance >= 0 ? "+" : ""}PKR {variance.toFixed(2)}
              </div>
            )}

            <Button onClick={handleConfirm} disabled={saving} className="w-full bg-[#5C4A3A] hover:bg-[#4a3a2c] rounded-xl mt-2">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {saving ? "Closing..." : "Confirm & Close Shift"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}