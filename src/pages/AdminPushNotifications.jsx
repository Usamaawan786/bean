import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, Send, Zap, Calendar, Clock, Users, CheckCircle2, 
  XCircle, FileText, ChevronRight, Plus, Trash2, Edit3,
  Coffee, Star, Gift, Megaphone, Sparkles, AlertTriangle,
  Smartphone, BarChart2, ArrowLeft, Eye, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

// ── Pre-built Templates ──────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "launch_day",
    label: "🚀 Launch Day",
    category: "Event",
    color: "from-purple-500 to-indigo-600",
    icon: Sparkles,
    title: "BEAN is officially LIVE! ☕",
    body: "The wait is over — Bean Islamabad is now open! Come visit us today and earn your first reward points. See you soon! ☕🎉",
    deepLink: "/Home",
    audience: "all"
  },
  {
    id: "flash_drop",
    label: "⚡ Flash Drop Alert",
    category: "Flash Drop",
    color: "from-amber-500 to-orange-600",
    icon: Zap,
    title: "⚡ Flash Drop is LIVE!",
    body: "Quick! A limited Flash Drop just went live near you. Claim your free reward before it runs out — hurry, only a few left! 🔥",
    deepLink: "/FlashDrops",
    audience: "all"
  },
  {
    id: "personalized_offer",
    label: "🎁 Personalized Offer",
    category: "Offer",
    color: "from-rose-500 to-pink-600",
    icon: Gift,
    title: "A special offer just for you 🎁",
    body: "We've got a personalized reward waiting for you! Open Bean app to claim your exclusive offer before it expires.",
    deepLink: "/Rewards",
    audience: "all"
  },
  {
    id: "weekend_special",
    label: "☕ Weekend Special",
    category: "Promo",
    color: "from-[#8B7355] to-[#5C4A3A]",
    icon: Coffee,
    title: "Weekend vibes at Bean ☕",
    body: "This weekend only — double points on every visit! Come enjoy your favourite brew and stack up those rewards. 🌟",
    deepLink: "/Home",
    audience: "all"
  },
  {
    id: "tier_upgrade",
    label: "⭐ Tier Upgrade",
    category: "Loyalty",
    color: "from-yellow-400 to-amber-500",
    icon: Star,
    title: "You've levelled up! 🏆",
    body: "Congratulations — you've reached a new loyalty tier! Unlock exclusive perks and rewards in your Bean profile.",
    deepLink: "/Rewards",
    audience: "all"
  },
  {
    id: "new_product",
    label: "✨ New Arrival",
    category: "Product",
    color: "from-teal-500 to-emerald-600",
    icon: Sparkles,
    title: "Something new just dropped! ✨",
    body: "Fresh arrivals are now in the Bean store. Check out our latest blends and seasonal offerings — first come, first served!",
    deepLink: "/Shop",
    audience: "all"
  },
  {
    id: "gold_exclusive",
    label: "👑 Gold+ Exclusive",
    category: "VIP",
    color: "from-yellow-600 to-orange-500",
    icon: Star,
    title: "Exclusive offer for Gold members 👑",
    body: "As a valued Gold member, you've unlocked a special surprise. Open Bean now to see what we've prepared just for you!",
    deepLink: "/Rewards",
    audience: "tier_gold"
  },
  {
    id: "re_engage",
    label: "💌 We Miss You",
    category: "Re-engagement",
    color: "from-pink-500 to-rose-400",
    icon: Megaphone,
    title: "We miss you at Bean ☕",
    body: "It's been a while! Your reward points are waiting. Come back for a fresh cup and enjoy a special welcome-back bonus.",
    deepLink: "/Home",
    audience: "all"
  }
];

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All Users", icon: Users },
  { value: "tier_bronze", label: "Bronze Tier", icon: Star },
  { value: "tier_silver", label: "Silver Tier", icon: Star },
  { value: "tier_gold", label: "Gold Tier", icon: Star },
  { value: "tier_platinum", label: "Platinum Tier", icon: Star }
];

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <div className="text-xl font-bold text-gray-800">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// ── Notification Row ──────────────────────────────────────────────────────────
function NotificationRow({ notif, onDelete }) {
  const statusConfig = {
    sent: { color: "text-green-600 bg-green-50", icon: CheckCircle2, label: "Sent" },
    draft: { color: "text-gray-500 bg-gray-50", icon: FileText, label: "Draft" },
    scheduled: { color: "text-blue-600 bg-blue-50", icon: Clock, label: "Scheduled" },
    failed: { color: "text-red-600 bg-red-50", icon: XCircle, label: "Failed" }
  };
  const cfg = statusConfig[notif.status] || statusConfig.draft;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] flex items-center justify-center flex-shrink-0">
        <Bell className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 truncate text-sm">{notif.title}</p>
        <p className="text-xs text-gray-400 truncate">{notif.body}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit ${cfg.color}`}>
            <Icon className="h-3 w-3" /> {cfg.label}
          </span>
          {notif.sent_count > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Smartphone className="h-3 w-3" /> {notif.sent_count} devices
            </span>
          )}
          {notif.sent_at && (
            <span className="text-xs text-gray-400">
              {format(new Date(notif.sent_at), "MMM d, h:mm a")}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(notif.id)}
        className="p-2 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPushNotifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("compose");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm] = useState({
    title: "", body: "", imageUrl: "", deepLink: "/Home", audience: "all", notes: ""
  });
  const [isSending, setIsSending] = useState(false);
  const [preview, setPreview] = useState(false);

  // Auth check
  const [user, setUser] = useState(null);
  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || u.role !== "admin") navigate(createPageUrl("Home"));
      else setUser(u);
    });
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["push-notifications"],
    queryFn: () => base44.entities.PushNotification.list("-created_date", 50),
    enabled: !!user
  });

  const { data: deviceTokens = [] } = useQuery({
    queryKey: ["device-tokens-count"],
    queryFn: () => base44.entities.DeviceToken.filter({ is_active: true }),
    enabled: !!user
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PushNotification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["push-notifications"] })
  });

  const applyTemplate = (template) => {
    setSelectedTemplate(template.id);
    setForm(f => ({
      ...f,
      title: template.title,
      body: template.body,
      deepLink: template.deepLink,
      audience: template.audience
    }));
    setActiveTab("compose");
  };

  const handleSend = async (asDraft = false) => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setIsSending(true);
    try {
      // Save record first
      const record = await base44.entities.PushNotification.create({
        title: form.title,
        body: form.body,
        image_url: form.imageUrl,
        deep_link: form.deepLink,
        audience: form.audience,
        notes: form.notes,
        status: asDraft ? "draft" : "draft",
        sent_by: user?.email
      });

      if (!asDraft) {
        // Send via backend function
        const res = await base44.functions.invoke("sendPushNotification", {
          notificationId: record.id,
          title: form.title,
          body: form.body,
          imageUrl: form.imageUrl,
          deepLink: form.deepLink,
          audience: form.audience
        });
        toast.success(`Sent to ${res.data.sent_count} devices!`);
      } else {
        toast.success("Saved as draft");
      }

      queryClient.invalidateQueries({ queryKey: ["push-notifications"] });
      setForm({ title: "", body: "", imageUrl: "", deepLink: "/Home", audience: "all", notes: "" });
      setSelectedTemplate(null);
      if (!asDraft) setActiveTab("history");
    } catch (err) {
      toast.error("Failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSending(false);
    }
  };

  const sentNotifs = notifications.filter(n => n.status === "sent");
  const totalReach = sentNotifs.reduce((s, n) => s + (n.sent_count || 0), 0);

  const tabs = [
    { id: "compose", label: "Compose", icon: Edit3 },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "history", label: "History", icon: BarChart2 }
  ];

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-[#8B7355] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white px-6 pt-8 pb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Push Notifications</h1>
            <p className="text-[#D4C4B0] text-sm">{deviceTokens.length} registered devices</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-xl font-bold">{sentNotifs.length}</div>
            <div className="text-xs text-[#D4C4B0]">Sent</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-xl font-bold">{totalReach.toLocaleString()}</div>
            <div className="text-xs text-[#D4C4B0]">Total Reach</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-xl font-bold">{deviceTokens.length}</div>
            <div className="text-xs text-[#D4C4B0]">Devices</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6">
        <div className="flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-[#8B7355] text-[#5C4A3A]"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── Compose Tab ── */}
        {activeTab === "compose" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {selectedTemplate && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-sm text-amber-700">
                <Sparkles className="h-4 w-4" />
                Template applied — customize below as needed
                <button onClick={() => setSelectedTemplate(null)} className="ml-auto text-amber-400 hover:text-amber-600">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-[#8B7355]" />
                Notification Content
              </h2>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. ⚡ Flash Drop is LIVE!"
                  maxLength={65}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 focus:border-[#8B7355]"
                />
                <div className="text-right text-xs text-gray-300 mt-1">{form.title.length}/65</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Message *</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Write your notification message here..."
                  rows={3}
                  maxLength={240}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 focus:border-[#8B7355]"
                />
                <div className="text-right text-xs text-gray-300 mt-1">{form.body.length}/240</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Deep Link</label>
                  <input
                    value={form.deepLink}
                    onChange={e => setForm(f => ({ ...f, deepLink: e.target.value }))}
                    placeholder="/FlashDrops"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 focus:border-[#8B7355]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Audience</label>
                  <select
                    value={form.audience}
                    onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 focus:border-[#8B7355] bg-white"
                  >
                    {AUDIENCE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Image URL (optional)</label>
                <input
                  value={form.imageUrl}
                  onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 focus:border-[#8B7355]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Internal Notes</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Campaign name, purpose, etc."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 focus:border-[#8B7355]"
                />
              </div>
            </div>

            {/* Phone Preview */}
            {(form.title || form.body) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5" /> Preview
                </h3>
                <div className="bg-gray-900 rounded-2xl p-4 max-w-xs mx-auto">
                  <div className="bg-gray-800 rounded-xl p-3 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                      <Coffee className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white text-xs font-semibold truncate">{form.title || "Notification Title"}</span>
                      </div>
                      <p className="text-gray-300 text-xs leading-relaxed line-clamp-2">{form.body || "Notification message will appear here..."}</p>
                    </div>
                  </div>
                  <p className="text-center text-gray-600 text-xs mt-2">Lock Screen Preview</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => handleSend(true)}
                variant="outline"
                disabled={isSending}
                className="flex-1 rounded-xl border-gray-200"
              >
                <FileText className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={() => handleSend(false)}
                disabled={isSending || !form.title.trim() || !form.body.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#8B7355] to-[#5C4A3A] hover:from-[#6B5744] hover:to-[#4A3B2E] text-white"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Now
              </Button>
            </div>

            <button
              onClick={() => setActiveTab("templates")}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-[#8B7355] hover:text-[#8B7355] transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Browse Templates
            </button>
          </motion.div>
        )}

        {/* ── Templates Tab ── */}
        {activeTab === "templates" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-sm text-gray-500">Pick a template to pre-fill the composer. You can customize everything after.</p>
            {["Event", "Flash Drop", "Offer", "Promo", "Loyalty", "Product", "VIP", "Re-engagement"].map(category => {
              const group = TEMPLATES.filter(t => t.category === category);
              if (!group.length) return null;
              return (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{category}</h3>
                  <div className="space-y-2">
                    {group.map(template => {
                      const Icon = template.icon;
                      return (
                        <motion.div
                          key={template.id}
                          whileTap={{ scale: 0.98 }}
                          className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-sm transition-all group"
                          onClick={() => applyTemplate(template)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center flex-shrink-0`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm text-gray-800">{template.label}</span>
                                <span className="text-xs text-[#8B7355] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Use <ChevronRight className="h-3 w-3" />
                                </span>
                              </div>
                              <p className="text-xs font-medium text-gray-600 mb-0.5">{template.title}</p>
                              <p className="text-xs text-gray-400 line-clamp-2">{template.body}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">→ {template.deepLink}</span>
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{template.audience.replace('tier_', '')}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* ── History Tab ── */}
        {activeTab === "history" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />)}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No notifications sent yet</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <StatCard icon={Send} label="Total Sent" value={sentNotifs.length} color="from-green-400 to-emerald-600" />
                  <StatCard icon={Smartphone} label="Total Reach" value={totalReach.toLocaleString()} color="from-blue-400 to-indigo-600" />
                </div>
                {notifications.map(notif => (
                  <NotificationRow
                    key={notif.id}
                    notif={notif}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}