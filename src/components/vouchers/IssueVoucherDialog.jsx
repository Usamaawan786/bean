import { useState } from "react";
import { motion } from "framer-motion";
import { X, Ticket, Loader2, Printer } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const PCT_PRESETS = [5, 10, 15, 20, 25];
const VALIDITY_PRESETS = [7, 14, 30, 60];

const chip = (active) =>
  `px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
    active ? "border-[#8B7355] bg-[#F5EBE8] text-[#5C4A3A]" : "border-[#E8DED8] bg-white text-[#8B7355] hover:border-[#C9B8A6]"
  }`;

export default function IssueVoucherDialog({ onClose, onIssued }) {
  const [pct, setPct] = useState(10);
  const [validDays, setValidDays] = useState(30);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [issuing, setIssuing] = useState(false);

  const handleIssue = async () => {
    const discount = Number(pct);
    if (!Number.isFinite(discount) || discount < 1 || discount > 50) {
      toast.error("Discount must be between 1% and 50%");
      return;
    }
    setIssuing(true);
    try {
      const res = await base44.functions.invoke("issueDiscountVoucher", {
        discount_pct: discount,
        valid_days: Number(validDays) || 30,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim(),
        source_bill_number: billNumber.trim(),
      });
      if (res?.data?.error) throw new Error(res.data.error);
      toast.success(`Voucher ${res.data.voucher.code} issued`);
      onIssued(res.data.voucher);
    } catch (err) {
      toast.error("Could not issue voucher: " + (err?.message || "unknown error"));
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto py-8 px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl max-w-md w-full mx-auto p-6">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-[#8B7355]" />
            <h2 className="text-lg font-bold text-[#5C4A3A]">Issue Discount Voucher</h2>
          </div>
          <button onClick={onClose} className="p-2 -mt-1 hover:bg-[#F5EBE8] rounded-full transition-colors">
            <X className="h-5 w-5 text-[#8B7355]" />
          </button>
        </div>
        <p className="text-xs text-[#8B7355] mb-5">
          Hand this to the customer at the end of their meal. The code is generated on the server, is unique, and can be used once.
        </p>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-2 block">Discount</label>
            <div className="flex flex-wrap gap-2">
              {PCT_PRESETS.map(p => (
                <button key={p} type="button" onClick={() => setPct(p)} className={chip(Number(pct) === p)}>{p}%</button>
              ))}
              <div className="flex items-center gap-1">
                <Input type="number" min="1" max="50" value={pct} onChange={e => setPct(e.target.value)}
                  className="w-20 border-[#E8DED8] text-center" />
                <span className="text-sm text-[#8B7355]">%</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-2 block">Valid for</label>
            <div className="flex flex-wrap gap-2">
              {VALIDITY_PRESETS.map(d => (
                <button key={d} type="button" onClick={() => setValidDays(d)} className={chip(Number(validDays) === d)}>
                  {d} days
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Customer name (optional)</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ayesha" className="border-[#E8DED8]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Phone (optional)</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="03xx xxxxxxx" className="border-[#E8DED8]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Bill no. (optional)</label>
                <Input value={billNumber} onChange={e => setBillNumber(e.target.value)} placeholder="Today's bill" className="border-[#E8DED8]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Customer email (optional)</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Only if they're a Bean app member" className="border-[#E8DED8]" />
            </div>
          </div>

          <Button onClick={handleIssue} disabled={issuing} className="w-full bg-[#8B7355] hover:bg-[#6B5744] rounded-xl py-5 font-bold">
            {issuing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            {issuing ? "Issuing…" : "Issue & Print Voucher"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}