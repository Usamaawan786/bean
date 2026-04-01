import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Zap, Plus, ArrowLeft, Edit3, Trash2, Play, Pause, CheckCircle2,
  Clock, MapPin, Package, Users, Calendar, Coffee, Gift, Star,
  RefreshCw, X, Save, AlertTriangle, Eye, EyeOff, Loader2, Copy,
  ChevronRight, BarChart2, QrCode, ShieldCheck, Search, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";

// ── Templates ─────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "happy_hour",
    emoji: "☕",
    title: "Happy Hour Special",
    description: "Free upgrade on any drink size — limited to first 30 customers!",
    total_items: 30,
    location_name: "Bean Main Branch",
    color: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
  {
    id: "mystery_box",
    emoji: "🎁",
    title: "Mystery Brew Box",
    description: "Grab a surprise mystery brew — handpicked by our baristas. One per customer!",
    total_items: 20,
    location_name: "Bean Main Branch",
    color: "bg-purple-50 border-purple-200",
    badge: "bg-purple-100 text-purple-700",
  },
  {
    id: "free_pastry",
    emoji: "🥐",
    title: "Free Pastry Friday",
    description: "Complimentary pastry with any hot beverage purchase. Today only!",
    total_items: 50,
    location_name: "Bean Main Branch",
    color: "bg-orange-50 border-orange-200",
    badge: "bg-orange-100 text-orange-700",
  },
  {
    id: "loyalty_bonus",
    emoji: "⭐",
    title: "Triple Points Drop",
    description: "Earn 3x loyalty points on all orders during this drop window!",
    total_items: 100,
    location_name: "Bean Main Branch",
    color: "bg-yellow-50 border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700",
  },
  {
    id: "new_blend",
    emoji: "🫘",
    title: "New Blend Launch",
    description: "Be among the first to try our brand new seasonal blend — free sample!",
    total_items: 40,
    location_name: "Bean Main Branch",
    color: "bg-green-50 border-green-200",
    badge: "bg-green-100 text-green-700",
  },
  {
    id: "flash_discount",
    emoji: "🏷️",
    title: "Flash 20% Discount",
    description: "20% off your entire order during this flash window. No code needed!",
    total_items: 75,
    location_name: "Bean Main Branch",
    color: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
];

const STATUS_CONFIG = {
  active: { label: "Live", cls: "bg-green-100 text-green-700", icon: Play, dot: "bg-green-500" },
  upcoming: { label: "Scheduled", cls: "bg-blue-100 text-blue-700", icon: Clock, dot: "bg-blue-500" },
  ended: { label: "Ended", cls: "bg-gray-100 text-gray-500", icon: CheckCircle2, dot: "bg-gray-400" },
};

