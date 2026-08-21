import { Input } from "@/components/ui/input";

function fmt(n, dp = 2) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

function bandFor(v) {
  v = Number(v) || 0;
  if (v < -0.0001) return "red";
  if (v > 0.0001) return "yellow";
  return "green";
}

const ROW_TINT = { red: "bg-red-50/60", yellow: "bg-yellow-50/60", green: "bg-green-50/30" };
const DIFF_CELL = {
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-700",
  green: "bg-green-100 text-green-700"
};

const th = "px-2 py-2 text-left text-[11px] font-semibold text-[#8B7355] uppercase tracking-wide whitespace-nowrap";
const td = "px-2 py-1.5 text-sm text-[#5C4A3A] whitespace-nowrap";

export default function SyrveReconciliationGrid({ lines, onChange, readOnly, surplus, shortage }) {
  const update = (id, value) => {
    onChange(lines.map((l) => (l.inventory_item_id === id ? { ...l, actual_closing: Number(value) || 0 } : l)));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
          Surplus: PKR {fmt(surplus)}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
          Shortage: PKR {fmt(shortage)}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#E8DED8] bg-white">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#F5EBE8]">
            <tr>
              <th className={`${th} text-center`}>№</th>
              <th className={th}>Product Code</th>
              <th className={th}>Product</th>
              <th className={th}>Package Type</th>
              <th className={`${th} text-right`}>In Package</th>
              <th className={`${th} text-right`}>Actual Qty (units)</th>
              <th className={`${th} text-right`}>Book Bal.</th>
              <th className={`${th} text-right`}>Diff Qty</th>
              <th className={`${th} text-right`}>Diff Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => {
              const band = bandFor(l.variance);
              const conv = l.conversion_rate || 1;
              const inPackage = conv ? (Number(l.actual_closing) || 0) / conv : 0;
              const diffAmount = (Number(l.variance) || 0) * (Number(l.unit_cost) || 0);
              return (
                <tr key={l.inventory_item_id} className={`border-t border-[#F0EAE4] ${ROW_TINT[band]}`}>
                  <td className={`${td} text-center text-[#C9B8A6]`}>{idx + 1}</td>
                  <td className={`${td} text-[#8B7355]`}>{l.sku || "—"}</td>
                  <td className={`${td} font-medium`}>{l.item_name}</td>
                  <td className={`${td} text-[#8B7355]`}>{l.storage_unit || l.unit || "—"}</td>
                  <td className={`${td} text-right tabular-nums`}>{fmt(inPackage, 3)}</td>
                  <td className={`${td} text-right`}>
                    {readOnly ? (
                      <span className="font-semibold tabular-nums">{fmt(l.actual_closing, 3)}</span>
                    ) : (
                      <Input
                        type="number" step="any" value={l.actual_closing}
                        onChange={(e) => update(l.inventory_item_id, e.target.value)}
                        className="h-8 w-24 text-right tabular-nums font-semibold"
                      />
                    )}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{fmt(l.theoretical_closing, 3)}</td>
                  <td className={`${td} text-right font-bold tabular-nums ${DIFF_CELL[band]}`}>{fmt(l.variance, 3)}</td>
                  <td className={`${td} text-right tabular-nums font-semibold`}>{fmt(diffAmount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}