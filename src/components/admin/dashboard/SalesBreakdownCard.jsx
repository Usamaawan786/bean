import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fmtMoney = (v) => `Rs. ${(v || 0).toLocaleString()}`;

function fmtDate(d) {
  if (!d) return "—";
  if (d.includes(":")) return d; // hourly label (Today/Yesterday)
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return d;
}

export default function SalesBreakdownCard({ periodLabel, dailyBreakdown = [], shiftBreakdown = [] }) {
  const [mode, setMode] = useState("date");

  const totalTxns = dailyBreakdown.reduce((s, d) => s + (d.transactions || 0), 0);
  const totalItems = dailyBreakdown.reduce((s, d) => s + (d.itemsSold || 0), 0);
  const totalRev = dailyBreakdown.reduce((s, d) => s + (d.revenue || 0), 0);

  return (
    <Card className="border-[#E8DED8]">
      <CardHeader>
        <CardTitle className="text-[#5C4A3A] flex items-center justify-between flex-wrap gap-2">
          <span>Sales Breakdown · {periodLabel}</span>
          <div className="flex bg-[#F5EBE8] rounded-lg p-0.5">
            <button
              onClick={() => setMode("date")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${mode === "date" ? "bg-white text-[#5C4A3A] shadow-sm font-medium" : "text-[#8B7355]"}`}
            >
              By Date
            </button>
            <button
              onClick={() => setMode("shift")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${mode === "shift" ? "bg-white text-[#5C4A3A] shadow-sm font-medium" : "text-[#8B7355]"}`}
            >
              By Shift
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mode === "date" ? (
          dailyBreakdown.length === 0 ? (
            <p className="text-center text-[#8B7355] py-6 text-sm">No sales in this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8DED8]">
                    <th className="text-left py-2 px-3 text-[#5C4A3A] font-semibold">Date</th>
                    <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Transactions</th>
                    <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Items Sold</th>
                    <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Avg Order</th>
                    <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyBreakdown.map((d, i) => (
                    <tr key={i} className="border-b border-[#F5EBE8] hover:bg-[#F5EBE8] transition-colors">
                      <td className="py-2 px-3 text-[#5C4A3A] font-medium">{fmtDate(d.date)}</td>
                      <td className="py-2 px-3 text-right text-[#8B7355]">{d.transactions}</td>
                      <td className="py-2 px-3 text-right text-[#8B7355]">{d.itemsSold}</td>
                      <td className="py-2 px-3 text-right text-[#8B7355]">{fmtMoney(d.avgOrder)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-[#5C4A3A]">{fmtMoney(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#E8DED8]">
                    <td className="py-2 px-3 text-[#5C4A3A] font-bold">Total</td>
                    <td className="py-2 px-3 text-right text-[#5C4A3A] font-bold">{totalTxns}</td>
                    <td className="py-2 px-3 text-right text-[#5C4A3A] font-bold">{totalItems}</td>
                    <td className="py-2 px-3 text-right text-[#5C4A3A] font-bold">{fmtMoney(totalTxns > 0 ? totalRev / totalTxns : 0)}</td>
                    <td className="py-2 px-3 text-right text-[#5C4A3A] font-bold">{fmtMoney(totalRev)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        ) : (
          shiftBreakdown.length === 0 ? (
            <p className="text-center text-[#8B7355] py-6 text-sm">No shifts in this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8DED8]">
                    <th className="text-left py-2 px-3 text-[#5C4A3A] font-semibold">Date</th>
                    <th className="text-left py-2 px-3 text-[#5C4A3A] font-semibold">Shift</th>
                    <th className="text-left py-2 px-3 text-[#5C4A3A] font-semibold">Opened By</th>
                    <th className="text-center py-2 px-3 text-[#5C4A3A] font-semibold">Status</th>
                    <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Txns</th>
                    <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Cash</th>
                    <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Card</th>
                    <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftBreakdown.map((s) => (
                    <tr key={s.shift_id} className="border-b border-[#F5EBE8] hover:bg-[#F5EBE8] transition-colors">
                      <td className="py-2 px-3 text-[#5C4A3A] font-medium">{fmtDate(s.date)}</td>
                      <td className="py-2 px-3 text-[#5C4A3A]">
                        {s.shift_type === "morning" ? "Morning" : "Evening"}
                        {s.counter && <span className="text-xs text-[#8B7355] ml-1">· {s.counter === "counter_1" ? "C1" : "C2"}</span>}
                      </td>
                      <td className="py-2 px-3 text-[#8B7355]">{s.opened_by_name || "—"}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant="outline" className={s.status === "open" ? "bg-green-50 text-green-700 border-green-200" : "bg-[#F5EBE8] text-[#8B7355] border-[#E8DED8]"}>
                          {s.status === "open" ? "OPEN" : "CLOSED"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right text-[#8B7355]">{s.transactions}</td>
                      <td className="py-2 px-3 text-right text-[#8B7355]">{fmtMoney(s.cash)}</td>
                      <td className="py-2 px-3 text-right text-[#8B7355]">{fmtMoney(s.card)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-[#5C4A3A]">{fmtMoney(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}