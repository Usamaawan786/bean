import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Loader2, Lock, ShieldCheck, ClipboardCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import EodReconciliationGrid from "@/components/eod/EodReconciliationGrid";

function fmt(n, dp = 2) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

// Recompute theoretical, variance and financial loss from a line's editable fields.
function recompute(line) {
  const theo =
    Number(line.opening_stock) +
    Number(line.purchases_in) +
    Number(line.transfers_in) -
    Number(line.transfers_out) -
    Number(line.sales_deductions) -
    Number(line.logged_wastage);
  const variance = Math.round((Number(line.actual_closing) - theo) * 1000) / 1000;
  const financialLoss = Math.round(Math.abs(variance) * (Number(line.unit_cost) || 0) * 100) / 100;
  return { ...line, theoretical_closing: Math.round(theo * 1000) / 1000, variance, financial_loss_value: financialLoss };
}

export default function AdminEodReconciliation() {
  const [user, setUser] = useState(null);
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }));
  const [lines, setLines] = useState([]);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [overrideUnlocked, setOverrideUnlocked] = useState(false);

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me();
      if (!u || !["admin", "manager", "super_admin"].includes(u.role)) {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(u);
    };
    init();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("buildEodReconciliation", { date });
      setLines(res.data.lines);
      setLocked(res.data.locked);
      setOverrideUnlocked(false);
      setPin("");
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to load reconciliation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, date]);

  const handleChange = (next) => setLines(next.map(recompute));

  const readOnly = locked && !overrideUnlocked;

  const totalLoss = useMemo(
    () => lines.reduce((s, l) => s + (l.financial_loss_value || 0), 0),
    [lines]
  );

  const handleSubmit = async () => {
    setError("");
    setBusy(true);
    try {
      const payload = {
        date,
        lines: lines.map(recompute),
        notes: "",
        manager_pin: locked ? pin : undefined
      };
      await base44.functions.invoke("submitEodReconciliation", payload);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to submit audit");
    } finally {
      setBusy(false);
    }
  };

  const handleOverride = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await base44.functions.invoke("verifyManagerPin", { pin });
      if (res.data?.ok) {
        setOverrideUnlocked(true);
      } else {
        setError("Incorrect Manager PIN.");
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "PIN verification failed");
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF] pb-20">
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-7xl mx-auto px-5 pt-6 pb-8">
          <Link to={createPageUrl("AdminInventory")} className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Link>
          <h1 className="text-3xl font-bold mt-3 flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7" /> EOD Inventory Reconciliation
          </h1>
          <p className="text-[#E8DED8] text-sm mt-1">Nightly closing audit · variance detection · immutable ledger</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-[#E8DED8] p-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#8B7355]">Audit Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-44"
            />
          </div>
          {locked && !overrideUnlocked && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-red-100 text-red-700">
              <Lock className="h-3.5 w-3.5" /> Locked — Manager PIN required to edit
            </span>
          )}
          {overrideUnlocked && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Override active — re-submit to re-lock
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {locked && !overrideUnlocked ? (
              <>
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Manager PIN"
                  className="h-9 w-40"
                />
                <button
                  onClick={handleOverride}
                  className="h-9 px-4 rounded-lg bg-[#6B5744] text-white text-sm font-semibold hover:bg-[#5C4A3A]"
                >
                  Override
                </button>
              </>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={busy || loading}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#8B7355] text-white text-sm font-semibold hover:bg-[#6B5744] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Lock & Submit Nightly Audit
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#8B7355]">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Building reconciliation matrix…
          </div>
        ) : lines.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8DED8] p-10 text-center text-[#8B7355]">
            No inventory items to reconcile.
          </div>
        ) : (
          <>
            <EodReconciliationGrid lines={lines} onChange={handleChange} readOnly={readOnly} />
            <div className="flex justify-end text-sm text-[#8B7355]">
              Total financial loss for {date}: <span className="font-bold text-[#5C4A3A] ml-1">PKR {fmt(totalLoss, 2)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}