import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Wallet, ReceiptText, LockKeyhole, Clock } from "lucide-react";
import { format } from "date-fns";
import CloseShiftDialog from "./CloseShiftDialog";

const CATEGORIES = ["Supplies", "Cleaning", "Maintenance", "Staff Meals", "Miscellaneous"];

export default function ShiftPanel({ shift, user, onClosed }) {
  const queryClient = useQueryClient();
  const canClose = ["admin", "manager", "super_admin"].includes(user?.role);
  const [entryType, setEntryType] = useState("expense");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showClose, setShowClose] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ["shift-entries", shift?.id],
    queryFn: () => base44.entities.ShiftExpense.filter({ shift_id: shift.id }, "-created_date"),
    enabled: !!shift?.id,
    refetchInterval: 15000
  });

  if (!shift) {
    return (
      <div className="text-center py-16">
        <Clock className="h-10 w-10 text-[#C9B8A6] mx-auto mb-3" />
        <p className="text-[#8B7355] text-sm">No active shift. Open one from the POS tab.</p>
      </div>
    );
  }

  const handleAdd = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (entryType === "expense" && !description.trim()) {
      toast.error("Enter a description");
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.ShiftExpense.create({
        shift_id: shift.id,
        type: entryType,
        description: entryType === "expense" ? description.trim() : "",
        category: entryType === "petty_cash" ? category : undefined,
        amount: amt,
        added_by: user.email,
        added_by_name: user.full_name || user.email
      });
      toast.success(entryType === "expense" ? "Expense recorded" : "Petty cash recorded");
      setDescription("");
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["shift-entries", shift.id] });
    } catch (err) {
      toast.error("Failed to save: " + (err?.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpenses = entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const totalPettyCash = entries.filter(e => e.type === "petty_cash").reduce((s, e) => s + e.amount, 0);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-[#E8DED8] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[#5C4A3A]">{shift.shift_type === "morning" ? "Morning" : "Evening"} Shift</h3>
            <p className="text-xs text-[#8B7355]">Opened by {shift.opened_by_name || shift.opened_by} · {format(new Date(shift.opened_at), "MMM dd, HH:mm")}</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-bold">OPEN</span>
        </div>
        <p className="text-sm text-[#8B7355] mb-1">Opening Float</p>
        <p className="text-2xl font-bold text-[#5C4A3A] mb-4">PKR {Number(shift.opening_float).toFixed(2)}</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#F5EBE8] rounded-xl p-3">
            <p className="text-xs text-[#8B7355]">Expenses</p>
            <p className="font-bold text-[#5C4A3A]">PKR {totalExpenses.toFixed(2)}</p>
          </div>
          <div className="bg-[#F5EBE8] rounded-xl p-3">
            <p className="text-xs text-[#8B7355]">Petty Cash</p>
            <p className="font-bold text-[#5C4A3A]">PKR {totalPettyCash.toFixed(2)}</p>
          </div>
        </div>
        {canClose && (
          <Button onClick={() => setShowClose(true)} className="w-full bg-[#5C4A3A] hover:bg-[#4a3a2c] rounded-xl">
            <LockKeyhole className="h-4 w-4 mr-2" /> Close Shift
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E8DED8] p-6">
        <h3 className="font-semibold text-[#5C4A3A] mb-4">Add Expense / Petty Cash</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button type="button" onClick={() => setEntryType("expense")}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${entryType === "expense" ? "border-[#8B7355] bg-[#F5EBE8] text-[#5C4A3A]" : "border-[#E8DED8] bg-white text-[#8B7355]"}`}>
            <ReceiptText className="h-4 w-4" /> Expense
          </button>
          <button type="button" onClick={() => setEntryType("petty_cash")}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${entryType === "petty_cash" ? "border-[#8B7355] bg-[#F5EBE8] text-[#5C4A3A]" : "border-[#E8DED8] bg-white text-[#8B7355]"}`}>
            <Wallet className="h-4 w-4" /> Petty Cash
          </button>
        </div>

        {entryType === "expense" ? (
          <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="mb-3 border-[#E8DED8]" />
        ) : (
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full mb-3 border border-[#E8DED8] rounded-xl px-3 py-2 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <Input type="number" min="0" placeholder="Amount (PKR)" value={amount} onChange={e => setAmount(e.target.value)} className="mb-4 border-[#E8DED8]" />

        <Button onClick={handleAdd} disabled={submitting} className="w-full bg-[#8B7355] hover:bg-[#6B5744] rounded-xl">
          {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {submitting ? "Saving..." : "Add Entry"}
        </Button>

        <div className="mt-5 space-y-2 max-h-56 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-xs text-[#C9B8A6] text-center py-4">No entries yet</p>
          ) : entries.map(e => (
            <div key={e.id} className="flex items-center justify-between bg-[#F5EBE8] rounded-xl px-3 py-2 text-sm">
              <div>
                <p className="text-[#5C4A3A] font-medium">{e.type === "expense" ? e.description : e.category}</p>
                <p className="text-xs text-[#8B7355]">{e.added_by_name || e.added_by}</p>
              </div>
              <span className="font-bold text-[#5C4A3A]">PKR {e.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {showClose && (
        <CloseShiftDialog
          shift={shift}
          user={user}
          onClose={() => setShowClose(false)}
          onClosed={(closedShift) => { setShowClose(false); onClosed(closedShift); }}
        />
      )}
    </div>
  );
}