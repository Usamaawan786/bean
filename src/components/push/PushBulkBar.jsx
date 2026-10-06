import { Check, X, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Sticky bulk-action bar. Shown when at least one draft is selected.
 * Lets the admin bulk-approve, bulk-skip, or clear the selection.
 * The "Send All Approved" action lives in the approved section, not here.
 */
export default function PushBulkBar({
  selectedCount,
  onApproveSelected,
  onSkipSelected,
  onClear,
  busy,
}) {
  if (selectedCount === 0) return null;
  return (
    <div className="sticky bottom-4 z-30 mx-auto max-w-4xl">
      <div className="rounded-2xl bg-[#5C4A3A] text-white shadow-2xl border border-[#6B5744] p-3.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="bg-white/15 rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold">
            {selectedCount}
          </div>
          <span className="text-sm font-medium">
            {selectedCount === 1 ? "1 customer selected" : `${selectedCount} customers selected`}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={onApproveSelected}
            disabled={busy}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg gap-1.5"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Approve Selected
          </Button>
          <Button
            size="sm"
            onClick={onSkipSelected}
            disabled={busy}
            className="bg-white/10 hover:bg-white/20 text-white rounded-lg gap-1.5 border border-white/20"
          >
            <Trash2 className="h-3.5 w-3.5" /> Skip Selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            disabled={busy}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg gap-1"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      </div>
    </div>
  );
}