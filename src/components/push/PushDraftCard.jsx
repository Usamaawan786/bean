import { Check, X, Edit3, Save, Copy, ChevronDown, User, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ProfileDetailPanel from "@/components/push/ProfileDetailPanel";

const SEGMENT_STYLE = {
  new: { label: "New", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  regular: { label: "Regular", color: "bg-blue-100 text-blue-700 border-blue-200" },
  lapsed: { label: "Lapsed", color: "bg-amber-100 text-amber-700 border-amber-200" },
  high_value: { label: "VIP", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

/**
 * One draft row in the review queue.
 * Supports selection (checkbox), inline edit, copy, profile expand,
 * approve, skip, and a one-off "Test Send" to just this customer.
 */
export default function PushDraftCard({
  rec,
  selected,
  onToggleSelect,
  onApprove,
  onSkip,
  onTestSend,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onCopy,
  onToggleProfile,
  isEditing,
  editTitle,
  editBody,
  setEditTitle,
  setEditBody,
  isExpanded,
  copied,
  testingId,
}) {
  return (
    <div className={`rounded-2xl bg-[#F9F6F3] border p-4 transition-colors ${selected ? "border-[#8B7355] ring-1 ring-[#8B7355]/30" : "border-[#E8DED8]"}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggleSelect(rec.id)}
          className={`mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            selected ? "bg-[#8B7355] border-[#8B7355]" : "border-[#C9B8A6] bg-white hover:border-[#8B7355]"
          }`}
          aria-label={selected ? "Deselect" : "Select"}
        >
          {selected && <Check className="h-3.5 w-3.5 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <p className="font-semibold text-[#5C4A3A] text-sm">{rec.customer_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${SEGMENT_STYLE[rec.segment]?.color}`}>
              {SEGMENT_STYLE[rec.segment]?.label}
            </span>
            {rec.favorite_item && (
              <span className="text-xs bg-[#F5EBE8] text-[#5C4A3A] px-2 py-0.5 rounded-full truncate max-w-[200px]">
                ☕ {rec.favorite_item}
              </span>
            )}
            <span className="text-xs text-[#C9B8A6]">{rec.order_count} scan{rec.order_count === 1 ? "" : "s"}</span>
            {rec.days_since_last != null && (
              <span className="text-xs text-[#C9B8A6]">· {rec.days_since_last}d ago</span>
            )}
          </div>
          <p className="text-xs text-[#C9B8A6] mb-2 truncate">{rec.customer_email}</p>

          {/* Body / editor */}
          {isEditing ? (
            <div className="space-y-2 mb-3">
              <Input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="border-[#E8DED8] text-sm"
              />
              <Textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                className="border-[#E8DED8] text-sm min-h-[70px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onSaveEdit(rec)} className="bg-[#8B7355] hover:bg-[#6B5744] text-white rounded-lg gap-1">
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEdit} className="rounded-lg border-[#E8DED8]">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-3">
              <p className="text-sm font-medium text-[#5C4A3A]">{rec.title}</p>
              <p className="text-sm text-[#8B7355]">{rec.body}</p>
            </div>
          )}

          {/* Actions */}
          {!isEditing && (
            <>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => onApprove(rec)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1">
                  <Check className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTestSend(rec)}
                  disabled={testingId === rec.id}
                  className="rounded-lg border-[#8B7355] text-[#8B7355] hover:bg-[#F5EBE8] gap-1"
                >
                  {testingId === rec.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Test Send
                </Button>
                <Button size="sm" variant="outline" onClick={() => onStartEdit(rec)} className="rounded-lg border-[#E8DED8] gap-1">
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => onCopy(rec)} className="rounded-lg border-[#E8DED8] gap-1">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToggleProfile(rec.id)}
                  className="rounded-lg border-[#E8DED8] gap-1"
                >
                  <User className="h-3.5 w-3.5" /> {isExpanded ? "Hide" : "Profile"}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onSkip(rec)} className="rounded-lg border-[#E8DED8] text-[#8B7355] gap-1">
                  <X className="h-3.5 w-3.5" /> Skip
                </Button>
              </div>
              {isExpanded && (
                <ProfileDetailPanel
                  customerEmail={rec.customer_email}
                  favoriteItem={rec.favorite_item}
                  segment={rec.segment}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}