const EMPTY_FORM = {
  title: "",
  description: "",
  location: "",
  location_name: "",
  start_time: "",
  end_time: "",
  total_items: 30,
  items_remaining: 30,
  status: "upcoming",
  image_url: "",
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function DropCard({ drop, onEdit, onDelete, onActivate, onEnd }) {
  const claimedCount = (drop.claimed_by || []).length;
  const total = drop.total_items || 0;
  const remaining = drop.items_remaining ?? total;
  const pct = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border ${drop.status === "active" ? "border-green-300 shadow-green-100 shadow-md" : "border-[#E8DED8]"} overflow-hidden`}
    >
      {drop.status === "active" && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-1" />
      )}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F5EBE8] to-[#EDE3DF] flex items-center justify-center text-2xl flex-shrink-0">
            ⚡
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-[#5C4A3A] text-sm">{drop.title}</span>
              <StatusBadge status={drop.status} />
            </div>
            <p className="text-xs text-[#8B7355] line-clamp-2 mb-2">{drop.description}</p>
            <div className="flex items-center gap-3 text-xs text-[#8B7355] flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{drop.location_name || drop.location || "—"}</span>
              {drop.start_time && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(drop.start_time), "MMM d, h:mm a")}
                </span>
              )}
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{claimedCount} claimed</span>
              <span className="flex items-center gap-1"><Package className="h-3 w-3" />{remaining} left</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-[#8B7355] mb-1">
            <span>{total - remaining} / {total} claimed</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="h-1.5 bg-[#F5EBE8] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct > 80 ? "bg-red-400" : pct > 50 ? "bg-amber-400" : "bg-green-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F5EBE8]">
          <button onClick={() => onEdit(drop)} className="flex items-center gap-1 text-xs text-[#8B7355] hover:text-[#5C4A3A] px-2 py-1.5 rounded-lg hover:bg-[#F5EBE8] transition-colors">
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </button>
          <div className="flex-1" />

          {drop.status === "upcoming" && (
            <Button onClick={() => onActivate(drop)} className="bg-green-500 hover:bg-green-600 text-white text-xs rounded-xl px-3 h-8 gap-1.5">
              <Play className="h-3.5 w-3.5" /> Go Live
            </Button>
          )}
          {drop.status === "active" && (
            <Button onClick={() => onEnd(drop)} variant="outline" className="text-xs rounded-xl px-3 h-8 gap-1.5 border-orange-400 text-orange-600 hover:bg-orange-50">
              <Pause className="h-3.5 w-3.5" /> End Drop
            </Button>
          )}
          {drop.status === "ended" && (
            <Button onClick={() => onActivate(drop)} variant="outline" className="text-xs rounded-xl px-3 h-8 gap-1.5 border-blue-400 text-blue-600 hover:bg-blue-50">
              <RefreshCw className="h-3.5 w-3.5" /> Reactivate
            </Button>
          )}
          <button onClick={() => onDelete(drop.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function DropForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Keep items_remaining in sync with total_items for new drops
  const handleTotalChange = (v) => {
    const n = parseInt(v) || 0;
    setForm(f => ({ ...f, total_items: n, items_remaining: f.items_remaining === f.total_items ? n : f.items_remaining }));
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Title *</label>
          <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Flash Drop Title" className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-amber-300" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Location Name</label>
          <input value={form.location_name} onChange={e => set("location_name", e.target.value)} placeholder="Bean Main Branch" className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-amber-300" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Description *</label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="What's being dropped?" rows={2} className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
      </div>

      <div>
        <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Full Address (optional)</label>
        <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. F-7 Markaz, Islamabad" className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-amber-300" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Start Time *</label>
          <input type="datetime-local" value={form.start_time ? form.start_time.slice(0, 16) : ""} onChange={e => set("start_time", e.target.value)} className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-amber-300" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">End Time *</label>
          <input type="datetime-local" value={form.end_time ? form.end_time.slice(0, 16) : ""} onChange={e => set("end_time", e.target.value)} className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-amber-300" />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Total Items *</label>
          <input type="number" value={form.total_items} onChange={e => handleTotalChange(e.target.value)} min={1} className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-amber-300" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Items Remaining</label>
          <input type="number" value={form.items_remaining} onChange={e => set("items_remaining", parseInt(e.target.value) || 0)} min={0} className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-amber-300" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Status</label>
          <select value={form.status} onChange={e => set("status", e.target.value)} className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] bg-white focus:outline-none focus:ring-2 focus:ring-amber-300">
            <option value="upcoming">Scheduled (Upcoming)</option>
            <option value="active">Live (Active Now)</option>
            <option value="ended">Ended</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Image URL (optional)</label>
        <input value={form.image_url} onChange={e => set("image_url", e.target.value)} placeholder="https://..." className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-amber-300" />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={() => onSave(form)}
          disabled={saving || !form.title || !form.description}
          className="flex-1 bg-[#5C4A3A] hover:bg-[#4A3829] text-white rounded-xl gap-2"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Drop</>}
        </Button>
      </div>
    </div>
  );
}

export default function AdminFlashDrops() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("active"); // active | upcoming | ended | templates | create
  const [editDrop, setEditDrop] = useState(null); // null = create, object = edit
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [foundClaim, setFoundClaim] = useState(null);
  const [verifyNotFound, setVerifyNotFound] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || u.role !== "admin") window.location.href = "/";
      else setUser(u);
    });
  }, []);

  const { data: drops = [], isLoading } = useQuery({
    queryKey: ["admin-flash-drops"],
    queryFn: () => base44.entities.FlashDrop.list("-created_date", 200),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const activeDrops = drops.filter(d => d.status === "active");
  const upcomingDrops = drops.filter(d => d.status === "upcoming");
  const endedDrops = drops.filter(d => d.status === "ended");

  const stats = {
    live: activeDrops.length,
    scheduled: upcomingDrops.length,
    totalClaims: drops.reduce((s, d) => s + (d.claimed_by?.length || 0), 0),
    ended: endedDrops.length,
  };

  const handleSave = async (form) => {
    setSaving(true);
    const data = { ...form };
    if (data.start_time && !data.start_time.includes("Z")) data.start_time = new Date(data.start_time).toISOString();
    if (data.end_time && !data.end_time.includes("Z")) data.end_time = new Date(data.end_time).toISOString();

    if (editDrop) {
      await base44.entities.FlashDrop.update(editDrop.id, data);
      showToast("Drop updated!");
    } else {
      await base44.entities.FlashDrop.create(data);
      showToast("Drop created!");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-flash-drops"] });
    setSaving(false);
    setShowForm(false);
    setEditDrop(null);
    setTab(data.status === "active" ? "active" : "upcoming");
  };

  const handleActivate = async (drop) => {
    await base44.entities.FlashDrop.update(drop.id, { status: "active" });
    queryClient.invalidateQueries({ queryKey: ["admin-flash-drops"] });
    showToast(`"${drop.title}" is now LIVE! ⚡`);
    setTab("active");
  };

  const handleEnd = async (drop) => {
    await base44.entities.FlashDrop.update(drop.id, { status: "ended" });
    queryClient.invalidateQueries({ queryKey: ["admin-flash-drops"] });
    showToast(`"${drop.title}" has been ended.`);
  };

  const handleDelete = async (id) => {
    await base44.entities.FlashDrop.delete(id);
    queryClient.invalidateQueries({ queryKey: ["admin-flash-drops"] });
    showToast("Drop deleted.");
  };

  const handleEdit = (drop) => {
    setEditDrop(drop);
    setShowForm(true);
    setTab("create");
  };

  const handleApplyTemplate = (tpl) => {
    setEditDrop(null);
    setShowForm(true);
    const now = new Date();
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2h default
    setEditDrop({
      ...EMPTY_FORM,
      title: tpl.title,
      description: tpl.description,
      total_items: tpl.total_items,
      items_remaining: tpl.total_items,
      location_name: tpl.location_name,
      start_time: now.toISOString().slice(0, 16),
      end_time: end.toISOString().slice(0, 16),
      status: "upcoming",
    });
    setTab("create");
  };

  const handleGoLiveTemplate = async (tpl) => {
    setSaving(true);
    const now = new Date();
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    await base44.entities.FlashDrop.create({
      title: tpl.title,
      description: tpl.description,
      total_items: tpl.total_items,
      items_remaining: tpl.total_items,
      location_name: tpl.location_name,
      location: "Bean Coffee, Islamabad",
      start_time: now.toISOString(),
      end_time: end.toISOString(),
      status: "active",
    });
    queryClient.invalidateQueries({ queryKey: ["admin-flash-drops"] });
    setSaving(false);
    showToast(`${tpl.emoji} "${tpl.title}" is now LIVE! ⚡`);
    setTab("active");
  };

  const handleVerifyQR = async () => {
    const code = verifyCode.trim().toUpperCase();
    if (!code) return;
    setVerifying(true);
    setFoundClaim(null);
    setVerifyNotFound(false);
    const results = await base44.entities.FlashDropClaim.filter({ qr_code: code });
    if (results.length === 0) {
      setVerifyNotFound(true);
    } else {
      const claimData = results[0];
      const drop = drops.find(d => d.id === claimData.drop_id);
      setFoundClaim({ ...claimData, _drop: drop || null });
    }
    setVerifying(false);
  };

  const handleRedeemQR = async () => {
    if (!foundClaim || foundClaim.is_redeemed) return;
    setRedeeming(true);
    await base44.entities.FlashDropClaim.update(foundClaim.id, { is_redeemed: true });
    setFoundClaim(prev => ({ ...prev, is_redeemed: true }));
    setRedeeming(false);
    showToast("✅ Flash Drop redeemed successfully!");
  };

  const tabDrops = tab === "active" ? activeDrops : tab === "upcoming" ? upcomingDrops : endedDrops;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-xl ${toast.type === "error" ? "bg-red-600 text-white" : "bg-[#5C4A3A] text-white"}`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#5C4A3A] via-[#6B5744] to-[#8B7355] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 text-6xl pointer-events-none select-none">
          <span className="absolute top-4 left-8">⚡</span>
          <span className="absolute bottom-4 right-12">🎁</span>
          <span className="absolute top-16 right-6">☕</span>
        </div>
        <div className="relative max-w-5xl mx-auto px-5 pt-10 pb-8">
          <Link to="/AdminDashboard" className="inline-flex items-center gap-1 text-white/70 text-sm mb-5 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-white/15 rounded-2xl p-3">
              <Zap className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Flash Drops Control</h1>
              <p className="text-white/70 text-sm">Create, schedule, activate and manage all flash drops</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Live Now", value: stats.live, icon: "🟢" },
              { label: "Scheduled", value: stats.scheduled, icon: "⏰" },
              { label: "Total Claims", value: stats.totalClaims, icon: "✅" },
              { label: "Ended", value: stats.ended, icon: "🏁" },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-2xl p-3 text-center">
                <div className="text-lg mb-0.5">{s.icon}</div>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-white/70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="bg-white border-b border-[#E8DED8] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 py-2">
          {[
            { id: "active", label: `Live (${stats.live})`, icon: Play },
            { id: "upcoming", label: `Scheduled (${stats.scheduled})`, icon: Clock },
            { id: "ended", label: `Ended (${stats.ended})`, icon: CheckCircle2 },
            { id: "templates", label: "Templates", icon: Copy },
            { id: "create", label: "Create / Edit", icon: Plus },
            { id: "verify", label: "Verify QR", icon: QrCode },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); if (t.id !== "create") { setShowForm(false); setEditDrop(null); } }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? "bg-[#5C4A3A] text-white shadow" : "text-[#8B7355] hover:bg-[#F5EBE8]"}`}
              >
                <Icon className="h-3.5 w-3.5" />{t.label}
              </button>
            );
          })}
          <div className="flex-1" />
          <Button
            onClick={() => { setEditDrop(null); setShowForm(true); setTab("create"); }}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs gap-1.5 h-9 px-3"
          >
            <Plus className="h-3.5 w-3.5" /> New Drop
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 pb-20 space-y-5">

        {/* Create / Edit */}
        {tab === "create" && (
          <div className="bg-white rounded-3xl border border-[#E8DED8] p-6">
            <h2 className="font-bold text-[#5C4A3A] text-lg mb-5">
              {editDrop?.id ? "Edit Flash Drop" : "Create New Flash Drop"}
            </h2>
            <DropForm
              initial={editDrop}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditDrop(null); setTab("active"); }}
              saving={saving}
            />
          </div>
        )}

        {/* Templates */}
        {tab === "templates" && (
          <>
            <div>
              <h2 className="font-bold text-[#5C4A3A] text-lg mb-1">Drop Templates</h2>
              <p className="text-sm text-[#8B7355]">One-click push to live or customize before scheduling.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map(tpl => (
                <div key={tpl.id} className={`rounded-2xl border p-4 ${tpl.color}`}>
                  <div className="text-3xl mb-2">{tpl.emoji}</div>
                  <h3 className="font-bold text-[#5C4A3A] mb-1">{tpl.title}</h3>
                  <p className="text-xs text-[#8B7355] mb-3 leading-relaxed">{tpl.description}</p>
                  <div className="flex items-center gap-1 mb-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tpl.badge}`}>
                      {tpl.total_items} items
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tpl.badge}`}>
                      {tpl.location_name}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApplyTemplate(tpl)}
                      className="flex-1 border border-[#8B7355] text-[#5C4A3A] text-xs font-semibold py-2 rounded-xl hover:bg-white/60 transition-colors"
                    >
                      Customize
                    </button>
                    <button
                      onClick={() => handleGoLiveTemplate(tpl)}
                      disabled={saving}
                      className="flex-1 bg-[#5C4A3A] text-white text-xs font-semibold py-2 rounded-xl hover:bg-[#4A3829] transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Zap className="h-3 w-3" /> Push Live
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Verify QR Tab */}
        {tab === "verify" && (
          <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm">
            <h2 className="font-bold text-[#5C4A3A] text-lg mb-1 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[#8B7355]" /> Verify Flash Drop QR
            </h2>
            <p className="text-sm text-[#8B7355] mb-5">Enter the code shown on the customer's QR screen to verify and redeem.</p>

            <div className="flex gap-3 mb-4">
              <input
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleVerifyQR()}
                placeholder="e.g. FD-ABC12-XYZ99-AB12"
                className="flex-1 border border-[#E8DED8] rounded-xl px-4 py-2.5 font-mono text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-amber-300 uppercase"
              />
              <Button onClick={handleVerifyQR} disabled={verifying || !verifyCode.trim()} className="bg-[#5C4A3A] hover:bg-[#4A3829] text-white rounded-xl px-5 gap-2">
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Verify
              </Button>
            </div>

            {verifyNotFound && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                <div><p className="font-semibold text-red-700">QR Code Not Found</p><p className="text-sm text-red-500">This code doesn't exist — do not honour.</p></div>
              </motion.div>
            )}

            {foundClaim && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border-2 p-5 ${
                  foundClaim.is_redeemed ? "bg-gray-50 border-gray-300"
                  : foundClaim._drop?.status === "active" ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
                }`}
              >
                {foundClaim.is_redeemed && (
                  <div className="flex items-center gap-2 mb-4 text-gray-600 font-bold text-base">
                    <AlertTriangle className="h-5 w-5" /> ⚠️ Already Redeemed — Do NOT Honour Again
                  </div>
                )}
                {!foundClaim.is_redeemed && foundClaim._drop?.status === "active" && (
                  <div className="flex items-center gap-2 mb-4 text-green-700 font-bold text-base">
                    <ShieldCheck className="h-5 w-5" /> ✅ Valid QR — OK to Honour
                  </div>
                )}
                {!foundClaim.is_redeemed && foundClaim._drop?.status !== "active" && (
                  <div className="flex items-center gap-2 mb-4 text-red-600 font-bold text-base">
                    <XCircle className="h-5 w-5" /> ❌ Drop Not Active — Do Not Honour
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div><p className="text-[#8B7355] text-xs">Drop</p><p className="font-bold text-[#5C4A3A]">{foundClaim.drop_title}</p></div>
                  <div><p className="text-[#8B7355] text-xs">Customer</p><p className="font-medium text-[#5C4A3A] break-all text-xs">{foundClaim.user_email}</p></div>
                  <div><p className="text-[#8B7355] text-xs">Status</p><p className="font-bold">{foundClaim.is_redeemed ? "Redeemed" : "Pending"}</p></div>
                  <div><p className="text-[#8B7355] text-xs">Drop Status</p><p className="font-bold capitalize">{foundClaim._drop?.status || "Unknown"}</p></div>
                </div>

                {!foundClaim.is_redeemed && foundClaim._drop?.status === "active" && (
                  <Button onClick={handleRedeemQR} disabled={redeeming} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl gap-2">
                    {redeeming ? <><Loader2 className="h-4 w-4 animate-spin" /> Redeeming...</> : <><ShieldCheck className="h-4 w-4" /> Mark as Redeemed</>}
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* Drop Lists */}
        {["active", "upcoming", "ended"].includes(tab) && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#5C4A3A] text-lg capitalize">
                {tab === "active" ? "🟢 Live Drops" : tab === "upcoming" ? "⏰ Scheduled Drops" : "🏁 Ended Drops"}
              </h2>
              {tab === "active" && activeDrops.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> {activeDrops.length} drop{activeDrops.length > 1 ? "s" : ""} live on app
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)}</div>
            ) : tabDrops.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#E8DED8] p-12 text-center">
                <Zap className="h-10 w-10 mx-auto mb-3 text-[#C9B8A6]" />
                <p className="text-[#8B7355] font-medium">No {tab} drops</p>
                <p className="text-xs text-[#C9B8A6] mt-1">
                  {tab === "active" ? "Activate a scheduled drop or create a new one" : tab === "upcoming" ? "Create a drop and schedule it" : "Past drops appear here"}
                </p>
                {tab !== "ended" && (
                  <button onClick={() => { setTab("templates"); }} className="mt-4 text-xs text-[#8B7355] underline">Browse Templates →</button>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {tabDrops.map(drop => (
                  <DropCard
                    key={drop.id}
                    drop={drop}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onActivate={handleActivate}
                    onEnd={handleEnd}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}