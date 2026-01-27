import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import QRCode from "qrcode";

export default function BillGenerator({ bill, onClose }) {
  const billRef = useRef(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    if (bill.qrCodeId) {
      QRCode.toDataURL(bill.qrCodeId, { width: 200, margin: 1 })
        .then(url => setQrCodeUrl(url));
    }
  }, [bill.qrCodeId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = billRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`bill-${bill.billNumber}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
      >
        <div className="sticky top-0 bg-white border-b border-[#E8DED8] p-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-xl font-bold text-[#5C4A3A]">Invoice</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="rounded-xl"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPDF}
              className="rounded-xl"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F5EBE8] rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-[#8B7355]" />
            </button>
          </div>
        </div>

        {/* Bill Content */}
        <div ref={billRef} className="p-8 bg-white">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#C9B8A6] mb-4">
              <span className="text-2xl">☕</span>
            </div>
            <h1 className="text-3xl font-bold text-[#5C4A3A]">Bean Coffee</h1>
            <p className="text-[#8B7355] text-sm">Premium Coffee & Rewards</p>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4 mb-8 pb-6 border-b-2 border-[#E8DED8]">
            <div>
              <p className="text-xs text-[#8B7355] mb-1">Invoice Number</p>
              <p className="font-bold text-[#5C4A3A]">{bill.billNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#8B7355] mb-1">Date</p>
              <p className="font-medium text-[#5C4A3A]">
                {format(new Date(bill.date), "MMM dd, yyyy HH:mm")}
              </p>
            </div>
            {bill.customerInfo.name && (
              <div>
                <p className="text-xs text-[#8B7355] mb-1">Customer Name</p>
                <p className="font-medium text-[#5C4A3A]">{bill.customerInfo.name}</p>
              </div>
            )}
            {bill.customerInfo.phone && (
              <div className="text-right">
                <p className="text-xs text-[#8B7355] mb-1">Phone</p>
                <p className="font-medium text-[#5C4A3A]">{bill.customerInfo.phone}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <table className="w-full mb-8">
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
                  <td className="text-right py-3 font-medium text-[#5C4A3A]">
                    PKR {(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="space-y-2 mb-8">
            <div className="flex justify-between text-[#8B7355]">
              <span>Subtotal</span>
              <span>PKR {bill.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#8B7355]">
              <span>GST (17%)</span>
              <span>PKR {bill.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold text-[#5C4A3A] pt-4 border-t-2 border-[#E8DED8]">
              <span>Total</span>
              <span>PKR {bill.total.toFixed(2)}</span>
            </div>
          </div>

          {/* QR Code for Rewards */}
          {qrCodeUrl && (
            <div className="text-center py-6 border-t border-[#E8DED8]">
              <p className="text-sm font-semibold text-[#5C4A3A] mb-3">Scan to Earn Rewards</p>
              <img src={qrCodeUrl} alt="Rewards QR Code" className="w-48 h-48 mx-auto border-4 border-[#E8DED8] rounded-2xl" />
              <p className="text-xs text-[#8B7355] mt-3">
                Scan this code in the Bean app to earn {Math.floor(bill.total / 100)} points!
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-6 border-t border-[#E8DED8]">
            <p className="text-sm text-[#8B7355] mb-2">Thank you for your purchase!</p>
            <p className="text-xs text-[#C9B8A6]">Bean Coffee - Where every cup tells a story</p>
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}