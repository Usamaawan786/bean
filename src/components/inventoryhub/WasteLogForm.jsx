import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const REASONS = ["Spoilage", "Expired", "Drop", "Preparation Waste", "Staff Consumption", "Other"];

function fmt(n, dp = 2) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

export default function WasteLogForm({ inventoryItems, onLogged }) {
  const [rawId, setRawId] = useState("");
  const [weight, setWeight] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const raw = inventoryItems.find((i) => i.id === rawId);
  const rawUnit = raw?.base_unit || "";
  const rawCost = raw ? (raw.moving_average_cost || raw.cost_per_base_unit || 0) : 0;
  const weightNum = Number(weight) || 0;
  const lossValue = weightNum * rawCost;
  const canSubmit = rawId && weightNum > 0 && reason && !busy;

  const handleSubmit = async () => {
    setError("");
    if (!canSubmit) {
      if (!reason) setError("Select a reason for disposal.");
      else if (!(weightNum > 0)) setError("Enter a waste weight greater than zero.");
      else setError("Select a raw ingredient.");
      return;
    }
    setBusy(true);
    try {
      const res = await base44.functions.invoke("logWaste", {
        raw_item_id: rawId,
        waste_weight: weightNum,
        reason,
        notes
      });
      onLogged?.(res.data);
      setRawId(""); setWeight(""); setReason(""); setNotes("");
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to log waste");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8DED8] p-5 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
          <Trash2 className="h-4 w-4 text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-[#5C4A3A]">Log Waste / Disposal</h3>
          <p className="text-xs text-[#8B7355]">Record disposal of a raw ingredient and the reason — keeps yield percentages accurate.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Raw Ingredient</Label>
          <select
            value={rawId}
            onChange={(e) => setRawId(e.target.value)}
            className="mt-1 w-full h-9 rounded-md border border-[#E8DED8] bg-white px-2 text-sm text-[#5C4A3A]"
          >
            <option value="">— select raw item —</option>
            {inventoryItems.map((i) => (
              <option key={i.id} value={i.id}>{i.name} ({i.base_unit})</option>
            ))}
          </select>
          {raw && (
            <p className="text-[11px] text-[#8B7355] mt-1">
              Stock: {fmt(raw.current_stock_base_qty, 3)} {rawUnit} · Cost: PKR {fmt(rawCost, 2)}/{rawUnit}
            </p>
          )}
        </div>
        <div>
          <Label className="text-xs">Reason for Disposal</Label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full h-9 rounded-md border border-[#E8DED8] bg-white px-2 text-sm text-[#5C4A3A]"
          >
            <option value="">— select reason —</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Waste Weight {rawUnit && `(${rawUnit})`}</Label>
          <Input type="number" min="0" step="any" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1" placeholder="0" />
        </div>
        <div className="flex items-end">
          <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 w-full">
            <div className="text-[11px] text-red-700">Estimated loss value</div>
            <div className="text-lg font-bold text-red-700">PKR {fmt(lossValue, 2)}</div>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details (e.g. batch id, cause)" className="mt-1" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-red-600 hover:bg-red-700 text-white">
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
          Log Waste
        </Button>
      </div>
    </div>
  );
}