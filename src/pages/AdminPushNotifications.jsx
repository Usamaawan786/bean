import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Bell, Send, Users, History, Zap, ChevronLeft,
  Smartphone, BarChart2, CheckCircle2, XCircle, Clock, X, Search, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import TemplateLibrary from "@/components/admin/notif/TemplateLibrary";
import UserExplorer from "@/components/admin/notif/UserExplorer";
import AutomationCenter from "@/components/admin/notif/AutomationCenter";
import LaunchCampaign from "@/components/admin/notif/LaunchCampaign";

const TABS = [
  { id: "compose", label: "Compose", icon: Bell },
  { id: "launch", label: "🚀 Launch", icon: Zap },
  { id: "templates", label: "Templates", icon: Zap },
  { id: "users", label: "Users", icon: Users },
  { id: "automations", label: "Automations", icon: BarChart2 },
  { id: "history", label: "History", icon: History },
];

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All Users" },
  { value: "specific", label: "Specific Users (by email)" },
  { value: "tier_bronze", label: "Bronze Tier" },
  { value: "tier_silver", label: "Silver Tier" },
  { value: "tier_gold", label: "Gold Tier" },
  { value: "tier_platinum", label: "Platinum Tier" },
];

function UserEmailPicker({ selectedEmails, onChange }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (val) => {
    setSearch(val);
    if (val.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const users = await base44.entities.User.list();
      const filtered = users.filter(u =>
        u.email?.toLowerCase().includes(val.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 8);
      setResults(filtered);
    } catch (e) {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addEmail = (email) => {
    if (!selectedEmails.includes(email)) onChange([...selectedEmails, email]);
    setSearch("");
    setResults([]);
  };

  const removeEmail = (email) => onChange(selectedEmails.filter(e => e !== email));

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {selectedEmails.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedEmails.map(email => (
            <span key={email} className="flex items-center gap-1 bg-[#F5EBE8] text-[#5C4A3A] text-xs px-2.5 py-1 rounded-full border border-[#E8DED8]">
              <UserCheck className="h-3 w-3" />
              {email}
              <button onClick={() => removeEmail(email)} className="ml-0.5 hover:text-red-500 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search by email or name…"
          className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
        />
      </div>

      {/* Dropdown results */}
      {results.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
          {results.map(u => (
            <button
              key={u.email}
              onClick={() => addEmail(u.email)}
              disabled={selectedEmails.includes(u.email)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${selectedEmails.includes(u.email) ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(u.full_name || u.email || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{u.full_name || "—"}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              {selectedEmails.includes(u.email) && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
      {selectedEmails.length === 0 && search.length < 2 && (
        <p className="text-xs text-gray-400">Type at least 2 characters to search users</p>
      )}
    </div>
  );
}

function ComposeTab({ onSent, form, setForm }) {
  const [sending, setSending] = useState(false);
  const [specificEmails, setSpecificEmails] = useState([]);

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    if (form.audience === "specific" && specificEmails.length === 0) {
      toast.error("Please select at least one user");
      return;
    }
    setSending(true);
    try {
      const res = await base44.functions.invoke("sendPushNotification", {
        title: form.title,
        body: form.body,
        audience: form.audience,
        specific_emails: form.audience === "specific" ? specificEmails : undefined,
        deep_link: form.deep_link || undefined,
        image_url: form.image_url || undefined,
        notes: form.notes || undefined,
      });
      if (res.data?.success !== false) {
        toast.success(`Notification sent! Reached ${res.data?.sent_count || 0} devices.`);
        setForm({ title: "", body: "", audience: "all", deep_link: "", image_url: "", notes: "" });
        setSpecificEmails([]);
        onSent && onSent();
      } else {
        toast.error(res.data?.error || "Failed to send");
      }
    } catch (e) {
      toast.error("Error: " + e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Live Preview */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-5 text-white">
        <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-widest">Lock Screen Preview</p>
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center flex-shrink-0">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold text-white/80">Bean</span>
              <span className="text-xs text-white/40">now</span>
            </div>
            <p className="font-semibold text-sm text-white leading-tight">{form.title || "Notification title…"}</p>
            <p className="text-xs text-white/70 mt-0.5 leading-relaxed">{form.body || "Your message will appear here…"}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Title *</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. ⚡ Flash Drop is LIVE!"
            maxLength={65}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
          />
          <p className="text-xs text-gray-300 text-right mt-0.5">{form.title.length}/65</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Message *</label>
          <textarea
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            placeholder="Write your message here…"
            rows={3}
            maxLength={200}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
          />
          <p className="text-xs text-gray-300 text-right mt-0.5">{form.body.length}/200</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Audience</label>
          <select
            value={form.audience}
            onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 bg-white"
          >
            {AUDIENCE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {form.audience === "specific" && (
            <div className="mt-2">
              <UserEmailPicker selectedEmails={specificEmails} onChange={setSpecificEmails} />
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Deep Link <span className="text-gray-300 font-normal">(optional)</span></label>
          <input
            value={form.deep_link}
            onChange={e => setForm(f => ({ ...f, deep_link: e.target.value }))}
            placeholder="/FlashDrops, /Rewards, /Home…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Image URL <span className="text-gray-300 font-normal">(optional)</span></label>
          <input
            value={form.image_url}
            onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
            placeholder="https://…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Internal Notes <span className="text-gray-300 font-normal">(optional)</span></label>
          <input
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="For your own reference…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={sending}
          className="w-full rounded-xl bg-gradient-to-r from-[#8B7355] to-[#5C4A3A] text-white font-semibold"
        >
          {sending ? (
            <><Clock className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
          ) : (
            <><Send className="h-4 w-4 mr-2" /> Send Now</>
          )}
        </Button>
      </div>
    </div>
  );
}

function HistoryTab() {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["push-notif-history"],
    queryFn: () => base44.entities.PushNotification.list("-sent_at", 50),
  });

  if (isLoading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />)}
    </div>
  );

  if (!notifications.length) return (
    <div className="text-center py-16 text-gray-400 text-sm">No notifications sent yet</div>
  );

  return (
    <div className="space-y-2">
      {notifications.map(n => (
        <div key={n.id} className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-800 truncate">{n.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xs text-gray-400">{n.sent_at ? format(new Date(n.sent_at), "MMM d, h:mm a") : "Draft"}</span>
                {n.sent_count > 0 && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {n.sent_count} sent
                  </span>
                )}
                {n.failure_count > 0 && (
                  <span className="text-xs text-red-500 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> {n.failure_count} failed
                  </span>
                )}
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{(n.audience || "all").replace("tier_", "")}</span>
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
              n.status === "sent" ? "bg-green-50 text-green-600" :
              n.status === "failed" ? "bg-red-50 text-red-600" :
              "bg-gray-100 text-gray-500"
            }`}>
              {n.status || "draft"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPushNotifications() {
  const [tab, setTab] = useState("compose");
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "all",
    deep_link: "",
    image_url: "",
    notes: "",
  });

  const { data: deviceCount = 0 } = useQuery({
    queryKey: ["device-count"],
    queryFn: async () => {
      const tokens = await base44.entities.DeviceToken.filter({ is_active: true });
      return tokens.length;
    }
  });

  const applyTemplate = (tpl) => {
    setForm(f => ({
      ...f,
      title: tpl.title,
      body: tpl.body,
      deep_link: tpl.deepLink || "",
      audience: tpl.audience || "all",
    }));
    setTab("compose");
  };

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#5C4A3A] to-[#8B7355] text-white px-5 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/70 text-sm mb-4 hover:text-white transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Push Notifications</h1>
            <p className="text-white/70 text-sm mt-0.5">Engage your Bean community</p>
          </div>
          <div className="bg-white/10 rounded-2xl px-4 py-2 text-center">
            <div className="flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-white/80" />
              <span className="text-lg font-bold">{deviceCount}</span>
            </div>
            <p className="text-xs text-white/60">devices</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max py-1">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? "bg-[#8B7355] text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-5 pb-24">
        {tab === "compose" && <ComposeTab onSent={() => {}} form={form} setForm={setForm} />}
        {tab === "launch" && <LaunchCampaign onApply={(tpl) => { applyTemplate(tpl); setTab("compose"); }} />}
        {tab === "templates" && <TemplateLibrary onApply={applyTemplate} />}
        {tab === "users" && <UserExplorer />}
        {tab === "automations" && <AutomationCenter />}
        {tab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}