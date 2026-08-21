import { Recycle } from "lucide-react";
import { utcToPktDisplay } from "@/lib/pktTime";

function fmt(n, dp = 2) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

export default function YieldHistoryList({ conversions, itemNames }) {
  if (!conversions.length) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8DED8] p-10 text-center">
        <Recycle className="h-10 w-10 mx-auto mb-3 text-[#C9B8A6]" />
        <p className="font-semibold text-[#5C4A3A]">No yield batches processed yet</p>
        <p className="text-sm text-[#8B7355] mt-1">Processed batches will appear here with their yield %, waste and effective cost.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {conversions.map((c) => {
        const rawName = itemNames[c.raw_item_id] || "—";
        const procName = itemNames[c.processed_item_id] || "—";
        const yieldPct = Number(c.yield_percentage) || 0;
        const wastePct = 100 - yieldPct;
        return (
          <div key={c.id} className="bg-white rounded-2xl border border-[#E8DED8] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="min-w-0">
                <div className="font-semibold text-sm text-[#5C4A3A] truncate">
                  {rawName} → {procName}
                </div>
                <p className="text-xs text-[#8B7355] mt-0.5">
                  {utcToPktDisplay(c.created_date)} · by {c.created_by || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">{fmt(yieldPct, 1)}% yield</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">{fmt(wastePct, 1)}% waste</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-[#C9B8A6]">Gross input</div>
                <div className="font-semibold text-[#5C4A3A]">{fmt(c.gross_input_weight, 3)} {c.unit}</div>
              </div>
              <div>
                <div className="text-[#C9B8A6]">Net usable</div>
                <div className="font-semibold text-[#5C4A3A]">{fmt(c.net_usable_output_weight, 3)} {c.unit}</div>
              </div>
              <div>
                <div className="text-[#C9B8A6]">Waste</div>
                <div className="font-semibold text-red-600">{fmt(c.waste_weight, 3)} {c.unit}</div>
              </div>
              <div>
                <div className="text-[#C9B8A6]">Eff. cost / net</div>
                <div className="font-semibold text-[#5C4A3A]">PKR {fmt(c.effective_unit_cost, 2)}</div>
              </div>
            </div>
            {c.notes && <p className="text-xs text-[#8B7355] mt-3 pt-2 border-t border-[#F0EAE4]">{c.notes}</p>}
          </div>
        );
      })}
    </div>
  );
}