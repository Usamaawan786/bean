import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Edit3, Save, X, Zap, CalendarClock, Power, Sparkles, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  pktInputToUtc, utcToPktInput, utcToPktDisplay, nowAsPktInput,
  computeActiveMultiplier, campaignStatus
} from "@/lib/pktTime";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  scheduled: "bg-blue-100 text-blue-700",
  ended: "bg-gray-100 text-gray-500",
  paused: "bg-amber-100 text-amber-700",
};

const PRESETS = [
  { label: "2x This Weekend", mult: 2, days: { start: 6, end: 0 } }, // Sat→Sun
  { label: "3x Today", mult: 3, days: { start: 0, end: 0 } },
  { label: "2x Next 24h", mult: 2, days: { start: 0, end: 1 } },
];

function CampaignForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => initial || {
    name: "",
    multiplier: 2,
    start_at: "",
    end_at: "",
    is_active: true,
    notes: "",
  });

  // datetime-local inputs are in PKT; we convert to UTC on save
  const [startPkt, setStartPkt] = useState(() => initial?.start_at ? utcToPktInput(initial.start_at) : "");
  const [endPkt, setEndPkt] = useState(() => initial?.end_at ? utcToPktInput(initial.end_at) : "");

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Campaign name is required"); return; }
    if (!form.multiplier || form.multiplier < 1) { toast.error("Multiplier must be at least 1"); return; }
    const startUtc = startPkt ? pktInputToUtc(startPkt) : null;
    const endUtc = endPkt ? pktInputToUtc(endPkt) : null;
    if (startUtc && endUtc && new Date(endUtc) <= new Date(startUtc)) {
      toast.error("End time must be after start time");
      return;
    }
    onSave({
      ...form,
      multiplier: Number(form.multiplier),
      start_at: startUtc,
      end_at: endUtc,
    });
  };

  return (
    <div className="bg-[#FDF9F7] rounded-2xl border border-[#E8DED8] p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Campaign Name</label>
          <input
            className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Double Points Weekend"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Multiplier (×)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              step={0.5}
              className="w-24 border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
              value={form.multiplier}
              onChange={e => setForm({ ...form, multiplier: e.target.value })}
            />
            <span className="text-sm text-[#8B7355]">× points</span>
          </div>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-[#5C4A3A] cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="rounded h-4 w-4"
            />
            Active
          </label>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Start (PKT)</label>
          <input
            type="datetime-local"
            className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            value={startPkt}
            onChange={e => setStartPkt(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">End (PKT)</label>
          <input
            type="datetime-local"
            className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            value={endPkt}
            onChange={e => setEndPkt(e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Notes (optional)</label>
          <input
            className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            value={form.notes || ""}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Internal note..."
          />
        </div>
      </div>
      <p className="text-xs text-[#8B7355] bg-[#F5EBE8] rounded-lg p-2.5">
        Leave start/end blank for an always-on multiplier (until manually paused). Times are in Pakistan Standard Time (PKT, UTC+5).
      </p>
      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} className="flex-1 bg-[#8B7355] hover:bg-[#6B5744] text-white rounded-xl">
          <Save className="h-4 w-4 mr-1" /> Save Campaign
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-xl border-[#E8DED8]">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function PointsCampaignManager({ settings }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["points-campaigns"],
    queryFn: () => base44.entities.PointsCampaign.list("-created_date", 100),
  });

  // Refresh every 30s so status badges stay current
  useEffect(() => {
    const t = setInterval(() => queryClient.invalidateQueries({ queryKey: ["points-campaigns"] }), 30000);
    return () => clearInterval(t);
  }, [queryClient]);

  const activeMultiplier = computeActiveMultiplier(campaigns);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing?.id) {
        await base44.entities.PointsCampaign.update(editing.id, data);
      } else {
        const me = await base44.auth.me();
        await base44.entities.PointsCampaign.create({ ...data, created_by: me?.email });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points-campaigns"] });
      setAdding(false);
      setEditing(null);
      toast.success("Campaign saved");
    },
    onError: (e) => toast.error(e.message || "Failed to save campaign"),
  });

  const toggleActive = async (c) => {
    try {
      await base44.entities.PointsCampaign.update(c.id, { is_active: !c.is_active });
      queryClient.invalidateQueries({ queryKey: ["points-campaigns"] });
      toast.success(c.is_active ? "Campaign paused" : "Campaign activated");
    } catch (e) { toast.error("Failed to toggle"); }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    await base44.entities.PointsCampaign.delete(c.id);
    queryClient.invalidateQueries({ queryKey: ["points-campaigns"] });
    toast.success("Campaign deleted");
  };

  const applyPreset = (preset) => {
    // PKT "now"
    const nowPkt = nowAsPktInput();
    const d = new Date(nowPkt + ":00+05:00");
    const startDate = new Date(d);
    const endDate = new Date(d);
    if (preset.label === "2x This Weekend") {
      // Start this Saturday 00:00 PKT, end this Sunday 23:59 PKT
      const day = d.getUTCDay(); // 0=Sun..6=Sat (in PKT)
      const daysToSat = (6 - day + 7) % 7;
      startDate.setUTCDate(d.getUTCDate() + daysToSat);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCDate(d.getUTCDate() + daysToSat + 1);
      endDate.setUTCHours(23, 59, 0, 0);
    } else if (preset.label === "3x Today") {
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 0, 0);
    } else if (preset.label === "2x Next 24h") {
      endDate.setUTCDate(d.getUTCDate() + 1);
    }
    const toPkt = (utc) => {
      const pkt = new Date(utc.getTime() + 5 * 60 * 60 * 1000);
      return pkt.toISOString().slice(0, 16);
    };
    setAdding(true);
    setEditing(null);
    // Pre-fill via a hack: create the form with initial values
    setTimeout(() => {
      setEditing({
        name: preset.label,
        multiplier: preset.mult,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        is_active: true,
        notes: "",
      });
      setAdding(false);
      setAdding(true);
    }, 0);
  };

  return (
    <div className="space-y-5">
      {/* Current multiplier banner */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/70 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Current Active Multiplier
            </div>
            <div className="text-4xl font-bold mt-1">{activeMultiplier}× points</div>
            <div className="text-sm text-white/70 mt-1">
              {activeMultiplier > 1
                ? `Customers earn ${activeMultiplier}× the normal points right now`
                : "Standard points (no active campaign)"}
            </div>
          </div>
          <div className="text-right text-xs text-white/60">
            <div>Rate: PKR {settings?.pkr_per_point || 100} = 1 pt</div>
            <div>× {activeMultiplier} = 1 pt per PKR {Math.round((settings?.pkr_per_point || 100) / activeMultiplier)}</div>
          </div>
        </div>
      </div>

      {/* Quick presets */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E8DED8] text-sm text-[#5C4A3A] hover:bg-[#F5EBE8] transition-colors"
          >
            <Zap className="h-3.5 w-3.5 text-[#8B7355]" /> {p.label}
          </button>
        ))}
      </div>

      {/* Add button */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[#5C4A3A] text-lg flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-[#8B7355]" /> Campaigns ({campaigns.length})
        </h2>
        <Button
          onClick={() => { setAdding(true); setEditing(null); }}
          className="bg-[#8B7355] hover:bg-[#6B5744] text-white rounded-xl text-sm"
        >
          <Plus className="h-4 w-4 mr-1" /> New Campaign
        </Button>
      </div>

      {adding && !editing && (
        <CampaignForm
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => setAdding(false)}
        />
      )}
      {editing && (
        <CampaignForm
          initial={editing}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}</div>
      ) : campaigns.length === 0 && !adding ? (
        <div className="text-center py-12 text-[#8B7355] bg-white rounded-2xl border border-dashed border-[#E8DED8]">
          <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No campaigns yet. Create one to boost points.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {campaigns.map(c => {
              const status = campaignStatus(c);
              const isLive = status === "active";
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`bg-white rounded-2xl border p-4 ${isLive ? "border-green-300 shadow-md" : "border-[#E8DED8]"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#5C4A3A]">{c.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status]}`}>
                          {status}
                        </span>
                        {isLive && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#8B7355] text-white font-bold">
                            {c.multiplier}× LIVE
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[#8B7355] mt-1">
                        <span className="font-bold text-[#5C4A3A]">{c.multiplier}×</span> points
                      </div>
                      <div className="text-xs text-[#8B7355] mt-1 space-y-0.5">
                        <div>Start: {c.start_at ? utcToPktDisplay(c.start_at) : "Immediately (always-on)"}</div>
                        <div>End: {c.end_at ? utcToPktDisplay(c.end_at) : "Never (until paused)"}</div>
                      </div>
                      {c.notes && <div className="text-xs text-[#C9B8A6] mt-1 italic">{c.notes}</div>}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(c)}
                        title={c.is_active ? "Pause" : "Activate"}
                        className={`p-2 rounded-xl transition-colors ${c.is_active ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setEditing(c); setAdding(false); }}
                        className="p-2 rounded-xl bg-[#F5EBE8] hover:bg-[#EDE3DF] text-[#8B7355] transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-[#8B7355] bg-[#F5EBE8] rounded-xl p-3">
        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong>How it works:</strong> The multiplier is captured at the moment a bill is generated and printed on the receipt.
          When a customer scans the QR (or enters the code), they receive exactly the points shown on the bill —
          so the bill and the scan always match. Turning a campaign off only affects <em>new</em> bills; bills already
          printed during the campaign keep their boosted points.
        </div>
      </div>
    </div>
  );
}