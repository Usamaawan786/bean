import { Input } from "@/components/ui/input";

function fmt(n, dp = 2) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

// Color band for a variance value: red (loss), yellow (over), green (matched).
function bandFor(variance) {
  const v = Number(variance) || 0;
  if (v < -0.0001) return "red";
  if (v > 0.0001) return "yellow";
  return "green";
}

const ROW_TINT = {
  red: "bg-red-50/60",
  yellow: "bg-yellow-50/60",
  green: "bg-green-50/40"
};

const VAR_CELL = {
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-700",
  green: "bg-green-100 text-green-700"
};

const thClass = "px-2 py-2 text-left text-[11px] font-semibold text-[#8B7355] uppercase tracking-wide whitespace-nowrap";
const tdClass = "px-2 py-1.5 text-sm text-[#5C4A3A] whitespace-nowrap";
const numClass = "text-right tabular-nums";

export default function EodReconciliationGrid({ lines, onChange, readOnly }) {
  const update = (id, field, value) => {
    onChange(lines.map((l) => (l.inventory_item_id === id ? { ...l, [field]: value } : l)));
  };

  const totalLoss = lines.reduce((s, l) => s + (l.financial_loss_value || 0), 0);
  const lossCount = lines.filter((l) => (l.variance || 0) < -0.0001).length;
  const overCount = lines.filter((l) => (l.variance || 0) > 0.0001).length;
  const matchCount = lines.length - lossCount - overCount;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-semibold">{lossCount} losses</span>
        <span className="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">{overCount} over</span>
        <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-semibold">{matchCount} matched</span>
        <span className="px-2.5 py-1 rounded-full bg-[#8B7355]/10 text-[#5C4A3A] font-semibold ml-auto">
          Total financial loss: PKR {fmt(totalLoss, 2)}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#E8DED8] bg-white">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#F5EBE8]">
            <tr>
              <th className={thClass}>Item / Unit</th>
              <th className={`${thClass} ${numClass}`}>Opening</th>
              <th className={`${thClass} ${numClass}`}>Purchases In</th>
              <th className={`${thClass} ${numClass}`}>Transfers In</th>
              <th className={`${thClass} ${numClass}`}>Transfers Out</th>
              <th className={`${thClass} ${numClass}`}>Sales Ded.</th>
              <th className={`${thClass} ${numClass}`}>Wastage</th>
              <th className={`${thClass} ${numClass}`}>Theoretical</th>
              <th className={`${thClass} ${numClass}`}>Actual Closing</th>
              <th className={`${thClass} ${numClass}`}>Variance</th>
              <th className={`${thClass} ${numClass}`}>Loss Value (PKR)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const band = bandFor(l.variance);
              return (
                <tr key={l.inventory_item_id} className={`border-t border-[#F0EAE4] ${ROW_TINT[band]}`}>
                  <td className={tdClass}>
                    <div className="font-medium">{l.item_name}</div>
                    <div className="text-[11px] text-[#C9B8A6]">{l.unit}</div>
                  </td>
                  <td className={`${tdClass} ${numClass}`}>{fmt(l.opening_stock, 3)}</td>
                  <td className={`${tdClass} ${numClass}`}>{fmt(l.purchases_in, 3)}</td>
                  <td className={`${tdClass} ${numClass}`}>
                    {readOnly ? (
                      fmt(l.transfers_in, 3)
                    ) : (
                      <Input
                        type="number" step="any" min="0" value={l.transfers_in}
                        onChange={(e) => update(l.inventory_item_id, "transfers_in", Number(e.target.value) || 0)}
                        className="h-8 w-20 text-right tabular-nums"
                      />
                    )}
                  </td>
                  <td className={`${tdClass} ${numClass}`}>
                    {readOnly ? (
                      fmt(l.transfers_out, 3)
                    ) : (
                      <Input
                        type="number" step="any" min="0" value={l.transfers_out}
                        onChange={(e) => update(l.inventory_item_id, "transfers_out", Number(e.target.value) || 0)}
                        className="h-8 w-20 text-right tabular-nums"
                      />
                    )}
                  </td>
                  <td className={`${tdClass} ${numClass}`}>{fmt(l.sales_deductions, 3)}</td>
                  <td className={`${tdClass} ${numClass}`}>{fmt(l.logged_wastage, 3)}</td>
                  <td className={`${tdClass} ${numClass} font-semibold`}>{fmt(l.theoretical_closing, 3)}</td>
                  <td className={`${tdClass} ${numClass}`}>
                    {readOnly ? (
                      <span className="font-semibold">{fmt(l.actual_closing, 3)}</span>
                    ) : (
                      <Input
                        type="number" step="any" value={l.actual_closing}
                        onChange={(e) => update(l.inventory_item_id, "actual_closing", Number(e.target.value) || 0)}
                        className="h-8 w-24 text-right tabular-nums font-semibold"
                      />
                    )}
                  </td>
                  <td className={`${tdClass} ${numClass} font-bold ${VAR_CELL[band]}`}>
                    {fmt(l.variance, 3)}
                  </td>
                  <td className={`${tdClass} ${numClass} font-semibold`}>
                    {band === "red" ? fmt(l.financial_loss_value, 2) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}