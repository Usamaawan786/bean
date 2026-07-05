import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Printer, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import QRCode from "qrcode";
import ThermalReceipt, { ThermalPrintStyles } from "@/components/admin/ThermalReceipt";

const IOS_APP_URL = "https://apps.apple.com/pk/app/bean-pakistan/id6758788396";
const ANDROID_APP_URL = "https://play.google.com/store/apps/details?id=com.base6976cd7fe6e4b20fcb30cf61.app";
const LOGO_URL = "https://media.base44.com/images/public/6976cd7fe6e4b20fcb30cf61/f3d3c0edf_Group1302.png";

export default function BillGenerator({ bill, onClose, autoDownload = false }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrReady, setQrReady] = useState(!bill.qrCodeId);
  const [iosQrUrl, setIosQrUrl] = useState("");
  const [androidQrUrl, setAndroidQrUrl] = useState("");

  const generatePDF = useCallback((qrUrl, iosUrl, androidUrl) => {
    // 80mm thermal receipt PDF — monochrome, Courier, auto height.
    const margin = 4;
    const pw = 80;
    const right = pw - margin; // 76
    const center = pw / 2;      // 40
    const black = [0, 0, 0];

    const dashedLine = (doc, y) => {
      doc.setLineDashPattern([1, 1], 0);
      doc.setDrawColor(...black);
      doc.setLineWidth(0.2);
      doc.line(margin, y, right, y);
      doc.setLineDashPattern([], 0);
    };
    const solidLine = (doc, y) => {
      doc.setDrawColor(...black);
      doc.setLineWidth(0.5);
      doc.line(margin, y, right, y);
    };

    // Draw the full receipt into `doc`, returning the final y (for height calc).
    const layout = (doc) => {
      let y = margin;
      doc.setFont("courier", "normal");
      doc.setTextColor(...black);

      // --- Logo: vector coffee-bean mark (avoids base64/CORS/PNG-decode issues) ---
      {
        const lc = center;
        const lcy = y + 7.5;
        doc.setFillColor(...black);
        doc.ellipse(lc, lcy, 6, 7.5, "F"); // filled bean
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.8);
        doc.lines([[3.5, 6, -3.5, 9, 0, 15]], lc, lcy - 7.5, [1, 1], "S", false); // white S-seam
        doc.setDrawColor(...black);
      }
      y += 16;

      // --- Brand header ---
      doc.setFont("courier", "bold");
      doc.setFontSize(14);
      doc.text("BEAN", center, y, { align: "center" });
      y += 5;
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.text("More than just coffee, it's a community!", center, y, { align: "center" });
      y += 3;

      dashedLine(doc, y); y += 3;

      // --- Invoice info ---
      doc.setFontSize(8);
      doc.setFont("courier", "normal");
      doc.text("Invoice No.", margin, y);
      doc.setFont("courier", "bold");
      doc.text(String(bill.billNumber), right, y, { align: "right" });
      y += 4;
      doc.setFont("courier", "normal");
      doc.text("Date", margin, y);
      doc.text(format(new Date(bill.date), "MMM dd, yyyy HH:mm"), right, y, { align: "right" });
      y += 4;
      if (bill.customerInfo?.name) {
        doc.text("Customer", margin, y);
        doc.text(String(bill.customerInfo.name), right, y, { align: "right" });
        y += 4;
      }
      if (bill.customerInfo?.phone) {
        doc.text("Phone", margin, y);
        doc.text(String(bill.customerInfo.phone), right, y, { align: "right" });
        y += 4;
      }

      dashedLine(doc, y); y += 3;

      // --- Items header ---
      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      doc.text("Item", margin, y);
      doc.text("Qty", 34, y, { align: "center" });
      doc.text("Price", 52, y, { align: "right" });
      doc.text("Total", right, y, { align: "right" });
      y += 2;
      dashedLine(doc, y); y += 3;

      // --- Item rows ---
      bill.items.forEach((item) => {
        doc.setFont("courier", "normal");
        doc.text(String(item.name).slice(0, 26), margin, y);
        y += 4;
        doc.text(String(item.quantity), 34, y, { align: "center" });
        doc.text(`PKR ${item.price.toFixed(2)}`, 52, y, { align: "right" });
        doc.setFont("courier", "bold");
        doc.text(`PKR ${(item.price * item.quantity).toFixed(2)}`, right, y, { align: "right" });
        y += 5;
      });

      dashedLine(doc, y); y += 3;

      // --- Totals ---
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      if (bill.discountPct > 0) {
        doc.text("Subtotal", margin, y);
        doc.text(`PKR ${(bill.originalSubtotal ?? bill.subtotal).toFixed(2)}`, right, y, { align: "right" });
        y += 4;
        doc.text(`Discount (${bill.discountPct}%)`, margin, y);
        doc.text(`-PKR ${(bill.discountAmount ?? 0).toFixed(2)}`, right, y, { align: "right" });
        y += 4;
      } else {
        doc.text("Subtotal", margin, y);
        doc.text(`PKR ${bill.subtotal.toFixed(2)}`, right, y, { align: "right" });
        y += 4;
      }
      const gstLabel = bill.paymentMethod === "Card" ? "5%" : "17%";
      doc.text(`GST (${gstLabel})`, margin, y);
      doc.text(`PKR ${bill.tax.toFixed(2)}`, right, y, { align: "right" });
      y += 3;

      solidLine(doc, y); y += 4;

      doc.setFont("courier", "bold");
      doc.setFontSize(12);
      doc.text("TOTAL", margin, y);
      doc.text(`PKR ${bill.total.toFixed(2)}`, right, y, { align: "right" });
      y += 5;

      dashedLine(doc, y); y += 3;

      // --- Reward Points ---
      const pts = bill.pointsToAward ?? Math.floor(bill.subtotal / 100);
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.text("Reward Points Earned", margin, y);
      doc.setFont("courier", "bold");
      doc.text(`${pts} pts`, right, y, { align: "right" });
      y += 4;

      // --- Rewards QR (~34mm centered) ---
      if (qrUrl) {
        dashedLine(doc, y); y += 3;
        doc.setFont("courier", "bold");
        doc.setFontSize(9);
        doc.text("Earn Rewards", center, y, { align: "center" });
        y += 3;
        try { doc.addImage(qrUrl, "PNG", center - 17, y, 34, 34); } catch (e) {}
        y += 35;
        doc.setFont("courier", "normal");
        doc.setFontSize(6);
        doc.text("Scan in the Bean Pakistan App to add points", center, y, { align: "center" });
        y += 4;
      }

      // --- App download QRs (~22mm each, side by side) ---
      dashedLine(doc, y); y += 3;
      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      doc.text("Don't have the app? Download & scan", center, y, { align: "center" });
      y += 3;
      const qrSm = 22;
      const gap = 4;
      const startX = center - (qrSm * 2 + gap) / 2;
      if (iosUrl) { try { doc.addImage(iosUrl, "PNG", startX, y, qrSm, qrSm); } catch (e) {} }
      if (androidUrl) { try { doc.addImage(androidUrl, "PNG", startX + qrSm + gap, y, qrSm, qrSm); } catch (e) {} }
      y += qrSm + 3;
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      if (iosUrl) doc.text("iOS", startX + qrSm / 2, y, { align: "center" });
      if (androidUrl) doc.text("Android", startX + qrSm + gap + qrSm / 2, y, { align: "center" });
      y += 4;

      // --- Footer ---
      dashedLine(doc, y); y += 3;
      doc.setFontSize(8);
      doc.text("Thank you for your purchase!", center, y, { align: "center" });
      y += 4;
      doc.setFontSize(6);
      doc.text("Bean - More than just coffee, it's a community!", center, y, { align: "center" });
      y += 6;
      return y;
    };

    // Two-pass: measure content height on a throwaway doc, then render the
    // final doc at exactly that height so there is no trailing blank page.
    const temp = new jsPDF({ orientation: "portrait", unit: "mm", format: [pw, 300] });
    const finalY = layout(temp);
    const height = Math.min(300, Math.max(40, finalY));
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [pw, height] });
    layout(pdf);
    try {
      pdf.save(`bill-${bill.billNumber}.pdf`);
    } catch (e) {
      toast.error(`PDF generation failed: ${e?.message || e}`);
    }
  }, [bill]);

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

  // Auto-download once ALL QR codes are ready (qr reward + app download QRs)
  useEffect(() => {
    if (autoDownload && qrReady && iosQrUrl && androidQrUrl) {
      generatePDF(qrCodeUrl, iosQrUrl, androidQrUrl);
    }
  }, [autoDownload, qrReady, iosQrUrl, androidQrUrl, qrCodeUrl, generatePDF]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <ThermalPrintStyles />
      {/* Hidden thermal receipt — only visible during window.print() */}
      <div className="thermal-print-root">
        <ThermalReceipt
          bill={bill}
          qrCodeUrl={qrCodeUrl}
          iosQrUrl={iosQrUrl}
          androidQrUrl={androidQrUrl}
          logoUrl={LOGO_URL}
        />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        
        <div className="sticky top-0 bg-white border-b border-[#E8DED8] p-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-xl font-bold text-[#5C4A3A]">Invoice</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()} className="rounded-xl">
              <Printer className="h-4 w-4 mr-2" />Print
            </Button>
            <Button size="sm" variant="outline" onClick={() => generatePDF(qrCodeUrl, iosQrUrl, androidQrUrl)} className="rounded-xl">
              {(!iosQrUrl || !androidQrUrl)
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
                : <><Download className="h-4 w-4 mr-2" />PDF</>}
            </Button>
            <button onClick={onClose} className="p-2 hover:bg-[#F5EBE8] rounded-full transition-colors">
              <X className="h-5 w-5 text-[#8B7355]" />
            </button>
          </div>
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