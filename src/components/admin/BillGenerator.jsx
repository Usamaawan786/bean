import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Printer, Download } from "lucide-react";
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
  const [logoDataUrl, setLogoDataUrl] = useState("");

  // Preload logo image as data URL for PDF
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        setLogoDataUrl(canvas.toDataURL("image/png"));
      } catch (e) { /* CORS or tainted canvas - skip logo in PDF */ }
    };
    img.src = LOGO_URL;
  }, []);

  const generatePDF = useCallback((qrUrl) => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 25;
    const pw = 210; // page width
    const right = pw - margin;
    let y = 20;

    // Colors (RGB)
    const dark = [92, 74, 58];      // #5C4A3A
    const med = [139, 115, 85];     // #8B7355
    const line = [232, 222, 216];   // #E8DED8

    const drawLine = (yPos) => { pdf.setDrawColor(...line); pdf.setLineWidth(0.4); pdf.line(margin, yPos, right, yPos); };

    // --- Logo ---
    if (logoDataUrl) {
      pdf.addImage(logoDataUrl, "PNG", (pw - 22) / 2, y, 22, 22);
      y += 26;
    }

    // --- Title ---
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...dark);
    pdf.text("Bean", pw / 2, y, { align: "center" });
    y += 7;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...med);
    pdf.text("More than just coffee, it's a community!", pw / 2, y, { align: "center" });
    y += 8;

    drawLine(y);
    y += 7;

    // --- Invoice info (two columns with labels) ---
    pdf.setFontSize(8);
    pdf.setTextColor(...med);
    pdf.text("Invoice Number", margin, y);
    pdf.text("Date", right, y, { align: "right" });
    y += 5;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...dark);
    pdf.text(bill.billNumber, margin, y);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(format(new Date(bill.date), "MMM dd, yyyy HH:mm"), right, y, { align: "right" });
    y += 3;

    if (bill.customerInfo?.name || bill.customerInfo?.phone) {
      y += 4;
      pdf.setFontSize(8);
      pdf.setTextColor(...med);
      if (bill.customerInfo.name) {
        pdf.text("Customer Name", margin, y);
        if (bill.customerInfo.phone) pdf.text("Phone", right, y, { align: "right" });
        y += 4;
        pdf.setFontSize(10);
        pdf.setTextColor(...dark);
        pdf.text(bill.customerInfo.name, margin, y);
        if (bill.customerInfo.phone) pdf.text(bill.customerInfo.phone, right, y, { align: "right" });
        y += 2;
      }
    }

    y += 5;
    drawLine(y);
    y += 6;

    // --- Table header ---
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...dark);
    pdf.text("Item", margin, y);
    pdf.text("Qty", 115, y, { align: "center" });
    pdf.text("Price", 147, y, { align: "right" });
    pdf.text("Total", right, y, { align: "right" });
    y += 3;
    drawLine(y);
    y += 6;

    // --- Table rows ---
    pdf.setFont("helvetica", "normal");
    bill.items.forEach((item) => {
      pdf.setTextColor(...dark);
      pdf.text(item.name, margin, y);
      pdf.setTextColor(...med);
      pdf.text(String(item.quantity), 115, y, { align: "center" });
      pdf.text(`PKR ${item.price.toFixed(2)}`, 147, y, { align: "right" });
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...dark);
      pdf.text(`PKR ${(item.price * item.quantity).toFixed(2)}`, right, y, { align: "right" });
      pdf.setFont("helvetica", "normal");
      y += 7;
    });

    y += 1;
    drawLine(y);
    y += 6;

    // --- Totals ---
    pdf.setFontSize(10);
    if (bill.discountPct > 0) {
      pdf.setTextColor(...med);
      pdf.text("Subtotal", 147, y, { align: "right" });
      pdf.text(`PKR ${(bill.originalSubtotal ?? bill.subtotal).toFixed(2)}`, right, y, { align: "right" });
      y += 6;
      pdf.setTextColor(220, 38, 38);
      pdf.text(`Discount (${bill.discountPct}%)`, 147, y, { align: "right" });
      pdf.text(`- PKR ${(bill.discountAmount ?? 0).toFixed(2)}`, right, y, { align: "right" });
      y += 6;
    } else {
      pdf.setTextColor(...med);
      pdf.text("Subtotal", 147, y, { align: "right" });
      pdf.text(`PKR ${bill.subtotal.toFixed(2)}`, right, y, { align: "right" });
      y += 6;
    }

    pdf.setTextColor(...med);
    pdf.text(`GST (${bill.paymentMethod === "Card" ? "5%" : "17%"})`, 147, y, { align: "right" });
    pdf.text(`PKR ${bill.tax.toFixed(2)}`, right, y, { align: "right" });
    y += 4;

    pdf.setLineWidth(0.8);
    pdf.setDrawColor(...line);
    pdf.line(margin, y, right, y);
    pdf.setLineWidth(0.4);
    y += 7;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(...dark);
    pdf.text("Total", 147, y, { align: "right" });
    pdf.text(`PKR ${bill.total.toFixed(2)}`, right, y, { align: "right" });
    y += 5;

    drawLine(y);
    y += 6;

    // --- Reward Points ---
    const pts = bill.pointsToAward ?? Math.floor(bill.subtotal / 100);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...med);
    pdf.text("Reward Points Earned", margin, y);
    pdf.setFontSize(14);
    pdf.text(`${pts} pts`, right, y, { align: "right" });
    y += 8;

    // --- Rewards QR ---
    if (qrUrl) {
      drawLine(y);
      y += 6;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...dark);
      pdf.text("Earn Rewards", pw / 2, y, { align: "center" });
      y += 4;
      pdf.addImage(qrUrl, "PNG", (pw - 34) / 2, y, 34, 34);
      y += 37;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...med);
      pdf.text("Scan in the Bean Pakistan App to add points to your account", pw / 2, y, { align: "center" });
      y += 7;
    }

    // --- App Download ---
    drawLine(y);
    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...dark);
    pdf.text("Don't have the Bean app yet? Download & scan", pw / 2, y, { align: "center" });
    y += 5;

    const qrSize = 26;
    if (iosQrUrl) {
      pdf.addImage(iosQrUrl, "PNG", pw / 2 - qrSize - 8, y, qrSize, qrSize);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...med);
      pdf.text("iOS", pw / 2 - qrSize / 2 - 8, y + qrSize + 4, { align: "center" });
    }
    if (androidQrUrl) {
      pdf.addImage(androidQrUrl, "PNG", pw / 2 + 8, y, qrSize, qrSize);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...med);
      pdf.text("Android", pw / 2 + qrSize / 2 + 8, y + qrSize + 4, { align: "center" });
    }
    y += qrSize + 10;

    drawLine(y);
    y += 6;
    pdf.setFontSize(9);
    pdf.setTextColor(...med);
    pdf.text("Thank you for your purchase!", pw / 2, y, { align: "center" });

    pdf.save(`bill-${bill.billNumber}.pdf`);
  }, [bill, iosQrUrl, androidQrUrl, logoDataUrl]);

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

  // Auto-download once QR is ready
  useEffect(() => {
    if (autoDownload && qrReady) {
      generatePDF(qrCodeUrl);
    }
  }, [autoDownload, qrReady, qrCodeUrl, generatePDF]);

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
          logoDataUrl={logoDataUrl}
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
            <Button size="sm" variant="outline" onClick={() => generatePDF(qrCodeUrl)} className="rounded-xl">
              <Download className="h-4 w-4 mr-2" />PDF
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