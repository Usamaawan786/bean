import { createPortal } from "react-dom";
import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import DiscountsReport from "./DiscountsReport";
import { printThermalDocument } from "@/lib/printReceipt";

// Full-screen printable stage — mirrors ShiftReportView so the Discounts
// Report prints identically on the thermal printer.
export default function DiscountsReportView({ reportDate, sales, onClose }) {
  const handlePrint = () => {
    printThermalDocument("discounts-report", 80);
  };

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 z-40" />
      <div data-receipt-stage className="fixed inset-0 z-50 overflow-auto flex flex-col items-center p-4" style={{ background: "#eeeeee" }}>
        <div data-receipt-toolbar className="sticky top-0 z-10 mb-4 flex items-center gap-2 flex-wrap justify-center bg-white rounded-2xl shadow-lg p-3 max-w-2xl w-full">
          <h2 className="text-lg font-bold text-[#5C4A3A] mr-1">Discounts Report</h2>
          <Button size="sm" variant="outline" onClick={handlePrint} className="rounded-xl">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <button onClick={onClose} className="p-2 hover:bg-[#F5EBE8] rounded-full transition-colors ml-auto">
            <X className="h-5 w-5 text-[#8B7355]" />
          </button>
        </div>

        <DiscountsReport reportDate={reportDate} sales={sales} />
      </div>
    </>,
    document.body
  );
}