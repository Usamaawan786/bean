import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Scissors, TrendingDown, Percent, Coins } from "lucide-react";
import { base44 } from "@/api/base44Client";

function fmt(n, dp = 2) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

export default function YieldProcessingForm({ inventoryItems, onProcessed }) {
  const [rawId, setRawId] = useState("");
  const [processedId, setProcessedId] = useState("");
  const [gross, setGross] = useState("");
  const [net, setNet] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const raw = inventoryItems.find((i) => i.id === rawId);
  const processed = inventoryItems.find((i) => i.id === processedId);

  const rawUnitCost = raw ? (raw.moving_average_cost || raw.cost_per_base_unit || 0) : 0;
  const grossNum = Number(gross) || 0;
  const netNum = Number(net) || 0;
  const waste = useMemo(() => Math.max(0, grossNum - netNum), [grossNum, netNum]);
  const yieldPct = useMemo(() => (grossNum > 0 ? (netNum / grossNum) * 100 : 0), [grossNum, netNum]);
  const effectiveCost = useMemo(
    () => (yieldPct > 0 ? rawUnitCost / (yieldPct / 100) : 0),
    [yieldPct, rawUnitCost]
  );

  const rawUnit = raw?.base_unit || "";
  const processedUnit = processed?.base_unit || rawUnit;
  const sameItem = rawId && processedId && rawId === processedId;
  const invalid = netNum > grossNum;

  const canSubmit = rawId && processedId && !sameItem && grossNum > 0 && netNum >= 0 && netNum <= grossNum && !busy;

  const handleSubmit = async () => {
    setError("");
    if (!canSubmit) {
      if (sameItem) setError("Raw and processed items must be different.");
      else if (invalid) setError("Net usable weight cannot exceed gross input weight.");
      else setError("Select both items and enter valid weights.");
      return;
    }
    setBusy(true);
    try {
      const res = await base44.functions.invoke("processYieldBatch", {
        raw_item_id: rawId,
        processed_item_id: processedId,
        gross_input_weight: grossNum,
        net_usable_output_weight: netNum,
        notes
      });
      onProcessed?.(res.data);
      setRawId(""); setProcessedId(""); setGross(""); setNet(""); setNotes("");
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to process batch");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8DED8] p-5 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-[#8B7355]/10 flex items-center justify-center">
          <Scissors className="h-4 w-4 text-[#8B7355]" />
        </div>
        <div>
          <h3 className="font-semibold text-[#5C4A3A]">Batch Yield Processing</h3>
          <p className="text-xs text-[#8B7355]">Convert a raw ingredient into its net usable yield and log the waste.</p>
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
              Stock: {fmt(raw.current_stock_base_qty, 3)} {rawUnit} · Cost: PKR {fmt(rawUnitCost, 2)}/{rawUnit}
            </p>
          )}
        </div>
        <div>
          <Label className="text-xs">Processed / Usable Output Item</Label>
          <select
            value={processedId}
            onChange={(e) => setProcessedId(e.target.value)}
            className="mt-1 w-full h-9 rounded-md border border-[#E8DED8] bg-white px-2 text-sm text-[#5C4A3A]"
          >
            <option value="">— select processed item —</option>
            {inventoryItems.map((i) => (
              <option key={i.id} value={i.id}>{i.name} ({i.base_unit})</option>
            ))}
          </select>
          {sameItem && <p className="text-[11px] text-red-600 mt-1">Must differ from the raw ingredient.</p>}
        </div>
        <div>
          <Label className="text-xs">Gross Input Weight {rawUnit && `(${rawUnit})`}</Label>
          <Input type="number" min="0" step="any" value={gross} onChange={(e) => setGross(e.target.value)} className="mt-1" placeholder="0" />
        </div>
        <div>
          <Label className="text-xs">Net Usable Weight {processedUnit && `(${processedUnit})`}</Label>
          <Input type="number" min="0" step="any" value={net} onChange={(e) => setNet(e.target.value)} className={`mt-1 ${invalid ? "border-red-400" : ""}`} placeholder="0" />
        </div>
      </div>

      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Batch notes (optional)" className="mt-1" />
      </div>

      {/* Reactive calculations */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#F5EBE8] p-3">
          <div className="flex items-center gap-1.5 text-[#8B7355] text-xs"><Percent className="h-3.5 w-3.5" /> Yield %</div>
          <div className="text-xl font-bold text-[#5C4A3A] mt-1">{fmt(yieldPct, 2)}%</div>
        </div>
        <div className="rounded-xl bg-[#F5EBE8] p-3">
          <div className="flex items-center gap-1.5 text-[#8B7355] text-xs"><TrendingDown className="h-3.5 w-3.5" /> Waste</div>
          <div className="text-xl font-bold text-[#5C4A3A] mt-1">{fmt(waste, 3)} {rawUnit}</div>
        </div>
        <div className="rounded-xl bg-[#F5EBE8] p-3">
          <div className="flex items-center gap-1.5 text-[#8B7355] text-xs"><Coins className="h-3.5 w-3.5" /> Eff. Cost / net {processedUnit}</div>
          <div className="text-xl font-bold text-[#5C4A3A] mt-1">PKR {fmt(effectiveCost, 2)}</div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-[#8B7355] hover:bg-[#6B5744] text-white">
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Scissors className="h-4 w-4 mr-1" />}
          Submit Processing Batch
        </Button>
      </div>
    </div>
  );
}