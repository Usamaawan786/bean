import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sunrise, Sunset, Loader2, Lock } from "lucide-react";

export default function ShiftGate({ user, onOpened }) {
  const [shiftType, setShiftType] = useState("morning");
  const [counter, setCounter] = useState("counter_1");
  const [openingFloat, setOpeningFloat] = useState("");
  const [opening, setOpening] = useState(false);

  const handleOpen = async () => {
    const float = Number(openingFloat);
    if (!Number.isFinite(float) || float < 0) {
      toast.error("Enter a valid opening float amount");
      return;
    }
    setOpening(true);
    try {
      await base44.entities.Shift.create({
        shift_type: shiftType,
        status: "open",
        opened_by: user.email,
        opened_by_name: user.full_name || user.email,
        opened_at: new Date().toISOString(),
        opening_float: float,
        counter
      });
      toast.success(`${shiftType === "morning" ? "Morning" : "Evening"} shift opened`);
      onOpened();
    } catch (err) {
      toast.error("Failed to open shift: " + (err?.message || "Unknown error"));
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8DED8] p-8 md:p-12 max-w-xl mx-auto text-center">
      <div className="w-16 h-16 rounded-full bg-[#F5EBE8] flex items-center justify-center mx-auto mb-5">
        <Lock className="h-7 w-7 text-[#8B7355]" />
      </div>
      <h2 className="text-xl font-bold text-[#5C4A3A] mb-1">No Active Shift</h2>
      <p className="text-sm text-[#8B7355] mb-6">Open a shift to start taking sales at this counter.</p>

      <div className="mb-5 text-left">
        <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Shift Type</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setShiftType("morning")}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${shiftType === "morning" ? "border-[#8B7355] bg-[#F5EBE8] text-[#5C4A3A]" : "border-[#E8DED8] bg-white text-[#8B7355]"}`}>
            <Sunrise className="h-4 w-4" /> Morning
          </button>
          <button type="button" onClick={() => setShiftType("evening")}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${shiftType === "evening" ? "border-[#8B7355] bg-[#F5EBE8] text-[#5C4A3A]" : "border-[#E8DED8] bg-white text-[#8B7355]"}`}>
            <Sunset className="h-4 w-4" /> Evening
          </button>
        </div>
      </div>

      <div className="mb-5 text-left">
        <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Counter</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setCounter("counter_1")}
            className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${counter === "counter_1" ? "border-[#8B7355] bg-[#F5EBE8] text-[#5C4A3A]" : "border-[#E8DED8] bg-white text-[#8B7355]"}`}>
            Counter 1
          </button>
          <button type="button" onClick={() => setCounter("counter_2")}
            className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${counter === "counter_2" ? "border-[#8B7355] bg-[#F5EBE8] text-[#5C4A3A]" : "border-[#E8DED8] bg-white text-[#8B7355]"}`}>
            Counter 2
          </button>
        </div>
      </div>

      <div className="mb-6 text-left">
        <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Opening Float (PKR cash in drawer)</label>
        <Input type="number" min="0" value={openingFloat} onChange={e => setOpeningFloat(e.target.value)} placeholder="e.g. 5000" className="border-[#E8DED8]" />
      </div>

      <Button onClick={handleOpen} disabled={opening} className="w-full bg-[#8B7355] hover:bg-[#6B5744] rounded-xl">
        {opening ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        {opening ? "Opening..." : "Open Shift"}
      </Button>
    </div>
  );
}