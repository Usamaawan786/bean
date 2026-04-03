import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import QRCode from "qrcode";

export default function BillGenerator({ bill, onClose, autoDownload = false }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrReady, setQrReady] = useState(!bill.qrCodeId); // true immediately if no QR needed

  const generatePDF = useCallback((qrUrl) => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 20;
    let y = 20;

    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.text("BEAN", 105, y, { align: "center" });
    y += 8;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text("More than just coffee, it's a community!", 105, y, { align: "center" });
    y += 10;

    pdf.setDrawColor(200, 180, 160);
    pdf.line(margin, y, 190, y);
    y += 6;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Invoice: ${bill.billNumber}`, margin, y);
    pdf.text(format(new Date(bill.date), "MMM dd, yyyy HH:mm"), 190, y, { align: "right" });
    y += 6;
    if (bill.customerInfo?.name) {
      pdf.setFont("helvetica", "normal");
      pdf.text(`Customer: ${bill.customerInfo.name}`, margin, y);
      y += 5;
    }
    if (bill.customerInfo?.phone) {
      pdf.text(`Phone: ${bill.customerInfo.phone}`, margin, y);
      y += 5;
    }
    y += 3;

    pdf.line(margin, y, 190, y);
    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.text("Item", margin, y);
    pdf.text("Qty", 120, y, { align: "right" });
    pdf.text("Price", 150, y, { align: "right" });
    pdf.text("Total", 190, y, { align: "right" });
    y += 4;
    pdf.line(margin, y, 190, y);
    y += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    bill.items.forEach((item) => {
      pdf.text(item.name, margin, y);
      pdf.text(String(item.quantity), 120, y, { align: "right" });
      pdf.text(`PKR ${item.price.toFixed(2)}`, 150, y, { align: "right" });
      pdf.text(`PKR ${(item.price * item.quantity).toFixed(2)}`, 190, y, { align: "right" });
      y += 7;
    });

    y += 2;
    pdf.line(margin, y, 190, y);
    y += 6;
    pdf.text("Subtotal", 140, y, { align: "right" });
    pdf.text(`PKR ${bill.subtotal.toFixed(2)}`, 190, y, { align: "right" });
    y += 6;
    pdf.text(`GST (${bill.paymentMethod === "Card" ? "5%" : "17%"})`, 140, y, { align: "right" });
    pdf.text(`PKR ${bill.tax.toFixed(2)}`, 190, y, { align: "right" });
    y += 4;
    pdf.line(margin, y, 190, y);
    y += 7;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("TOTAL", 140, y, { align: "right" });
    pdf.text(`PKR ${bill.total.toFixed(2)}`, 190, y, { align: "right" });
    y += 8;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Reward Points Earned: ${bill.pointsToAward ?? Math.floor(bill.subtotal / 100)} pts`, margin, y);
    y += 10;

    if (qrUrl) {
      pdf.addImage(qrUrl, "PNG", 82, y, 46, 46);
      y += 50;
      pdf.text("Scan in the Bean app to earn reward points", 105, y, { align: "center" });
      y += 8;
    }

    pdf.line(margin, y, 190, y);
    y += 6;
    pdf.setFontSize(9);
    pdf.text("Thank you for your purchase!", 105, y, { align: "center" });

    pdf.save(`bill-${bill.billNumber}.pdf`);
  }, [bill]);

  // Generate QR code if needed
  useEffect(() => {
    if (bill.qrCodeId) {
      QRCode.toDataURL(bill.qrCodeId, { width: 200, margin: 1 }).then((url) => {
        setQrCodeUrl(url);
        setQrReady(true);
      });
    }
  }, [bill.qrCodeId]);

  // Auto-download once QR is ready
  useEffect(() => {
    if (autoDownload && qrReady) {
      generatePDF(qrCodeUrl);
    }
  }, [autoDownload, qrReady, qrCodeUrl, generatePDF]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        
        <div className="sticky top-0 bg-white border-b border-[#E8DED8] p-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-xl font-bold text-[#5C4A3A]">Invoice</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()} className="rounded-xl">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button size="sm" variant="outline" onClick={() => generatePDF(qrCodeUrl)} className="rounded-xl">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <button onClick={onClose} className="p-2 hover:bg-[#F5EBE8] rounded-full transition-colors">
              <X className="h-5 w-5 text-[#8B7355]" />
            </button>
          </div>
        </div>

        <div className="p-6 bg-white">
          <div className="text-center mb-4">
            <img
              src="https://media.base44.com/images/public/6976cd7fe6e4b20fcb30cf61/f3d3c0edf_Group1302.png"
              alt="Bean Logo"
              className="w-20 h-20 mx-auto mb-2 object-contain" />
            
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
            {bill.customerInfo?.name &&
            <div>
                <p className="text-xs text-[#8B7355] mb-1">Customer Name</p>
                <p className="font-medium text-[#5C4A3A]">{bill.customerInfo.name}</p>
              </div>
            }
            {bill.customerInfo?.phone &&
            <div className="text-right">
                <p className="text-xs text-[#8B7355] mb-1">Phone</p>
                <p className="font-medium text-[#5C4A3A]">{bill.customerInfo.phone}</p>
              </div>
            }
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
              {bill.items.map((item, index) =>
              <tr key={index} className="border-b border-[#F5EBE8]">
                  <td className="py-3 text-[#5C4A3A]">{item.name}</td>
                  <td className="text-center py-3 text-[#8B7355]">{item.quantity}</td>
                  <td className="text-right py-3 text-[#8B7355]">PKR {item.price.toFixed(2)}</td>
                  <td className="text-right py-3 font-medium text-[#5C4A3A]">PKR {(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-[#8B7355]">
              <span>Subtotal</span>
              <span>PKR {bill.subtotal.toFixed(2)}</span>
            </div>
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

          {qrCodeUrl &&
          <div className="text-center py-3 border-t border-[#E8DED8]">
              <p className="text-xs font-semibold text-[#5C4A3A] mb-2">Earn Rewards</p>
              <img src={qrCodeUrl} alt="Rewards QR Code" className="w-32 h-32 mx-auto border-4 border-[#E8DED8] rounded-2xl" />
              <p className="text-xs text-[#8B7355] mt-2">Scan in the Bean Pakis to add points to your account</p>
            </div>
          }

          <div className="text-center pt-3 border-t border-[#E8DED8]">
            <p className="text-sm text-[#8B7355] mb-1">Thank you for your purchase!</p>
            <p className="text-xs text-[#C9B8A6]">Bean — More than just coffee, it's a community!</p>
          </div>
        </div>
      </motion.div>
    </div>);

}