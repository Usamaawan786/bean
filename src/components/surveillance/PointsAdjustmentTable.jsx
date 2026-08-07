import { Pencil, ArrowDown, ArrowUp } from "lucide-react";
import { utcToPktDisplay } from "@/lib/pktTime";

export default function PointsAdjustmentTable({ adjustments }) {
  if (!adjustments.length) {
    return (
      <div className="text-center py-12 text-[#8B7355]">
        <Pencil className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No points adjustments logged in this range</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#F5EBE8]">
          <tr>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Customer</th>
            <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Old</th>
            <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">New</th>
            <th className="text-right px-3 py-3 text-[#8B7355] font-semibold">Delta</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Reason</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Adjusted By</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Time (PKT)</th>
          </tr>
        </thead>
        <tbody>
          {adjustments.map((a) => {
            const removal = (a.delta || 0) < 0;
            return (
              <tr key={a.id} className="border-t border-[#F5EBE8] hover:bg-[#FDF9F7]">
                <td className="px-3 py-2.5 text-[#5C4A3A] truncate max-w-[180px]">{a.customer_email}</td>
                <td className="px-3 py-2.5 text-right text-[#8B7355]">{a.old_balance}</td>
                <td className="px-3 py-2.5 text-right font-bold text-[#5C4A3A]">{a.new_balance}</td>
                <td className={`px-3 py-2.5 text-right font-bold ${removal ? "text-red-600" : "text-green-600"}`}>
                  <span className="inline-flex items-center gap-0.5">
                    {removal ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                    {a.delta > 0 ? "+" : ""}{a.delta}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[#8B7355] max-w-[280px]"><span className="line-clamp-2">{a.reason}</span></td>
                <td className="px-3 py-2.5 text-[#8B7355] truncate max-w-[140px]">{a.adjusted_by_name || a.adjusted_by}</td>
                <td className="px-3 py-2.5 text-[#8B7355] whitespace-nowrap">{utcToPktDisplay(a.adjusted_at || a.created_date)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}