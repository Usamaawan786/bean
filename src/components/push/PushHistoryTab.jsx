import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SEGMENT_STYLE = {
  new: { label: "New", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  regular: { label: "Regular", color: "bg-blue-100 text-blue-700 border-blue-200" },
  lapsed: { label: "Lapsed", color: "bg-amber-100 text-amber-700 border-amber-200" },
  high_value: { label: "VIP", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

const TACTIC_LABEL = {
  daypart_reminder: "⏰ Daypart",
  streak_saver: "🔥 Streak Saver",
  winback_coupon: "🎁 Win-Back",
  tier_vip: "✨ Tier VIP",
  milestone_reward: "🎉 Milestone",
  bundle_upsell: "🥐 Bundle Upsell",
  order_again: "🔄 Order Again",
  new_welcome: "☕ New Welcome",
};

function formatSentAt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-PK", {
      timeZone: "Asia/Karachi",
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  } catch { return iso; }
}

export default function PushHistoryTab({ sentCount }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const page = await base44.entities.PersonalizedPush.filter(
          { status: "sent" },
          { sort: "-sent_at", limit: 500 }
        );
        if (active) setRecords(page.items || page || []);
      } catch { /* ignore */ }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [sentCount]);

  useEffect(() => { setVisibleCount(25); }, [search, segmentFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(r => {
      if (segmentFilter !== "all" && r.segment !== segmentFilter) return false;
      if (!q) return true;
      return (
        (r.customer_name || "").toLowerCase().includes(q) ||
        (r.customer_email || "").toLowerCase().includes(q) ||
        (r.favorite_item || "").toLowerCase().includes(q) ||
        (r.title || "").toLowerCase().includes(q)
      );
    });
  }, [records, search, segmentFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <div className="bg-white rounded-3xl border border-[#E8DED8] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-bold text-[#5C4A3A] flex items-center gap-2">
          <Send className="h-5 w-5 text-[#8B7355]" /> Sent History ({records.length})
        </h2>
      </div>

      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="h-4 w-4 text-[#C9B8A6] absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name, email, favorite item, or message…"
            className="pl-10 border-[#E8DED8] rounded-xl"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "All" },
            { key: "new", label: "New" },
            { key: "regular", label: "Regular" },
            { key: "lapsed", label: "Lapsed" },
            { key: "high_value", label: "VIP" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setSegmentFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                segmentFilter === f.key
                  ? "bg-[#8B7355] text-white border-[#8B7355]"
                  : "bg-white text-[#8B7355] border-[#E8DED8] hover:border-[#8B7355]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-[#8B7355] text-sm mb-1">
            {records.length === 0 ? "No sent pushes yet." : "No sent pushes match your search."}
          </p>
          <p className="text-xs text-[#C9B8A6]">
            Sent pushes will appear here with the recipient, time, and message.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2.5">
            {visible.map(rec => (
              <div key={rec.id} className="rounded-2xl bg-[#F9F6F3] border border-[#E8DED8] p-3.5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-[#5C4A3A] text-sm truncate">{rec.customer_name || "—"}</p>
                      {rec.segment && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${SEGMENT_STYLE[rec.segment]?.color || ""}`}>
                          {SEGMENT_STYLE[rec.segment]?.label || rec.segment}
                        </span>
                      )}
                      {rec.tactic && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-[#E8DED8] text-[#8B7355]">
                          {TACTIC_LABEL[rec.tactic] || rec.tactic}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#5C4A3A]">{rec.title}</p>
                    <p className="text-sm text-[#8B7355]">{rec.body}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-[#C9B8A6] flex-wrap">
                      <span className="truncate">{rec.customer_email}</span>
                      {rec.favorite_item && <span className="truncate">☕ {rec.favorite_item}</span>}
                      {rec.offer_hook && <span className="truncate">🏷️ {rec.offer_hook}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Sent
                    </span>
                    <span className="text-xs text-[#C9B8A6] flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatSentAt(rec.sent_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="text-center mt-4">
              <Button
                variant="outline"
                onClick={() => setVisibleCount(c => c + 25)}
                className="rounded-xl border-[#E8DED8] text-[#8B7355] gap-2"
              >
                Load more ({filtered.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-[#C9B8A6] mt-4 flex items-center gap-1.5">
        <XCircle className="h-3.5 w-3.5" />
        If an approved push didn't send, the customer likely had no active device token on file.
      </p>
    </div>
  );
}