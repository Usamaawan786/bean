import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Lock, ShieldCheck, ClipboardCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import SyrveReconciliationGrid from "./SyrveReconciliationGrid";

function fmt(n, dp = 2) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

function recompute(line) {
  const theo =
    Number(line.opening_stock) + Number(line.purchases_in) + Number(line.transfers_in) -
    Number(line.transfers_out) - Number(line.sales_deductions) - Number(line.logged_wastage);
  const variance = Math.round((Number(line.actual_closing) - theo) * 1000) / 1000;
  const financialLoss = Math.round(Math.abs(variance) * (Number(line.unit_cost) || 0) * 100) / 100;
  return { ...line, theoretical_closing: Math.round(theo * 1000) / 1000, variance, financial_loss_value: financialLoss };
}

export default function ReconciliationTab() {
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }));
  const [lines, setLines] = useState([]);
  const [surplus, setSurplus] = useState(0);
  const [shortage, setShortage] = useState(0);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [overrideUnlocked, setOverrideUnlocked] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("buildEodReconciliation", { date });
      setLines(res.data.lines);
      setSurplus(res.data.surplus_amount || 0);
      setShortage(res.data.shortage_amount || 0);
      setLocked(res.data.locked);
      setOverrideUnlocked(false);
      setPin("");
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to load reconciliation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  const handleChange = (next) => {
    const recomputed = next.map(recompute);
    setLines(recomputed);
    let s = 0, sh = 0;
    for (const l of recomputed) {
      const amt = Math.abs(l.variance) * (l.unit_cost || 0);
      if (l.variance > 0) s += amt; else if (l.variance < 0) sh += amt;
    }
    setSurplus(Math.round(s * 100) / 100);
    setShortage(Math.round(sh * 100) / 100);
  };

  const readOnly = locked && !overrideUnlocked;

  const handleSubmit = async () => {
    setError("");
    setBusy(true);
    try {
      await base44.functions.invoke("submitEodReconciliation", {
        date,
        lines: lines.map(recompute),
        notes: "",
        manager_pin: locked ? pin : undefined
      });
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to post audit");
    } finally {
      setBusy(false);
    }
  };

  const handleOverride = () => {
    if (pin === "Istuser786") { setOverrideUnlocked(true); setError(""); }
    else setError("Incorrect Manager PIN.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-[#E8DED8] p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#8B7355]">Audit Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-44" />
        </div>
        {locked && !overrideUnlocked && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-red-100 text-red-700">
            <Lock className="h-3.5 w-3.5" /> Posted — Manager PIN required to edit
          </span>
        )}
        {overrideUnlocked && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Override active
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {locked && !overrideUnlocked ? (
            <>
              <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Manager PIN" className="h-9 w-40" />
              <button onClick={handleOverride} className="h-9 px-4 rounded-lg bg-[#6B5744] text-white text-sm font-semibold hover:bg-[#5C4A3A]">Override</button>
            </>
          ) : (
            <button onClick={handleSubmit} disabled={busy || loading} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#8B7355] text-white text-sm font-semibold hover:bg-[#6B5744] disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
              {locked ? "Re-post Audit" : "Post & Lock Audit"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#8B7355]">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Building reconciliation matrix…
        </div>
      ) : lines.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8DED8] p-10 text-center text-[#8B7355]">No inventory items to reconcile.</div>
      ) : (
        <SyrveReconciliationGrid lines={lines} onChange={handleChange} readOnly={readOnly} surplus={surplus} shortage={shortage} />
      )}
    </div>
  );
}