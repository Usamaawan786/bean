import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ClipboardList, ChevronRight } from "lucide-react";
import ShiftReportView from "./ShiftReportView";

export default function ShiftHistoryTab() {
  const [viewingShift, setViewingShift] = useState(null);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["all-shifts"],
    queryFn: () => base44.entities.Shift.list("-opened_at", 200)
  });

  if (isLoading) {
    return <p className="text-[#8B7355] text-sm text-center py-12">Loading shifts...</p>;
  }

  if (shifts.length === 0) {
    return (
      <div className="text-center py-16">
        <ClipboardList className="h-10 w-10 text-[#C9B8A6] mx-auto mb-3" />
        <p className="text-[#8B7355] text-sm">No shifts recorded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {shifts.map(shift => (
          <button
            key={shift.id}
            onClick={() => setViewingShift(shift)}
            className="w-full flex items-center justify-between bg-white rounded-2xl border border-[#E8DED8] p-4 hover:border-[#C9B8A6] transition-colors text-left"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#5C4A3A] text-sm">{shift.shift_type === "morning" ? "Morning" : "Evening"} Shift</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${shift.status === "open" ? "bg-green-50 text-green-700" : "bg-[#F5EBE8] text-[#8B7355]"}`}>
                  {shift.status === "open" ? "OPEN" : "CLOSED"}
                </span>
              </div>
              <p className="text-xs text-[#8B7355] mt-0.5">
                {shift.opened_at ? format(new Date(shift.opened_at), "MMM dd, yyyy HH:mm") : "—"} · Opened by {shift.opened_by_name || shift.opened_by}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {shift.status === "closed" && (
                <span className={`text-xs font-bold ${Number(shift.cash_variance) >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {Number(shift.cash_variance) >= 0 ? "+" : ""}PKR {Number(shift.cash_variance || 0).toFixed(0)}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-[#C9B8A6]" />
            </div>
          </button>
        ))}
      </div>

      {viewingShift && (
        <ShiftReportView shift={viewingShift} onClose={() => setViewingShift(null)} />
      )}
    </>
  );
}