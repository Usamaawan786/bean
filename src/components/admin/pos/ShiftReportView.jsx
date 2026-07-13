import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShiftReport from "./ShiftReport";
import { printThermalDocument } from "@/lib/printReceipt";

export default function ShiftReportView({ shift, onClose }) {
  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["shift-report-sales", shift.id],
    queryFn: () => base44.entities.StoreSale.filter({ shift_id: shift.id })
  });
  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["shift-report-entries", shift.id],
    queryFn: () => base44.entities.ShiftExpense.filter({ shift_id: shift.id })
  });

  const loading = loadingSales || loadingEntries;

  const handlePrint = () => {
    if (loading) return;
    printThermalDocument("shift-report", 80);
  };

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 z-40" />
      <div data-receipt-stage className="fixed inset-0 z-50 overflow-auto flex flex-col items-center p-4" style={{ background: "#eeeeee" }}>
        <div data-receipt-toolbar className="sticky top-0 z-10 mb-4 flex items-center gap-2 flex-wrap justify-center bg-white rounded-2xl shadow-lg p-3 max-w-2xl w-full">
          <h2 className="text-lg font-bold text-[#5C4A3A] mr-1">Shift Report</h2>
          <Button size="sm" variant="outline" onClick={handlePrint} disabled={loading} className="rounded-xl">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            Print
          </Button>
          <button onClick={onClose} className="p-2 hover:bg-[#F5EBE8] rounded-full transition-colors ml-auto">
            <X className="h-5 w-5 text-[#8B7355]" />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[#8B7355]">Loading report...</p>
        ) : (
          <ShiftReport shift={shift} sales={sales} entries={entries} />
        )}
      </div>
    </>,
    document.body
  );
}