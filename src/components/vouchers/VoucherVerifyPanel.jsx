import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle, XCircle, AlertTriangle, Ban, Loader2, Ticket, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

// Counter-side verification of a discount voucher. Verification is a read; the
// redeem below is the atomic, once-only call — the backend refuses a voucher that
// has already been used, has lapsed, or was voided.
export default function VoucherVerifyPanel({ onRedeemed }) {
  const [codeInput, setCodeInput] = useState("");
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const call = async (action) => {
    const code = codeInput.trim().toUpperCase();
    if (!code) { toast.error("Enter the voucher code"); return null; }
    const res = await base44.functions.invoke("redeemDiscountVoucher", { code, action });
    if (res?.data?.error) throw new Error(res.data.error);
    return res.data;
  };

  const handleVerify = async () => {
    setChecking(true); setResult(null);
    try { setResult(await call("verify")); }
    catch (e) { toast.error("Verification failed: " + (e?.message || "unknown")); }
    finally { setChecking(false); }
  };

  const handleRedeem = async () => {
    setRedeeming(true);
    try {
      const data = await call("redeem");
      setResult(data);
      if (data?.redeemed) {
        toast.success(`${data.voucher.discount_pct}% voucher honoured — code is now used`);
        setCodeInput("");
        onRedeemed?.();
      } else {
        toast.error(
          data?.reason === "already_redeemed" ? "Already redeemed — do not honour again"
            : data?.reason === "expired" ? "Expired — do not honour"
              : "Could not redeem this voucher"
        );
      }
    } catch (e) {
      toast.error("Redeem failed: " + (e?.message || "unknown"));
    } finally { setRedeeming(false); }
  };

  const state = result?.redeemed ? "redeemed" : result?.valid ? "valid" : result?.reason;

  return (
    <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm">
      <h2 className="font-bold text-[#5C4A3A] mb-1 flex items-center gap-2">
        <Ticket className="h-5 w-5 text-[#8B7355]" /> Verify Discount Voucher
      </h2>
      <p className="text-sm text-[#8B7355] mb-4">Type the code printed on the customer's voucher card to check it, then honour it once.</p>

      <div className="flex gap-3">
        <Input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && handleVerify()}
          placeholder="BEAN-XXXX-XXXX"
          className="font-mono text-base tracking-widest border-[#E8DED8] uppercase" />
        <Button onClick={handleVerify} disabled={checking} className="bg-[#5C4A3A] hover:bg-[#4A3829] px-6 rounded-xl gap-2">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Verify
        </Button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`mt-4 rounded-2xl border-2 p-5 ${
              state === "valid" ? "bg-green-50 border-green-300"
                : state === "not_found" ? "bg-red-50 border-red-200"
                  : state === "redeemed" ? "bg-gray-50 border-gray-300"
                    : "bg-red-50 border-red-300"
            }`}>

            {state === "not_found" && (
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-red-500" />
                <div>
                  <p className="font-semibold text-red-700">Voucher Not Found</p>
                  <p className="text-sm text-red-500">No voucher matches this code. Do not honour it.</p>
                </div>
              </div>
            )}

            {state !== "not_found" && (
              <>
                {state === "valid" && <div className="flex items-center gap-2 mb-4 text-green-700 font-bold"><CheckCircle className="h-6 w-6" /> Valid Voucher — offer the discount, then redeem it</div>}
                {state === "redeemed" && <div className="flex items-center gap-2 mb-4 text-gray-600 font-bold"><AlertTriangle className="h-6 w-6" /> Already Redeemed — do NOT honour again</div>}
                {state === "already_redeemed" && <div className="flex items-center gap-2 mb-4 text-gray-600 font-bold"><AlertTriangle className="h-6 w-6" /> Already Redeemed — do NOT honour again</div>}
                {state === "expired" && <div className="flex items-center gap-2 mb-4 text-red-600 font-bold"><Clock className="h-6 w-6" /> Expired — do not honour</div>}
                {state === "voided" && <div className="flex items-center gap-2 mb-4 text-red-700 font-bold"><Ban className="h-6 w-6" /> Voided — do not honour</div>}
                {result.voucher?.void_reason && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    <strong>Void reason:</strong> {result.voucher.void_reason}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div><p className="text-[#8B7355] text-xs">Code</p><p className="font-mono font-bold text-[#5C4A3A] tracking-widest">{result.voucher?.code}</p></div>
                  <div><p className="text-[#8B7355] text-xs">Discount</p><p className="font-bold text-[#5C4A3A]">{result.voucher?.discount_pct}% off</p></div>
                  <div><p className="text-[#8B7355] text-xs">Customer</p><p className="font-medium text-[#5C4A3A]">{result.voucher?.customer_name || result.voucher?.customer_phone || "Walk-in"}</p></div>
                  <div><p className="text-[#8B7355] text-xs">Issued by</p><p className="font-medium text-[#5C4A3A]">{result.voucher?.issued_by_name || "—"}</p></div>
                  <div><p className="text-[#8B7355] text-xs">Valid until</p><p className="font-medium text-[#5C4A3A]">{result.voucher?.expires_at ? format(new Date(result.voucher.expires_at), "d MMM yyyy") : "—"}</p></div>
                  {result.voucher?.redeemed_at && (
                    <div><p className="text-[#8B7355] text-xs">Redeemed</p><p className="font-medium text-[#5C4A3A]">{format(new Date(result.voucher.redeemed_at), "d MMM, h:mm a")} · {result.voucher.redeemed_by_name || "—"}</p></div>
                  )}
                </div>

                {state === "valid" && (
                  <Button onClick={handleRedeem} disabled={redeeming} className="w-full bg-green-600 hover:bg-green-700 rounded-xl py-5 font-bold">
                    {redeeming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    {redeeming ? "Redeeming…" : `Redeem ${result.voucher?.discount_pct}% Voucher (use once)`}
                  </Button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}