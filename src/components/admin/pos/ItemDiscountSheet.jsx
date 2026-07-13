import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const PRESETS = [5, 10, 15, 20, 50];

export default function ItemDiscountSheet({ open, onOpenChange, item, onApply }) {
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (open) setCustom("");
  }, [open, item?.id]);

  const current = Number(item?.item_discount_pct || 0);
  const unitPrice = Number(item?.price || 0);

  const apply = (pct) => {
    const n = Math.min(100, Math.max(0, Number(pct) || 0));
    onApply?.(item?.id, n);
    onOpenChange(false);
  };

  const submitCustom = () => {
    const n = Math.min(100, Math.max(0, Number(custom)));
    apply(Number.isFinite(n) ? n : 0);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-w-lg mx-auto px-5 pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="text-[#5C4A3A]">Item Discount</SheetTitle>
          <p className="text-sm text-[#8B7355] -mt-1">{item?.name} · PKR {unitPrice.toFixed(0)}</p>
        </SheetHeader>

        <div className="mt-4">
          {current > 0 && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              Current: {current}% off &rarr; PKR {(unitPrice * (1 - current / 100)).toFixed(0)}
            </div>
          )}

          <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Quick pick</label>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {PRESETS.map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => apply(pct)}
                className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${current === pct ? "border-red-400 bg-red-50 text-red-700" : "border-[#E8DED8] bg-white text-[#8B7355] hover:border-[#C9B8A6]"}`}
              >
                {pct}%
              </button>
            ))}
          </div>

          <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Custom %</label>
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              min="0"
              max="100"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitCustom(); }}
              placeholder="Enter %"
              className="flex-1 border border-[#E8DED8] rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            />
            <Button type="button" onClick={submitCustom} className="bg-[#8B7355] hover:bg-[#6B5744] rounded-xl px-5">Apply</Button>
          </div>

          <Button
            type="button"
            onClick={() => apply(0)}
            variant="outline"
            className="w-full rounded-xl border-red-300 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Clear Discount
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}