import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, Loader2, RefreshCw, Send, Check, X, Sparkles, Edit3, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const SEGMENT_STYLE = {
  new: { label: "New", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  regular: { label: "Regular", color: "bg-blue-100 text-blue-700 border-blue-200" },
  lapsed: { label: "Lapsed", color: "bg-amber-100 text-amber-700 border-amber-200" },
  high_value: { label: "VIP", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

export default function AdminPersonalizedPush() {
  const [user, setUser] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [sendingId, setSendingId] = useState(null);
  const [sendingAll, setSendingAll] = useState(false);

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
      const page = await base44.entities.PersonalizedPush.filter(
        { status: { $in: ["draft", "approved"] } },
        { sort: "-generated_at", limit: 500 }
      );
      const items = page.items || page || [];
      setDrafts(items.filter(r => r.status === "draft"));
      setApproved(items.filter(r => r.status === "approved"));
    } catch (e) {
      toast.error(e?.message || "Failed to load pushes");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generatePersonalizedPush", {});
      const data = res.data || res;
      if (data.success) {
        toast.success(`Generated ${data.generated} personalized pushes`, {
          description: Object.entries(data.bySegment || {})
            .map(([k, v]) => `${SEGMENT_STYLE[k]?.label || k}: ${v}`)
            .join(" · ")
        });
        await load();
      } else {
        toast.error(data.error || "Generation failed");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Generation failed");
    }
    setGenerating(false);
  };

  const updateRecord = async (id, patch) => {
    return base44.entities.PersonalizedPush.update(id, patch);
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
      toast.error(e?.message || "Update failed");
    }
  };

  const approve = async (rec) => {
    try {
      await updateRecord(rec.id, { status: "approved" });
      setDrafts(prev => prev.filter(r => r.id !== rec.id));
      setApproved(prev => [{ ...rec, status: "approved" }, ...prev]);
      toast.success("Approved for sending");
    } catch (e) {
      toast.error(e?.message || "Approve failed");
    }
  };

  const skip = async (rec) => {
    try {
      await updateRecord(rec.id, { status: "skipped" });
      setDrafts(prev => prev.filter(r => r.id !== rec.id));
      toast("Push skipped");
    } catch (e) {
      toast.error(e?.message || "Skip failed");
    }
  };

  const sendOne = async (rec) => {
    setSendingId(rec.id);
    try {
      const res = await base44.functions.invoke("sendTargetedPushNotification", {
        user_email: rec.customer_email,
        title: rec.title,
        body: rec.body,
        data: rec.deep_link ? { deep_link: rec.deep_link } : {}
      });
      const data = res.data || res;
      if (data.success) {
        await updateRecord(rec.id, { status: "sent", sent_at: new Date().toISOString() });
        setApproved(prev => prev.filter(r => r.id !== rec.id));
        toast.success(`Sent to ${rec.customer_name} (${data.sent_count || 0} device${(data.sent_count || 0) === 1 ? "" : "s"})`);
      } else {
        toast.error(data.error || "Send failed");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Send failed");
    }
    setSendingId(null);
  };

  const sendAllApproved = async () => {
    if (approved.length === 0) return;
    setSendingAll(true);
    let ok = 0, fail = 0;
    for (const rec of approved) {
      try {
        const res = await base44.functions.invoke("sendTargetedPushNotification", {
          user_email: rec.customer_email,
          title: rec.title,
          body: rec.body,
          data: rec.deep_link ? { deep_link: rec.deep_link } : {}
        });
        const data = res.data || res;
        if (data.success) {
          await updateRecord(rec.id, { status: "sent", sent_at: new Date().toISOString() });
          ok++;
        } else {
          fail++;
        }
      } catch (e) {
        fail++;
      }
    }
    setApproved([]);
    setSendingAll(false);
    toast.success(`Sent ${ok} pushes${fail ? `, ${fail} failed` : ""}`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white">
        <div className="max-w-4xl mx-auto px-5 pt-8 pb-6">
          <Link to="/StaffPortal" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-4 mb-5">
            <div className="bg-white/15 rounded-2xl p-3"><Bell className="h-7 w-7" /></div>
            <div>
              <h1 className="text-2xl font-bold">Personalized Push Engine</h1>
              <p className="text-white/70 text-sm">Auto-personalized pushes from each customer's scanned bills</p>
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

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {/* Approved — ready to send */}
        {approved.length > 0 && (
          <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-sm">
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
                {sendingAll ? "Sending…" : "Send All Approved"}
              </Button>
            </div>
            <div className="space-y-3">
              {approved.map(rec => (
                <div key={rec.id} className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-[#5C4A3A] text-sm truncate">{rec.customer_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${SEGMENT_STYLE[rec.segment]?.color}`}>{SEGMENT_STYLE[rec.segment]?.label}</span>
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
                      {sendingId === rec.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drafts — review queue */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm">
          <h2 className="font-bold text-[#5C4A3A] mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#8B7355]" /> Review Queue ({drafts.length})
          </h2>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" /></div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[#8B7355] text-sm mb-2">No drafts yet.</p>
              <p className="text-xs text-[#C9B8A6]">Click <strong>Generate / Refresh Drafts</strong> to build personalized pushes from your customers' scanned bills.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map(rec => {
                const isEditing = editingId === rec.id;
                return (
                  <div key={rec.id} className="rounded-2xl bg-[#F9F6F3] border border-[#E8DED8] p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="font-semibold text-[#5C4A3A] text-sm">{rec.customer_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${SEGMENT_STYLE[rec.segment]?.color}`}>{SEGMENT_STYLE[rec.segment]?.label}</span>
                      {rec.favorite_item && (
                        <span className="text-xs bg-[#F5EBE8] text-[#5C4A3A] px-2 py-0.5 rounded-full">☕ {rec.favorite_item}</span>
                      )}
                      <span className="text-xs text-[#C9B8A6]">{rec.order_count} scan{rec.order_count === 1 ? "" : "s"}</span>
                      {rec.days_since_last != null && (
                        <span className="text-xs text-[#C9B8A6]">· {rec.days_since_last}d ago</span>
                      )}
                    </div>
                    <p className="text-xs text-[#C9B8A6] mb-2 truncate">{rec.customer_email}</p>
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
                          <Button size="sm" onClick={() => saveEdit(rec)} className="bg-[#8B7355] hover:bg-[#6B5744] text-white rounded-lg gap-1">
                            <Save className="h-3.5 w-3.5" /> Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="rounded-lg border-[#E8DED8]">
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
                    {!isEditing && (
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={() => approve(rec)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1">
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(rec)} className="rounded-lg border-[#E8DED8] gap-1">
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => skip(rec)} className="rounded-lg border-[#E8DED8] text-[#8B7355] gap-1">
                          <X className="h-3.5 w-3.5" /> Skip
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#C9B8A6]">
          Engine profiles each customer from their scanned bills (StoreSale where the QR was scanned for points), tags a segment, and drafts a tailored push. Approve, edit, or skip before sending.
        </p>
      </div>
    </div>
  );
}