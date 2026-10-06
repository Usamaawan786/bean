import { Sparkles, Check, Send, Users } from "lucide-react";

const SEGMENTS = [
  { key: "new", label: "New", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  { key: "regular", label: "Regular", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  { key: "lapsed", label: "Lapsed", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  { key: "high_value", label: "VIP", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
];

export default function PushStatsBar({ drafts, approvedCount, sentCount }) {
  const counts = SEGMENTS.map(s => ({
    ...s,
    count: drafts.filter(r => r.segment === s.key).length,
  }));
  const totalDrafts = drafts.length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="rounded-2xl bg-white border border-[#E8DED8] p-3.5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-[#8B7355]" />
          <span className="text-xs text-[#8B7355] uppercase tracking-wide font-medium">Drafts</span>
        </div>
        <p className="text-2xl font-bold text-[#5C4A3A]">{totalDrafts}</p>
      </div>
      {counts.map(s => (
        <div key={s.key} className={`rounded-2xl border p-3.5 ${s.bg} ${s.border}`}>
          <div className="flex items-center gap-2 mb-1">
            <Users className={`h-4 w-4 ${s.color}`} />
            <span className={`text-xs uppercase tracking-wide font-medium ${s.color}`}>{s.label}</span>
          </div>
          <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
        </div>
      ))}
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5">
        <div className="flex items-center gap-2 mb-1">
          <Check className="h-4 w-4 text-emerald-700" />
          <span className="text-xs text-emerald-700 uppercase tracking-wide font-medium">Approved</span>
        </div>
        <p className="text-2xl font-bold text-emerald-700">{approvedCount}</p>
      </div>
      <div className="rounded-2xl bg-[#F5EBE8] border border-[#E8DED8] p-3.5">
        <div className="flex items-center gap-2 mb-1">
          <Send className="h-4 w-4 text-[#5C4A3A]" />
          <span className="text-xs text-[#5C4A3A] uppercase tracking-wide font-medium">Sent</span>
        </div>
        <p className="text-2xl font-bold text-[#5C4A3A]">{sentCount}</p>
      </div>
    </div>
  );
}