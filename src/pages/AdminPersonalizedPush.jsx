import { useEffect, useState, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, Loader2, RefreshCw, Send, Check, Sparkles, Search, Send as SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import PushDraftCard, { TACTIC_STYLE } from "@/components/push/PushDraftCard";
import PushBulkBar from "@/components/push/PushBulkBar";
import PushStatsBar from "@/components/push/PushStatsBar";
import PushHistoryTab from "@/components/push/PushHistoryTab";

const SEGMENT_STYLE = {
  new: { label: "New", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  regular: { label: "Regular", color: "bg-blue-100 text-blue-700 border-blue-200" },
  lapsed: { label: "Lapsed", color: "bg-amber-100 text-amber-700 border-amber-200" },
  high_value: { label: "VIP", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

const SEGMENT_FILTERS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "regular", label: "Regular" },
  { key: "lapsed", label: "Lapsed" },
  { key: "high_value", label: "VIP" },
];

const TACTIC_FILTERS = [
  { key: "all", label: "All Tactics" },
  ...Object.entries(TACTIC_STYLE).map(([key, v]) => ({ key, label: `${v.icon} ${v.label}` })),
];

const PAGE_SIZE = 25;

export default function AdminPersonalizedPush() {
  const [user, setUser] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [approved, setApproved] = useState([]);
  const [sentCount, setSentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // editing
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  // send state
  const [sendingId, setSendingId] = useState(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [testingId, setTestingId] = useState(null);

  // ui
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // search + filter + selection
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [tacticFilter, setTacticFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeTab, setActiveTab] = useState("queue"); // queue | history

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || (u.role !== "admin" && u.role !== "super_admin")) {
        window.location.href = "/StaffPortal";
        return;
      }
      setUser(u);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [page, sentPage] = await Promise.all([
        base44.entities.PersonalizedPush.filter(
          { status: { $in: ["draft", "approved", "sent"] } },
          { sort: "-generated_at", limit: 500 }
        ),
        base44.entities.PersonalizedPush.count({ status: "sent" }),
      ]);
      const items = page.items || page || [];
      setDrafts(items.filter(r => r.status === "draft"));
      setApproved(items.filter(r => r.status === "approved"));
      setSentCount(typeof sentPage === "number" ? sentPage : (sentPage?.count || 0));
    } catch (e) {
      toast.error(e?.message || "Failed to load pushes");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // Filtered drafts (search + segment)
  const filteredDrafts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drafts.filter(r => {
      if (segmentFilter !== "all" && r.segment !== segmentFilter) return false;
      if (tacticFilter !== "all" && r.tactic !== tacticFilter) return false;
      if (!q) return true;
      return (
        (r.customer_name || "").toLowerCase().includes(q) ||
        (r.customer_email || "").toLowerCase().includes(q) ||
        (r.favorite_item || "").toLowerCase().includes(q)
      );
    });
  }, [drafts, search, segmentFilter, tacticFilter]);

  const visibleDrafts = filteredDrafts.slice(0, visibleCount);
  const hasMore = filteredDrafts.length > visibleCount;

  // Reset pagination when filter/search changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, segmentFilter, tacticFilter]);

  // Selection helpers
  const allFilteredSelected = filteredDrafts.length > 0 && filteredDrafts.every(r => selectedIds.has(r.id));
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredDrafts.forEach(r => next.delete(r.id));
      } else {
        filteredDrafts.forEach(r => next.add(r.id));
      }
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const updateRecord = (id, patch) => base44.entities.PersonalizedPush.update(id, patch);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generatePersonalizedPush", {});
      const data = res.data || res;
      if (data.success) {
        toast.success(`Generated ${data.generated} personalized pushes`, {
          description: Object.entries(data.byTactic || {})
            .map(([k, v]) => `${TACTIC_STYLE[k]?.label || k}: ${v}`)
            .join(" · ")
        });
        clearSelection();
        await load();
      } else {
        toast.error(data.error || "Generation failed");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Generation failed");
    }
    setGenerating(false);
  };

  const startEdit = (rec) => {
    setEditingId(rec.id);
    setEditTitle(rec.title);
    setEditBody(rec.body);
  };

  const saveEdit = async (rec) => {
    try {
      await updateRecord(rec.id, { title: editTitle, body: editBody });
      setDrafts(prev => prev.map(r => r.id === rec.id ? { ...r, title: editTitle, body: editBody } : r));
      setEditingId(null);
      toast.success("Message updated");
    } catch (e) {
      const msg = e?.message || "Update failed";
      if (/not found/i.test(msg)) {
        toast.error("This draft was refreshed. Reloading…");
        setEditingId(null);
        await load();
      } else {
        toast.error(msg);
      }
    }
  };

  const approve = async (rec) => {
    try {
      await updateRecord(rec.id, { status: "approved" });
      setDrafts(prev => prev.filter(r => r.id !== rec.id));
      setApproved(prev => [{ ...rec, status: "approved" }, ...prev]);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(rec.id); return n; });
      toast.success("Approved for sending");
    } catch (e) {
      toast.error(e?.message || "Approve failed");
    }
  };

  const skip = async (rec) => {
    try {
      await updateRecord(rec.id, { status: "skipped" });
      setDrafts(prev => prev.filter(r => r.id !== rec.id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(rec.id); return n; });
      toast("Push skipped");
    } catch (e) {
      toast.error(e?.message || "Skip failed");
    }
  };

  const copyMessage = async (rec) => {
    const text = `${rec.title}\n${rec.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(rec.id);
      setTimeout(() => setCopiedId(null), 1500);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  // Send to a single customer (used by approved "Send" and draft "Test Send")
  const sendToCustomer = async (rec) => {
    const res = await base44.functions.invoke("sendTargetedPushNotification", {
      user_email: rec.customer_email,
      title: rec.title,
      body: rec.body,
      data: rec.deep_link ? { deep_link: rec.deep_link } : {}
    });
    return res.data || res;
  };

  const sendOne = async (rec) => {
    setSendingId(rec.id);
    try {
      const data = await sendToCustomer(rec);
      if (data.success) {
        await updateRecord(rec.id, { status: "sent", sent_at: new Date().toISOString() });
        setApproved(prev => prev.filter(r => r.id !== rec.id));
        setSentCount(c => c + 1);
        toast.success(`Sent to ${rec.customer_name} (${data.sent_count || 0} device${(data.sent_count || 0) === 1 ? "" : "s"})`);
      } else {
        toast.error(data.error || "Send failed");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Send failed");
    }
    setSendingId(null);
  };

  // Test Send — send a draft to just this customer to verify, mark as sent
  const testSend = async (rec) => {
    setTestingId(rec.id);
    try {
      const data = await sendToCustomer(rec);
      if (data.success) {
        await updateRecord(rec.id, { status: "sent", sent_at: new Date().toISOString() });
        setDrafts(prev => prev.filter(r => r.id !== rec.id));
        setSelectedIds(prev => { const n = new Set(prev); n.delete(rec.id); return n; });
        setSentCount(c => c + 1);
        toast.success(`Test sent to ${rec.customer_name} (${data.sent_count || 0} device${(data.sent_count || 0) === 1 ? "" : "s"})`);
      } else {
        toast.error(data.error || "Test send failed");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Test send failed");
    }
    setTestingId(null);
  };

  const sendAllApproved = async () => {
    if (approved.length === 0) return;
    setSendingAll(true);
    let ok = 0, fail = 0;
    for (const rec of approved) {
      try {
        const data = await sendToCustomer(rec);
        if (data.success) {
          await updateRecord(rec.id, { status: "sent", sent_at: new Date().toISOString() });
          ok++;
        } else { fail++; }
      } catch { fail++; }
    }
    setApproved([]);
    setSentCount(c => c + ok);
    setSendingAll(false);
    toast.success(`Sent ${ok} pushes${fail ? `, ${fail} failed` : ""}`);
  };

  // Bulk approve / skip on selected drafts
  const bulkApprove = async () => {
    const targets = drafts.filter(r => selectedIds.has(r.id));
    if (targets.length === 0) return;
    setBulkBusy(true);
    let ok = 0;
    for (const rec of targets) {
      try {
        await updateRecord(rec.id, { status: "approved" });
        ok++;
      } catch { /* keep going */ }
    }
    setApproved(prev => [...targets.map(r => ({ ...r, status: "approved" })), ...prev]);
    setDrafts(prev => prev.filter(r => !selectedIds.has(r.id)));
    clearSelection();
    setBulkBusy(false);
    toast.success(`Approved ${ok} of ${targets.length} pushes`);
  };

  const bulkSkip = async () => {
    const targets = drafts.filter(r => selectedIds.has(r.id));
    if (targets.length === 0) return;
    setBulkBusy(true);
    let ok = 0;
    for (const rec of targets) {
      try {
        await updateRecord(rec.id, { status: "skipped" });
        ok++;
      } catch { /* keep going */ }
    }
    setDrafts(prev => prev.filter(r => !selectedIds.has(r.id)));
    clearSelection();
    setBulkBusy(false);
    toast(`Skipped ${ok} of ${targets.length} pushes`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white">
        <div className="max-w-5xl mx-auto px-5 pt-8 pb-6">
          <Link to="/StaffPortal" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-4 mb-5">
            <div className="bg-white/15 rounded-2xl p-3"><Bell className="h-7 w-7" /></div>
            <div>
              <h1 className="text-2xl font-bold">Personalized Push Engine</h1>
              <p className="text-white/70 text-sm">Dynamic per-customer profiles from scanned bills — search, test, approve & bulk send</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-white text-[#5C4A3A] hover:bg-[#F5EBE8] rounded-xl gap-2 font-semibold"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Generating…" : "Generate / Refresh Drafts"}
            </Button>
            <Button
              onClick={load}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Reload
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">
        {/* Stats */}
        <PushStatsBar drafts={drafts} approvedCount={approved.length} sentCount={sentCount} />

        {/* Tab toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("queue")}
            className={`text-sm px-4 py-2 rounded-xl font-semibold transition-colors ${
              activeTab === "queue"
                ? "bg-[#5C4A3A] text-white"
                : "bg-white text-[#8B7355] border border-[#E8DED8] hover:border-[#8B7355]"
            }`}
          >
            Review Queue
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`text-sm px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-[#5C4A3A] text-white"
                : "bg-white text-[#8B7355] border border-[#E8DED8] hover:border-[#8B7355]"
            }`}
          >
            Sent History
            {sentCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === "history" ? "bg-white/20" : "bg-[#F5EBE8]"}`}>
                {sentCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === "history" ? (
          <PushHistoryTab sentCount={sentCount} />
        ) : (
          <>
        {/* Approved — ready to send */}
        {approved.length > 0 && (
          <div className="bg-white rounded-3xl border border-emerald-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#5C4A3A] flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" /> Approved ({approved.length})
              </h2>
              <Button
                onClick={sendAllApproved}
                disabled={sendingAll}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2"
              >
                {sendingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sendingAll ? "Sending…" : `Send All (${approved.length})`}
              </Button>
            </div>
            <div className="space-y-2.5">
              {approved.map(rec => (
                <div key={rec.id} className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-[#5C4A3A] text-sm truncate">{rec.customer_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${SEGMENT_STYLE[rec.segment]?.color}`}>
                          {SEGMENT_STYLE[rec.segment]?.label}
                        </span>
                        {rec.favorite_item && (
                          <span className="text-xs text-[#8B7355] truncate max-w-[180px]">☕ {rec.favorite_item}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-[#5C4A3A]">{rec.title}</p>
                      <p className="text-sm text-[#8B7355]">{rec.body}</p>
                      <p className="text-xs text-[#C9B8A6] mt-1 truncate">{rec.customer_email}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => sendOne(rec)}
                      disabled={sendingId === rec.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 flex-shrink-0"
                    >
                      {sendingId === rec.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendIcon className="h-3.5 w-3.5" />}
                      Send
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drafts — review queue */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-bold text-[#5C4A3A] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#8B7355]" /> Review Queue ({drafts.length})
            </h2>
            {filteredDrafts.length > 0 && (
              <button
                onClick={toggleSelectAllFiltered}
                className="text-xs text-[#8B7355] hover:text-[#5C4A3A] font-medium flex items-center gap-1.5"
              >
                <span className={`h-4 w-4 rounded border-2 flex items-center justify-center ${allFilteredSelected ? "bg-[#8B7355] border-[#8B7355]" : "border-[#C9B8A6]"}`}>
                  {allFilteredSelected && <Check className="h-3 w-3 text-white" />}
                </span>
                {allFilteredSelected ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>

          {/* Search + segment filters */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="h-4 w-4 text-[#C9B8A6] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by customer name, email, or favorite item…"
                className="pl-10 border-[#E8DED8] rounded-xl"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {SEGMENT_FILTERS.map(f => (
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
            <div className="flex gap-1.5 flex-wrap">
              {TACTIC_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setTacticFilter(f.key)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    tacticFilter === f.key
                      ? "bg-[#5C4A3A] text-white border-[#5C4A3A]"
                      : "bg-[#F9F6F3] text-[#8B7355] border-[#E8DED8] hover:border-[#8B7355]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" /></div>
          ) : filteredDrafts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[#8B7355] text-sm mb-2">
                {drafts.length === 0 ? "No drafts yet." : "No drafts match your search."}
              </p>
              <p className="text-xs text-[#C9B8A6]">
                {drafts.length === 0
                  ? "Click Generate / Refresh Drafts to build personalized pushes from your customers' scanned bills."
                  : "Try a different search term or segment filter."}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {visibleDrafts.map(rec => (
                  <PushDraftCard
                    key={rec.id}
                    rec={rec}
                    selected={selectedIds.has(rec.id)}
                    onToggleSelect={toggleSelect}
                    onApprove={approve}
                    onSkip={skip}
                    onTestSend={testSend}
                    onStartEdit={startEdit}
                    onSaveEdit={saveEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onCopy={copyMessage}
                    onToggleProfile={(id) => setExpandedId(prev => prev === id ? null : id)}
                    isEditing={editingId === rec.id}
                    editTitle={editTitle}
                    editBody={editBody}
                    setEditTitle={setEditTitle}
                    setEditBody={setEditBody}
                    isExpanded={expandedId === rec.id}
                    copied={copiedId === rec.id}
                    testingId={testingId}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                    className="rounded-xl border-[#E8DED8] text-[#8B7355] gap-2"
                  >
                    Load more ({filteredDrafts.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#C9B8A6]">
          Search a customer, tap <strong>Test Send</strong> to verify the push on them alone, then <strong>Approve</strong> & bulk-send the rest.
        </p>
          </>
        )}
      </div>

      {/* Sticky bulk action bar */}
      <PushBulkBar
        selectedCount={selectedIds.size}
        onApproveSelected={bulkApprove}
        onSkipSelected={bulkSkip}
        onClear={clearSelection}
        busy={bulkBusy}
      />
    </div>
  );
}