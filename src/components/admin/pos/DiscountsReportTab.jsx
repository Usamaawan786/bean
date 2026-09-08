import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingDown, Printer, Tag, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { utcToPktDisplay } from "@/lib/pktTime";
import DiscountsReportView from "./DiscountsReportView";

// PKT date string (YYYY-MM-DD) from a stored UTC timestamp
const pktDateStr = (iso) => {
  if (!iso) return "";
  let str = String(iso);
  if (!/Z$|[+-]\d\d:?\d\d$/.test(str)) str = str + "Z";
  const pkt = new Date(new Date(str).getTime() + 5 * 60 * 60 * 1000);
  return pkt.toISOString().slice(0, 10);
};

const todayPkt = () => {
  const pkt = new Date(new Date().getTime() + 5 * 60 * 60 * 1000);
  return pkt.toISOString().slice(0, 10);
};

const money = (n) => `PKR ${Number(n || 0).toFixed(2)}`;

const hasDiscount = (s) =>
  (Number(s.discount_amount) || 0) > 0 ||
  (Number(s.discount_pct) || 0) > 0 ||
  (s.items || []).some(i => (Number(i.item_discount_pct) || 0) > 0);

export default function DiscountsReportTab() {
  const [reportDate, setReportDate] = useState(todayPkt());
  const [viewing, setViewing] = useState(false);

  const { data: allSales = [], isLoading } = useQuery({
    queryKey: ["discounts-report-sales"],
    queryFn: () => base44.entities.StoreSale.list("-created_date", 1000)
  });

  const discounted = (allSales || [])
    .filter(hasDiscount)
    .filter(s => pktDateStr(s.created_date) === reportDate);

  const totalDiscount = discounted.reduce((s, x) => s + (Number(x.discount_amount) || 0), 0);
  const totalOriginal = discounted.reduce((s, x) => s + (Number(x.original_subtotal) || 0), 0);
  const totalFinal = discounted.reduce((s, x) => s + (Number(x.subtotal) || 0), 0);
  const billDiscounts = discounted.filter(s => (Number(s.discount_pct) || 0) > 0).length;
  const itemDiscounts = discounted.filter(s => (s.items || []).some(i => (Number(i.item_discount_pct) || 0) > 0)).length;

  if (isLoading) {
    return <p className="text-[#8B7355] text-sm text-center py-12">Loading discounts...</p>;
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-[#8B7355] mb-1 block flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Report Date (PKT)
          </label>
          <Input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="text-sm border-[#E8DED8] w-44"
          />
        </div>
        <Button
          onClick={() => setViewing(true)}
          disabled={discounted.length === 0}
          className="bg-[#8B7355] hover:bg-[#6B5744] rounded-xl"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Discounts Report
        </Button>
        <p className="text-xs text-[#8B7355] ml-auto self-center">
          Admin-only · {discounted.length} discounted bill{discounted.length === 1 ? "" : "s"} on {reportDate}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-[#E8DED8] p-4">
          <p className="text-xs text-[#8B7355] mb-1">Total Discounts</p>
          <p className="text-xl font-bold text-red-600">{money(totalDiscount)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8DED8] p-4">
          <p className="text-xs text-[#8B7355] mb-1">Discounted Bills</p>
          <p className="text-xl font-bold text-[#5C4A3A]">{discounted.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8DED8] p-4">
          <p className="text-xs text-[#8B7355] mb-1">Bill-Level / Item-Level</p>
          <p className="text-xl font-bold text-[#5C4A3A]">{billDiscounts} / {itemDiscounts}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8DED8] p-4">
          <p className="text-xs text-[#8B7355] mb-1">Gross → Net</p>
          <p className="text-sm font-bold text-[#5C4A3A]">{money(totalOriginal)} → {money(totalFinal)}</p>
        </div>
      </div>

      {/* Discount log */}
      <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E8DED8] flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <h3 className="font-semibold text-[#5C4A3A] text-sm">Discount Log — {reportDate}</h3>
        </div>
        {discounted.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-8 w-8 text-[#C9B8A6] mx-auto mb-2" />
            <p className="text-[#8B7355] text-sm">No discounts given on this date</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5EBE8] text-[#8B7355] text-xs">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Bill</th>
                  <th className="text-left px-4 py-2 font-medium">When (PKT)</th>
                  <th className="text-left px-4 py-2 font-medium">Cashier</th>
                  <th className="text-left px-4 py-2 font-medium">Customer</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-right px-4 py-2 font-medium">Gross</th>
                  <th className="text-right px-4 py-2 font-medium">Discount</th>
                  <th className="text-right px-4 py-2 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {discounted.map(s => {
                  const itemDisc = (s.items || []).some(i => (Number(i.item_discount_pct) || 0) > 0);
                  const billDisc = (Number(s.discount_pct) || 0) > 0;
                  return (
                    <tr key={s.id} className="border-t border-[#E8DED8]">
                      <td className="px-4 py-2 font-mono text-[#5C4A3A] font-medium">{s.bill_number}</td>
                      <td className="px-4 py-2 text-[#8B7355]">{utcToPktDisplay(s.created_date)}</td>
                      <td className="px-4 py-2 text-[#5C4A3A]">{s.cashier_name || s.cashier_email || "—"}</td>
                      <td className="px-4 py-2 text-[#8B7355]">{s.customer_name || "Walk-in"}</td>
                      <td className="px-4 py-2">
                        {billDisc && <span className="px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold mr-1">Bill -{s.discount_pct}%</span>}
                        {itemDisc && <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">Item</span>}
                      </td>
                      <td className="px-4 py-2 text-right text-[#8B7355]">{money(s.original_subtotal)}</td>
                      <td className="px-4 py-2 text-right text-red-600 font-medium">- {money(s.discount_amount)}</td>
                      <td className="px-4 py-2 text-right text-[#5C4A3A] font-medium">{money(s.subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing && (
        <DiscountsReportView
          reportDate={reportDate}
          sales={discounted}
          onClose={() => setViewing(false)}
        />
      )}
    </div>
  );
}