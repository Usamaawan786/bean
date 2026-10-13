import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, ArrowLeft, Loader2, Landmark, AlertTriangle, Printer } from "lucide-react";
import { Link } from "react-router-dom";

function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function fmtPKR(n) {
  return "Rs " + Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminPraReport() {
  const [startDate, setStartDate] = useState("2026-08-07");
  const [endDate, setEndDate] = useState("2026-09-30");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await base44.functions.invoke("generatePraTaxReport", {
        start_date: startDate,
        end_date: endDate,
      });
      setReport(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const printPreview = () => {
    if (!report) return;
    const items = report.lineItems.slice(0, 300);
    const win = window.open("", "_blank");
    if (!win) return;
    const rows = items
      .map(
        (item, i) => `<tr>
          <td style="text-align:center">${i + 1}</td>
          <td style="font-family:monospace">${item.bill_number}</td>
          <td>${item.date}</td>
          <td>${item.time}</td>
          <td>${item.payment_method}</td>
          <td style="text-align:right">${Number(item.subtotal).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td>
          <td style="text-align:center">${item.tax_rate}%</td>
          <td style="text-align:right">${Number(item.tax_amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td>
          <td style="text-align:right;font-weight:600">${Number(item.total).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td>
        </tr>`
      )
      .join("");
    const summaryRows = report.summary
      .map(
        (s) => `<tr>
          <td style="font-weight:600">${s.payment_method}</td>
          <td style="text-align:center">${s.count}</td>
          <td style="text-align:right">${Number(s.subtotal).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td>
          <td style="text-align:right;font-weight:600">${Number(s.tax).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td>
          <td style="text-align:right">${Number(s.total).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td>
        </tr>`
      )
      .join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Bean Coffee — Invoice Summary (${report.period.start_date} to ${report.period.end_date})</title>
      <style>
        * { font-family: Arial, Helvetica, sans-serif; }
        body { color: #5C4A3A; margin: 0; padding: 40px; }
        .header { text-align: center; border-bottom: 3px solid #8B7355; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { font-size: 28px; margin: 0 0 5px; }
        .header p { color: #8B7355; font-size: 14px; margin: 3px 0; }
        h2 { font-size: 16px; color: #5C4A3A; border-bottom: 1px solid #E8DED8; padding-bottom: 6px; margin: 30px 0 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #8B7355; color: #fff; padding: 8px 6px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 5px 6px; border-bottom: 1px solid #F0EBE5; }
        tr:nth-child(even) td { background: #FAF7F3; }
        .grand { background: #5C4A3A !important; color: #fff; font-weight: 700; }
        .grand td { background: #5C4A3A !important; color: #fff; border: none; }
        .note { font-size: 11px; color: #999; margin-top: 20px; text-align: center; }
        @media print { body { padding: 20px; } .no-print { display: none; } }
      </style></head><body>
      <div class="header">
        <h1>Bean Coffee</h1>
        <p><strong>Invoice Summary Report</strong></p>
        <p>Period: ${report.period.start_date} to ${report.period.end_date}</p>
        <p>Generated: ${new Date(report.generated_at).toLocaleString("en-PK")}</p>
      </div>
      <button class="no-print" onclick="window.print()" style="background:#5C4A3A;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;margin-bottom:20px;">Print / Save as PDF</button>
      <h2>Tax Summary by Payment Method</h2>
      <table>
        <thead><tr><th>Payment Method</th><th style="text-align:center">Transactions</th><th style="text-align:right">Subtotal (PKR)</th><th style="text-align:right">Tax (PKR)</th><th style="text-align:right">Total (PKR)</th></tr></thead>
        <tbody>
          ${summaryRows}
          <tr class="grand"><td>TOTAL</td><td style="text-align:center">${report.grandTotal.count}</td><td style="text-align:right">${Number(report.grandTotal.subtotal).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td><td style="text-align:right">${Number(report.grandTotal.tax).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td><td style="text-align:right">${Number(report.grandTotal.total).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>
        </tbody>
      </table>
      <h2>Invoice Detail — First 300 of ${report.lineItems.length}</h2>
      <table>
        <thead><tr><th style="text-align:center;width:40px">#</th><th>Bill #</th><th>Date</th><th>Time</th><th>Method</th><th style="text-align:right">Subtotal</th><th style="text-align:center">Rate</th><th style="text-align:right">Tax</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="note">This document shows ${items.length} invoices from the period ${report.period.start_date} to ${report.period.end_date}. Total invoices in period: ${report.lineItems.length}.</p>
      </body></html>`);
    win.document.close();
  };

  const downloadCSV = () => {
    if (!report) return;
    const lines = [];
    lines.push("Bean Coffee — PRA Sales Tax Report");
    lines.push(`Period,${report.period.start_date} to ${report.period.end_date}`);
    lines.push(`Generated,${new Date(report.generated_at).toLocaleString("en-PK")}`);
    lines.push("");
    lines.push("SUMMARY BY PAYMENT METHOD");
    lines.push("Payment Method,Transactions,Subtotal (PKR),Tax Collected (PKR),Total (PKR)");
    report.summary.forEach((s) => {
      lines.push([s.payment_method, s.count, s.subtotal, s.tax, s.total].map(csvEscape).join(","));
    });
    lines.push(
      ["TOTAL", report.grandTotal.count, report.grandTotal.subtotal, report.grandTotal.tax, report.grandTotal.total]
        .map(csvEscape)
        .join(",")
    );
    lines.push("");
    lines.push("LINE ITEM DETAIL");
    lines.push("Bill Number,Date,Time,Payment Method,Subtotal,Tax Rate %,Tax Amount,Total,Discount,Order Type,Cashier");
    report.lineItems.forEach((item) => {
      lines.push(
        [
          item.bill_number,
          item.date,
          item.time,
          item.payment_method,
          item.subtotal,
          item.tax_rate,
          item.tax_amount,
          item.total,
          item.discount_amount,
          item.order_type,
          item.cashier,
        ]
          .map(csvEscape)
          .join(",")
      );
    });

    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRA_Tax_Report_${report.period.start_date}_to_${report.period.end_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white">
        <div className="max-w-5xl mx-auto px-5 pt-8 pb-8">
          <div className="flex items-center justify-between mb-4">
            <Link to="/StaffPortal" className="flex items-center gap-2 text-white/80 hover:text-white text-sm">
              <ArrowLeft className="h-4 w-4" /> Staff Portal
            </Link>
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-[#D4C4B0]" />
              <span className="text-sm text-white/80">PRA Tax Compliance</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8" /> PRA Sales Tax Report
          </h1>
          <p className="text-white/70 text-sm mt-2">
            Generate a downloadable sales tax report for the Punjab Revenue Authority. All timestamps are in Pakistan Standard Time (PKT).
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        {/* Date Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#5C4A3A]">Select Report Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 w-full">
                <label className="text-sm font-medium text-[#5C4A3A] mb-1.5 block">Start Date (PKT)</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex-1 w-full">
                <label className="text-sm font-medium text-[#5C4A3A] mb-1.5 block">End Date (PKT)</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <Button
                onClick={generateReport}
                disabled={loading || !startDate || !endDate}
                className="bg-[#8B7355] hover:bg-[#6B5744] text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {loading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}
          </CardContent>
        </Card>

        {/* Report Results */}
        {report && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <p className="text-xs text-[#8B7355] font-medium uppercase tracking-wide">Transactions</p>
                  <p className="text-2xl font-bold text-[#5C4A3A] mt-1">{report.grandTotal.count}</p>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <p className="text-xs text-[#8B7355] font-medium uppercase tracking-wide">Total Sales</p>
                  <p className="text-2xl font-bold text-[#5C4A3A] mt-1">{fmtPKR(report.grandTotal.subtotal)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <p className="text-xs text-[#8B7355] font-medium uppercase tracking-wide">Tax Collected</p>
                  <p className="text-2xl font-bold text-[#5C4A3A] mt-1">{fmtPKR(report.grandTotal.tax)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <p className="text-xs text-[#8B7355] font-medium uppercase tracking-wide">Gross Total</p>
                  <p className="text-2xl font-bold text-[#5C4A3A] mt-1">{fmtPKR(report.grandTotal.total)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Download Bar */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-[#E8DED8] p-4">
              <div>
                <p className="font-semibold text-[#5C4A3A]">
                  Report: {report.period.start_date} → {report.period.end_date}
                </p>
                <p className="text-sm text-[#8B7355]">
                  {report.lineItems.length} invoices · Generated {new Date(report.generated_at).toLocaleString("en-PK")}
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={printPreview} variant="outline" className="border-[#8B7355] text-[#5C4A3A] hover:bg-[#F5F1ED]">
                  <Printer className="h-4 w-4 mr-2" /> Print 300 Invoices
                </Button>
                <Button onClick={downloadCSV} className="bg-[#5C4A3A] hover:bg-[#3a2e22] text-white">
                  <Download className="h-4 w-4 mr-2" /> Download CSV
                </Button>
              </div>
            </div>

            {/* Summary by Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#5C4A3A]">Tax Summary by Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E8DED8] text-[#8B7355]">
                        <th className="text-left py-3 px-2 font-medium">Payment Method</th>
                        <th className="text-right py-3 px-2 font-medium">Transactions</th>
                        <th className="text-right py-3 px-2 font-medium">Subtotal</th>
                        <th className="text-right py-3 px-2 font-medium">Tax Collected</th>
                        <th className="text-right py-3 px-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.summary.map((s) => (
                        <tr key={s.payment_method} className="border-b border-[#F5F1ED]">
                          <td className="py-3 px-2 font-medium text-[#5C4A3A]">{s.payment_method}</td>
                          <td className="py-3 px-2 text-right text-[#5C4A3A]">{s.count}</td>
                          <td className="py-3 px-2 text-right text-[#5C4A3A]">{fmtPKR(s.subtotal)}</td>
                          <td className="py-3 px-2 text-right font-semibold text-[#5C4A3A]">{fmtPKR(s.tax)}</td>
                          <td className="py-3 px-2 text-right text-[#5C4A3A]">{fmtPKR(s.total)}</td>
                        </tr>
                      ))}
                      <tr className="bg-[#F5F1ED] font-bold">
                        <td className="py-3 px-2 text-[#5C4A3A]">TOTAL</td>
                        <td className="py-3 px-2 text-right text-[#5C4A3A]">{report.grandTotal.count}</td>
                        <td className="py-3 px-2 text-right text-[#5C4A3A]">{fmtPKR(report.grandTotal.subtotal)}</td>
                        <td className="py-3 px-2 text-right text-[#5C4A3A]">{fmtPKR(report.grandTotal.tax)}</td>
                        <td className="py-3 px-2 text-right text-[#5C4A3A]">{fmtPKR(report.grandTotal.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Rate Notice */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Tax Rate Notice</p>
                <p>
                  This report uses the <strong>actual tax collected</strong> on each invoice. Your system charges 17% on Cash and 8% on Card.
                  A small number of early Card sales (Aug 7) were charged at 5% before the rate was updated — these are reflected at their actual
                  collected amount. Foodpanda orders are 0% tax. Verify the rates match your PRA registration before submitting.
                </p>
              </div>
            </div>

            {/* Line Items Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#5C4A3A]">Invoice Detail ({report.lineItems.length} total)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-[#E8DED8] text-[#8B7355]">
                        <th className="text-left py-2 px-2 font-medium">Bill #</th>
                        <th className="text-left py-2 px-2 font-medium">Date</th>
                        <th className="text-left py-2 px-2 font-medium">Time</th>
                        <th className="text-left py-2 px-2 font-medium">Method</th>
                        <th className="text-right py-2 px-2 font-medium">Subtotal</th>
                        <th className="text-right py-2 px-2 font-medium">Rate</th>
                        <th className="text-right py-2 px-2 font-medium">Tax</th>
                        <th className="text-right py-2 px-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.lineItems.slice(0, 200).map((item, i) => (
                        <tr key={i} className="border-b border-[#F5F1ED] hover:bg-[#F5F1ED]">
                          <td className="py-2 px-2 text-[#5C4A3A] font-mono text-xs">{item.bill_number}</td>
                          <td className="py-2 px-2 text-[#5C4A3A]">{item.date}</td>
                          <td className="py-2 px-2 text-[#8B7355]">{item.time}</td>
                          <td className="py-2 px-2 text-[#5C4A3A]">{item.payment_method}</td>
                          <td className="py-2 px-2 text-right text-[#5C4A3A]">{fmtPKR(item.subtotal)}</td>
                          <td className="py-2 px-2 text-right text-[#8B7355]">{item.tax_rate}%</td>
                          <td className="py-2 px-2 text-right text-[#5C4A3A]">{fmtPKR(item.tax_amount)}</td>
                          <td className="py-2 px-2 text-right font-medium text-[#5C4A3A]">{fmtPKR(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {report.lineItems.length > 200 && (
                  <p className="text-sm text-[#8B7355] mt-3 text-center">
                    Showing first 200 of {report.lineItems.length} invoices. Download the CSV for the complete report.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}