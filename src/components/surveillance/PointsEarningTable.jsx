import { Star, ScanLine, AlertTriangle } from "lucide-react";
import { utcToPktDisplay } from "@/lib/pktTime";

export default function PointsEarningTable({ sales, pkrPerPoint }) {
  if (!sales.length) {
    return (
      <div className="text-center py-12 text-[#8B7355]">
        <ScanLine className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No bill-scan point earnings in this range</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#F5EBE8]">
          <tr>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Bill #</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Customer (scanned by)</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Cashier</th>
            <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Amount</th>
            <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Points</th>
            <th className="text-center px-3 py-3 text-[#8B7355] font-semibold">Mult</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Sale Time (PKT)</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Scan Time (PKT)</th>
            <th className="text-center px-3 py-3 text-[#8B7355] font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => {
            const selfScan = s.scanned_by && s.cashier_email && s.scanned_by === s.cashier_email;
            const expected = pkrPerPoint ? Math.floor((s.total_amount || 0) / pkrPerPoint) * (s.points_multiplier || 1) : null;
            const mismatch = expected != null && Math.abs((s.points_awarded || 0) - expected) > 1 && s.points_awarded > 0;
            return (
              <tr key={s.id} className="border-t border-[#F5EBE8] hover:bg-[#FDF9F7]">
                <td className="px-3 py-2.5 font-mono font-bold text-[#5C4A3A] whitespace-nowrap">{s.bill_number || "—"}</td>
                <td className="px-3 py-2.5 text-[#5C4A3A]">
                  <div className="flex items-center gap-1">
                    <span className="truncate max-w-[160px]">{s.scanned_by || <span className="text-[#C9B8A6]">unscanned</span>}</span>
                    {selfScan && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" title="Cashier scanned own sale" />}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[#8B7355] truncate max-w-[140px]">{s.cashier_name || s.cashier_email || "—"}</td>
                <td className="px-3 py-2.5 text-right font-medium text-[#5C4A3A] whitespace-nowrap">PKR {(s.total_amount || 0).toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className="flex items-center justify-end gap-1 font-bold text-[#5C4A3A]">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    {s.points_awarded || 0}
                    {mismatch && <AlertTriangle className="h-3 w-3 text-red-500" title={`Expected ~${expected}`} />}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center text-[#8B7355]">{s.points_multiplier && s.points_multiplier > 1 ? `${s.points_multiplier}x` : "1x"}</td>
                <td className="px-3 py-2.5 text-[#8B7355] whitespace-nowrap">{utcToPktDisplay(s.created_date)}</td>
                <td className="px-3 py-2.5 text-[#8B7355] whitespace-nowrap">{s.is_scanned ? utcToPktDisplay(s.scanned_at) : "—"}</td>
                <td className="px-3 py-2.5 text-center">
                  {s.is_scanned ? (
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Scanned</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">Pending</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}