import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Trash2, Percent } from "lucide-react";
import WasteLogForm from "@/components/inventoryhub/WasteLogForm";

function fmt(n, dp = 2) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

export default function WasteTab() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [wasteLogs, setWasteLogs] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [items, logs, convs] = await Promise.all([
        base44.entities.InventoryItem.list("-created_date", 500),
        base44.entities.WasteLog.list("-created_date", 200),
        base44.entities.YieldConversion.list("-created_date", 200)
      ]);
      setInventoryItems(items);
      setWasteLogs(logs);
      setConversions(convs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const itemName = useMemo(() => {
    const m = {};
    inventoryItems.forEach((i) => { m[i.id] = i.name; });
    return m;
  }, [inventoryItems]);

  // Per-raw-item yield summary. Aggregates batch processing (YieldConversion)
  // and standalone disposal (WasteLog with no yield_conversion_id) so the
  // effective yield reflects ALL raw material consumed — standalone disposals
  // drag the yield down to show the true material loss.
  const summary = useMemo(() => {
    const map = {};
    const ensure = (id) => {
      if (!map[id]) map[id] = { gross: 0, net: 0, batchWaste: 0, standaloneWaste: 0, unit: "" };
      return map[id];
    };
    conversions.forEach((c) => {
      const row = ensure(c.raw_item_id);
      row.gross += Number(c.gross_input_weight) || 0;
      row.net += Number(c.net_usable_output_weight) || 0;
      row.batchWaste += Number(c.waste_weight) || 0;
      row.unit = c.unit || row.unit;
    });
    wasteLogs.forEach((w) => {
      if (w.yield_conversion_id) return; // already counted as batch waste
      const row = ensure(w.raw_item_id);
      row.standaloneWaste += Number(w.waste_weight) || 0;
      row.unit = w.unit || row.unit;
    });
    return Object.entries(map).map(([id, r]) => {
      const totalConsumed = r.gross + r.standaloneWaste;
      const effectiveYield = totalConsumed > 0 ? (r.net / totalConsumed) * 100 : 0;
      return { id, name: itemName[id] || "—", ...r, totalConsumed, effectiveYield };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [conversions, wasteLogs, itemName]);

  const recentWaste = useMemo(() => wasteLogs.slice(0, 8), [wasteLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#8B7355]">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading waste log…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <WasteLogForm inventoryItems={inventoryItems} onLogged={load} />

      <div>
        <h3 className="font-semibold text-[#5C4A3A] text-sm mb-3 flex items-center gap-1.5">
          <Percent className="h-4 w-4 text-[#8B7355]" /> Yield Summary by Ingredient
        </h3>
        <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5EBE8] text-[#5C4A3A] text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Ingredient</th>
                  <th className="text-right px-4 py-2.5 font-medium">Processed (gross)</th>
                  <th className="text-right px-4 py-2.5 font-medium">Usable (net)</th>
                  <th className="text-right px-4 py-2.5 font-medium">Batch Waste</th>
                  <th className="text-right px-4 py-2.5 font-medium">Standalone Disposal</th>
                  <th className="text-right px-4 py-2.5 font-medium">Eff. Yield %</th>
                </tr>
              </thead>
              <tbody>
                {summary.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-[#8B7355] py-6">No waste or yield records yet.</td></tr>
                ) : summary.map((r) => (
                  <tr key={r.id} className="border-t border-[#E8DED8]">
                    <td className="px-4 py-2.5 text-[#5C4A3A] font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 text-right text-[#5C4A3A]">{fmt(r.gross, 3)} {r.unit}</td>
                    <td className="px-4 py-2.5 text-right text-[#5C4A3A]">{fmt(r.net, 3)} {r.unit}</td>
                    <td className="px-4 py-2.5 text-right text-amber-700">{fmt(r.batchWaste, 3)} {r.unit}</td>
                    <td className="px-4 py-2.5 text-right text-red-700">{fmt(r.standaloneWaste, 3)} {r.unit}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-bold ${r.effectiveYield >= 80 ? "text-green-700" : r.effectiveYield >= 60 ? "text-amber-700" : "text-red-700"}`}>
                        {fmt(r.effectiveYield, 1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[11px] text-[#8B7355] mt-2">
          Effective yield = usable net output ÷ (gross processed + standalone disposal). Standalone disposals drag the yield down to reflect true material loss.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-[#5C4A3A] text-sm mb-3 flex items-center gap-1.5">
          <Trash2 className="h-4 w-4 text-red-600" /> Recent Waste Entries
        </h3>
        <div className="bg-white rounded-2xl border border-[#E8DED8] divide-y divide-[#E8DED8]">
          {recentWaste.length === 0 ? (
            <div className="text-center text-[#8B7355] py-6 text-sm">No waste logged yet.</div>
          ) : recentWaste.map((w) => (
            <div key={w.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium text-[#5C4A3A]">{itemName[w.raw_item_id] || "—"}</div>
                <div className="text-[11px] text-[#8B7355]">
                  {w.reason || "—"} · {w.created_by || ""} {w.notes ? `· ${w.notes}` : ""}
                </div>
              </div>
              <div className="text-sm font-semibold text-red-700">
                {fmt(w.waste_weight, 3)} {w.unit || ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}