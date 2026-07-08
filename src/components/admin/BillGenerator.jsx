import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Printer, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import QRCode from "qrcode";

const PAPER_WIDTH_KEY = "thermalPaperWidth";

const IOS_APP_URL = "https://apps.apple.com/pk/app/bean-pakistan/id6758788396";
const ANDROID_APP_URL = "https://play.google.com/store/apps/details?id=com.base6976cd7fe6e4b20fcb30cf61.app";
const LOGO_URL = "https://media.base44.com/images/public/6976cd7fe6e4b20fcb30cf61/f3d3c0edf_Group1302.png";

export default function BillGenerator({ bill, onClose, autoDownload = false }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrReady, setQrReady] = useState(!bill.qrCodeId);
  const [iosQrUrl, setIosQrUrl] = useState("");
  const [androidQrUrl, setAndroidQrUrl] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [paperWidth, setPaperWidth] = useState(() => {
    const saved = localStorage.getItem(PAPER_WIDTH_KEY);
    return saved === "58" ? 58 : 80;
  });

  const setWidth = (w) => {
    setPaperWidth(w);
    localStorage.setItem(PAPER_WIDTH_KEY, String(w));
  };

  const generatePDF = useCallback((qrUrl, iosUrl, androidUrl, logoUrl) => {
    // Branded A4 invoice matching the on-screen POS design (beige / brown).
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210, pageH = 297;
    const margin = 18;
    const left = margin;
    const right = pageW - margin;
    const contentW = right - left;
    const center = pageW / 2;

    const brown = [92, 74, 58];       // #5C4A3A
    const brownSec = [139, 115, 85]; // #8B7355
    const border = [232, 222, 216];  // #E8DED8
    const accent = [245, 235, 232];  // #F5EBE8

    let y = margin;
    const ensureSpace = (need) => {
      if (y + need > pageH - margin) { doc.addPage(); y = margin; }
    };

    // --- Header: logo + brand ---
    if (logoUrl) {
      try { doc.addImage(logoUrl, "PNG", center - 11, y, 22, 22); } catch (e) {}
      y += 26;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...brown);
    doc.text("Bean", center, y, { align: "center" });
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...brownSec);
    doc.text("More than just coffee, it's a community!", center, y, { align: "center" });
    y += 8;

    // --- Invoice meta band ---
    const bandH = 18;
    doc.setFillColor(...accent);
    doc.roundedRect(left, y, contentW, bandH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...brown);
    doc.text("INVOICE", left + 5, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...brownSec);
    doc.text(`No. ${bill.billNumber}`, right - 5, y + 7, { align: "right" });
    doc.text(format(new Date(bill.date), "MMM dd, yyyy HH:mm"), right - 5, y + 14, { align: "right" });
    y += bandH + 6;

    // --- Customer info ---
    if (bill.customerInfo?.name || bill.customerInfo?.phone) {
      doc.setFontSize(9);
      if (bill.customerInfo.name) {
        doc.setTextColor(...brownSec); doc.text("Customer", left, y);
        doc.setTextColor(...brown); doc.setFont("helvetica", "bold");
        doc.text(String(bill.customerInfo.name), left + 25, y);
        doc.setFont("helvetica", "normal");
        y += 6;
      }
      if (bill.customerInfo.phone) {
        doc.setTextColor(...brownSec); doc.text("Phone", left, y);
        doc.setTextColor(...brown); doc.setFont("helvetica", "bold");
        doc.text(String(bill.customerInfo.phone), left + 25, y);
        doc.setFont("helvetica", "normal");
        y += 6;
      }
      y += 4;
    }

    // --- Items table ---
    const colQty = left + contentW - 78;
    const colPrice = left + contentW - 44;
    const colTotal = right - 5;
    doc.setFillColor(...accent);
    doc.rect(left, y, contentW, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...brown);
    doc.text("Item", left + 4, y + 6);
    doc.text("Qty", colQty + 8, y + 6, { align: "center" });
    doc.text("Price", colPrice, y + 6, { align: "right" });
    doc.text("Total", colTotal, y + 6, { align: "right" });
    y += 9;
    bill.items.forEach((item) => {
      ensureSpace(11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...brown);
      doc.text(String(item.name).slice(0, 42), left + 4, y + 6);
      doc.setTextColor(...brownSec);
      doc.text(String(item.quantity), colQty + 8, y + 6, { align: "center" });
      doc.text(`PKR ${item.price.toFixed(2)}`, colPrice, y + 6, { align: "right" });
      doc.setTextColor(...brown);
      doc.setFont("helvetica", "bold");
      doc.text(`PKR ${(item.price * item.quantity).toFixed(2)}`, colTotal, y + 6, { align: "right" });
      doc.setDrawColor(...border); doc.setLineWidth(0.2);
      doc.line(left, y + 9, right, y + 9);
      y += 9;
    });
    y += 6;

    // --- Totals (right-aligned column) ---
    const labelX = right - 60;
    const valueX = right - 4;
    const totalsRow = (label, value, opts = {}) => {
      ensureSpace(9);
      doc.setFont("helvetica", opts.bold ? "bold" : "normal");
      doc.setFontSize(opts.size || 9);
      doc.setTextColor(...(opts.color || brownSec));
      doc.text(label, labelX, y + 5);
      doc.setTextColor(...(opts.valueColor || brown));
      doc.text(value, valueX, y + 5, { align: "right" });
      y += (opts.size || 9) > 11 ? 8 : 6;
    };
    if (bill.discountPct > 0) {
      totalsRow("Subtotal", `PKR ${(bill.originalSubtotal ?? bill.subtotal).toFixed(2)}`);
      totalsRow(`Discount (${bill.discountPct}%)`, `- PKR ${(bill.discountAmount ?? 0).toFixed(2)}`, { color: [220, 38, 38], valueColor: [220, 38, 38] });
    } else {
      totalsRow("Subtotal", `PKR ${bill.subtotal.toFixed(2)}`);
    }
    const gstLabel = bill.paymentMethod === "Card" ? "5%" : "17%";
    totalsRow(`GST (${gstLabel})`, `PKR ${bill.tax.toFixed(2)}`);
    ensureSpace(8);
    doc.setDrawColor(...brown); doc.setLineWidth(0.5);
    doc.line(labelX, y, valueX, y);
    y += 4;
    totalsRow("TOTAL", `PKR ${bill.total.toFixed(2)}`, { bold: true, size: 13, color: brown, valueColor: brown });
    y += 4;

    // --- Reward points pill ---
    ensureSpace(12);
    const pts = bill.pointsToAward ?? Math.floor(bill.subtotal / 100);
    doc.setFillColor(...accent);
    doc.roundedRect(labelX, y, valueX - labelX, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...brown);
    doc.text("Reward Points Earned", labelX + 4, y + 6.5);
    doc.setFontSize(11);
    doc.text(`${pts} pts`, valueX - 4, y + 6.5, { align: "right" });
    y += 12;

    // --- Rewards QR section ---
    if (qrUrl) {
      ensureSpace(50);
      doc.setDrawColor(...border); doc.setLineWidth(0.3);
      doc.line(left, y, right, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...brown);
      doc.text("Earn Rewards", center, y, { align: "center" });
      y += 4;
      const qrSize = 34;
      try { doc.addImage(qrUrl, "PNG", center - qrSize / 2, y, qrSize, qrSize); } catch (e) {}
      y += qrSize + 3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...brownSec);
      doc.text("Scan in the Bean Pakistan App to add points", center, y, { align: "center" });
      y += 5;
      if (bill.qrCodeId) {
        doc.setFontSize(7);
        doc.text("or enter code manually:", center, y, { align: "center" });
        y += 4;
        const codeW = Math.min(contentW, 14 + bill.qrCodeId.length * 2.6);
        doc.setFillColor(...accent);
        doc.roundedRect(center - codeW / 2, y, codeW, 8, 2, 2, "F");
        doc.setFont("courier", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...brown);
        doc.text(bill.qrCodeId, center, y + 5.5, { align: "center" });
        y += 12;
      }
    }

    // --- App download QRs + footer (all on same page) ---
    const qrSm = 24, gapSm = 10;
    const appSectionH = 6 + 5 + qrSm + 4 + 6 + 5 + 5; // separator + title + qr + labels + footer
    ensureSpace(appSectionH);
    doc.setDrawColor(...border); doc.setLineWidth(0.3);
    doc.line(left, y, right, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...brown);
    doc.text("Don't have the app? Download & scan", center, y, { align: "center" });
    y += 4;
    const startX = center - (qrSm * 2 + gapSm) / 2;
    if (iosUrl) { try { doc.addImage(iosUrl, "PNG", startX, y, qrSm, qrSm); } catch (e) {} }
    if (androidUrl) { try { doc.addImage(androidUrl, "PNG", startX + qrSm + gapSm, y, qrSm, qrSm); } catch (e) {} }
    y += qrSm + 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...brownSec);
    if (iosUrl) doc.text("iOS", startX + qrSm / 2, y, { align: "center" });
    if (androidUrl) doc.text("Android", startX + qrSm + gapSm + qrSm / 2, y, { align: "center" });
    y += 6;

    // --- Footer ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...brown);
    doc.text("Thank you for your purchase!", center, y, { align: "center" });
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...brownSec);
    doc.text("Bean — More than just coffee, it's a community!", center, y, { align: "center" });

    try {
      doc.save(`invoice-${bill.billNumber}.pdf`);
    } catch (e) {
      toast.error(`PDF generation failed: ${e?.message || e}`);
    }
  }, [bill]);

  // Open a dedicated thermal-receipt tab with all assets inlined as base64.
  const handlePrintReceipt = useCallback(() => {
    if (!qrReady || !iosQrUrl || !androidQrUrl || !logoDataUrl) {
      toast.error("Preparing assets — please try again in a moment.");
      return;
    }
    try {
      sessionStorage.setItem(
        "thermalReceiptData",
        JSON.stringify({
          bill,
          qrCodeUrl,
          iosQrUrl,
          androidQrUrl,
          logoDataUrl,
          paperWidth,
        })
      );
    } catch (e) {
      toast.error("Could not prepare receipt for printing.");
      return;
    }
    window.open("/thermal-receipt", "_blank");
  }, [bill, qrReady, iosQrUrl, androidQrUrl, logoDataUrl, qrCodeUrl, paperWidth]);

  // Generate QR codes
  useEffect(() => {
    if (bill.qrCodeId) {
      QRCode.toDataURL(bill.qrCodeId, { width: 200, margin: 1 }).then((url) => {
        setQrCodeUrl(url);
        setQrReady(true);
      });
    }
  }, [bill.qrCodeId]);

  useEffect(() => {
    QRCode.toDataURL(IOS_APP_URL, { width: 160, margin: 1 }).then(setIosQrUrl);
    QRCode.toDataURL(ANDROID_APP_URL, { width: 160, margin: 1 }).then(setAndroidQrUrl);
  }, []);

  // Pre-fetch the real Bean logo as a base64 data URL (jsPDF addImage needs inline data)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(LOGO_URL);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => { if (!cancelled && reader.result) setLogoDataUrl(reader.result); };
        reader.readAsDataURL(blob);
      } catch (e) { /* logo stays empty — receipt continues without image */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-download once ALL QR codes AND the logo are ready
  useEffect(() => {
    if (autoDownload && qrReady && iosQrUrl && androidQrUrl && logoDataUrl) {
      generatePDF(qrCodeUrl, iosQrUrl, androidQrUrl, logoDataUrl);
    }
  }, [autoDownload, qrReady, iosQrUrl, androidQrUrl, logoDataUrl, qrCodeUrl, generatePDF]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        
        <div className="sticky top-0 bg-white border-b border-[#E8DED8] p-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-xl font-bold text-[#5C4A3A]">Invoice</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrintReceipt} className="rounded-xl">
              {(!qrReady || !iosQrUrl || !androidQrUrl || !logoDataUrl)
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Preparing…</>
                : <><Printer className="h-4 w-4 mr-2" />Print Receipt</>}
            </Button>
            <Button size="sm" variant="outline" onClick={() => generatePDF(qrCodeUrl, iosQrUrl, androidQrUrl, logoDataUrl)} className="rounded-xl">
              {(!iosQrUrl || !androidQrUrl || !logoDataUrl)
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
                : <><Download className="h-4 w-4 mr-2" />Download Invoice</>}
            </Button>
            <button onClick={onClose} className="p-2 hover:bg-[#F5EBE8] rounded-full transition-colors">
              <X className="h-5 w-5 text-[#8B7355]" />
            </button>
          </div>
        </div>
        {/* Paper width setting */}
        <div className="bg-[#F5EBE8] border-b border-[#E8DED8] px-4 py-2 flex items-center gap-3">
          <span className="text-xs font-medium text-[#8B7355]">Receipt paper:</span>
          <div className="flex bg-white rounded-full p-0.5 border border-[#E8DED8]">
            <button
              onClick={() => setWidth(58)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${paperWidth === 58 ? "bg-[#5C4A3A] text-white" : "text-[#8B7355]"}`}
            >58mm</button>
            <button
              onClick={() => setWidth(80)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${paperWidth === 80 ? "bg-[#5C4A3A] text-white" : "text-[#8B7355]"}`}
            >80mm</button>
          </div>
          <span className="text-[10px] text-[#C9B8A6]">Applies to Print Receipt output</span>
        </div>

        <div className="p-6 bg-white">
          <div className="text-center mb-4">
            <img src={LOGO_URL} alt="Bean Logo" className="w-20 h-20 mx-auto mb-2 object-contain" />
            <h1 className="text-2xl font-bold text-[#5C4A3A]">Bean</h1>
            <p className="text-[#8B7355] text-xs">More than just coffee, it's a community!</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4 pb-4 border-b-2 border-[#E8DED8]">
            <div>
              <p className="text-xs text-[#8B7355] mb-1">Invoice Number</p>
              <p className="font-bold text-[#5C4A3A]">{bill.billNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#8B7355] mb-1">Date</p>
              <p className="font-medium text-[#5C4A3A]">{format(new Date(bill.date), "MMM dd, yyyy HH:mm")}</p>
            </div>
            {bill.customerInfo?.name && (
              <div>
                <p className="text-xs text-[#8B7355] mb-1">Customer Name</p>
                <p className="font-medium text-[#5C4A3A]">{bill.customerInfo.name}</p>
              </div>
            )}
            {bill.customerInfo?.phone && (
              <div className="text-right">
                <p className="text-xs text-[#8B7355] mb-1">Phone</p>
                <p className="font-medium text-[#5C4A3A]">{bill.customerInfo.phone}</p>
              </div>
            )}
          </div>

          <table className="w-full mb-4">
            <thead>
              <tr className="border-b-2 border-[#E8DED8]">
                <th className="text-left py-3 text-sm font-semibold text-[#5C4A3A]">Item</th>
                <th className="text-center py-3 text-sm font-semibold text-[#5C4A3A]">Qty</th>
                <th className="text-right py-3 text-sm font-semibold text-[#5C4A3A]">Price</th>
                <th className="text-right py-3 text-sm font-semibold text-[#5C4A3A]">Total</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, index) => (
                <tr key={index} className="border-b border-[#F5EBE8]">
                  <td className="py-3 text-[#5C4A3A]">{item.name}</td>
                  <td className="text-center py-3 text-[#8B7355]">{item.quantity}</td>
                  <td className="text-right py-3 text-[#8B7355]">PKR {item.price.toFixed(2)}</td>
                  <td className="text-right py-3 font-medium text-[#5C4A3A]">PKR {(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1.5 mb-4">
            {bill.discountPct > 0 ? (
              <>
                <div className="flex justify-between text-[#8B7355]">
                  <span>Subtotal</span>
                  <span>PKR {(bill.originalSubtotal ?? bill.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-500 font-medium">
                  <span>Discount ({bill.discountPct}%)</span>
                  <span>- PKR {(bill.discountAmount ?? 0).toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-[#8B7355]">
                <span>Subtotal</span>
                <span>PKR {bill.subtotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#8B7355]">
              <span>GST ({bill.paymentMethod === "Card" ? "5%" : "17%"})</span>
              <span>PKR {bill.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-[#5C4A3A] pt-3 border-t-2 border-[#E8DED8]">
              <span>Total</span>
              <span>PKR {bill.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-[#8B7355] pt-3 border-t border-[#E8DED8]">
              <span className="font-semibold">🎁 Reward Points Earned</span>
              <span className="text-xl font-bold text-[#8B7355]">{bill.pointsToAward ?? Math.floor(bill.subtotal / 100)} pts</span>
            </div>
          </div>

          {qrCodeUrl && (
            <div className="text-center py-3 border-t border-[#E8DED8]">
              <p className="text-xs font-semibold text-[#5C4A3A] mb-2">Earn Rewards</p>
              <img src={qrCodeUrl} alt="Rewards QR Code" className="w-32 h-32 mx-auto border-4 border-[#E8DED8] rounded-2xl" />
              <p className="text-xs text-[#8B7355] mt-2">Scan in the Bean Pakistan App to add points to your account</p>
              {bill.qrCodeId && (
                <div className="mt-3 inline-block bg-[#F5EBE8] rounded-xl px-4 py-2">
                  <p className="text-[10px] text-[#8B7355] mb-1">or enter code manually</p>
                  <p className="font-mono font-bold text-sm tracking-wider text-[#5C4A3A] break-all">{bill.qrCodeId}</p>
                </div>
              )}
            </div>
          )}

          <div className="text-center py-4 border-t border-[#E8DED8]">
            <p className="text-xs font-semibold text-[#5C4A3A] mb-3">Don't have the Bean app yet? Download & scan</p>
            <div className="flex items-center justify-center gap-6">
              <div>
                {iosQrUrl && <img src={iosQrUrl} alt="Download on iOS" className="w-24 h-24 mx-auto border-4 border-[#E8DED8] rounded-2xl" />}
                <p className="text-xs text-[#8B7355] mt-1">iOS</p>
              </div>
              <div>
                {androidQrUrl && <img src={androidQrUrl} alt="Download on Android" className="w-24 h-24 mx-auto border-4 border-[#E8DED8] rounded-2xl" />}
                <p className="text-xs text-[#8B7355] mt-1">Android</p>
              </div>
            </div>
          </div>

          <div className="text-center pt-3 border-t border-[#E8DED8]">
            <p className="text-sm text-[#8B7355] mb-1">Thank you for your purchase!</p>
            <p className="text-xs text-[#C9B8A6]">Bean — More than just coffee, it's a community!</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}