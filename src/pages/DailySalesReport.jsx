import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Coffee, Download, Loader2, Printer, Receipt, Wallet } from "lucide-react";
import SalesDataTable from "@/components/salesreport/SalesDataTable";
import {
  buildItemCsv,
  downloadCsv,
  fmtPKR,
  pktDateKey,
  pktDateLong,
  pktDayRangeUtc,
  printSalesReport,
  summarize,
  yesterdayPktKey,
} from "@/lib/salesReportUtils";

export default function DailySalesReport() {
  const [dateStr, setDateStr] = useState(yesterdayPktKey());
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const { startUtc, endUtc } = pktDayRangeUtc(dateStr);
    base44.entities.StoreSale
      .filter({ created_date: { $gte: startUtc, $lt: endUtc } }, { sort: "created_date", limit: 1000 })
      .then((res) => {
        if (cancelled) return;
        setSales(Array.isArray(res) ? res : res?.items || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Could not load sales for this day");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateStr]);

  const summary = useMemo(() => summarize(sales), [sales]);
  const todayKey = pktDateKey(Date.now());

  const exportList = (list) => {
    const csv = buildItemCsv(list, dateStr);
    downloadCsv(`Bean_Sales_${dateStr}_${list.length}bills.csv`, csv);
  };

  const methodRows = Object.entries(summary.byMethod);

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white">
        <div className="max-w-6xl mx-auto px-5 pt-8 pb-8">
          <div className="flex items-center justify-between mb-4">
            <Link to="/StaffPortal" className="flex items-center gap-2 text-white/80 hover:text-white text-sm">
              <ArrowLeft className="h-4 w-4" /> Staff Portal
            </Link>
            <div className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-[#D4C4B0]" />
              <span className="text-sm text-white/80">Bean Coffee</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Receipt className="h-8 w-8" /> Daily Sales Report
          </h1>
          <p className="text-white/70 text-sm mt-2">
            Every bill, item and price for one day. All times are Pakistan Standard Time (PKT).
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <Card className="bg-white border-[#E8DED8]">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="w-full sm:w-56">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#8B7355] mb-1.5 block">
                  Sales date (PKT)
                </label>
                <Input type="date" value={dateStr} max={todayKey} onChange={(e) => setDateStr(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#E8DED8] text-[#5C4A3A]"
                  onClick={() => setDateStr(yesterdayPktKey())}
                >
                  Yesterday
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#E8DED8] text-[#5C4A3A]"
                  onClick={() => setDateStr(todayKey)}
                >
                  Today
                </Button>
              </div>
              <div className="sm:ml-auto flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-[#8B7355] text-[#5C4A3A] hover:bg-[#F5F1ED]"
                  disabled={loading || !sales.length}
                  onClick={() => printSalesReport(sales, dateStr, summary)}
                >
                  <Printer className="h-4 w-4 mr-2" /> Print / PDF
                </Button>
                <Button
                  className="bg-[#5C4A3A] hover:bg-[#3a2e22] text-white"
                  disabled={loading || !sales.length}
                  onClick={() => exportList(sales)}
                >
                  <Download className="h-4 w-4 mr-2" /> Download CSV
                </Button>
              </div>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-white border-[#E8DED8]">
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B7355]">Total Sales</p>
              <p className="text-xl font-bold text-[#5C4A3A] mt-1 flex items-center gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-[#C9B8A6]" /> : fmtPKR(summary.total)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E8DED8]">
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B7355]">Bills</p>
              <p className="text-xl font-bold text-[#5C4A3A] mt-1">{loading ? "—" : summary.bills}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E8DED8]">
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B7355]">Items Sold</p>
              <p className="text-xl font-bold text-[#5C4A3A] mt-1">{loading ? "—" : summary.items}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E8DED8]">
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B7355]">Average Bill</p>
              <p className="text-xl font-bold text-[#5C4A3A] mt-1">{loading ? "—" : fmtPKR(summary.average)}</p>
            </CardContent>
          </Card>
        </div>

        {methodRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#8B7355] mr-1 flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> By payment
            </span>
            {methodRows.map(([method, v]) => (
              <span
                key={method}
                className="inline-flex items-center gap-2 bg-white border border-[#E8DED8] rounded-full pl-3 pr-1.5 py-1 text-xs text-[#5C4A3A]"
              >
                {method}
                <span className="text-[#8B7355]">{v.count}</span>
                <span className="bg-[#F5F1ED] rounded-full px-2 py-0.5 font-semibold">{fmtPKR(v.total)}</span>
              </span>
            ))}
          </div>
        )}

        <SalesDataTable sales={sales} loading={loading} onExport={exportList} />

        <p className="text-center text-xs text-[#A08A72] pb-6">
          {pktDateLong(dateStr)} · {summary.bills} bills · Totals include GST. Print / PDF produces a document with every bill and its items.
        </p>
      </div>
    </div>
  );
}