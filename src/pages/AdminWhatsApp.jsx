import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Plus, Send, Sparkles, Users, ChevronRight,
  ArrowLeft, CheckCircle2, XCircle, Clock, Edit3, Trash2,
  RefreshCw, Zap, Crown, Coffee, Star, AlertTriangle, Copy, Check,
  FileCheck, FileX, Hourglass, Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// ─── Constants ─────────────────────────────────────────────────────────────

const AUDIENCES = [
  { value: "all", label: "All Users", desc: "Everyone with a phone number", icon: Users, color: "bg-slate-100 text-slate-700" },
  { value: "Platinum", label: "Platinum Tier", desc: "Your top loyal customers", icon: Crown, color: "bg-purple-100 text-purple-700" },
  { value: "Gold", label: "Gold Tier", desc: "High-value regulars", icon: Star, color: "bg-amber-100 text-amber-700" },
  { value: "Silver", label: "Silver Tier", desc: "Growing customers", icon: Star, color: "bg-gray-100 text-gray-600" },
  { value: "Bronze", label: "Bronze Tier", desc: "New & occasional visitors", icon: Coffee, color: "bg-orange-100 text-orange-700" },
  { value: "high_spenders", label: "High Spenders", desc: "PKR 5,000+ total spend", icon: Zap, color: "bg-green-100 text-green-700" },
  { value: "no_purchase_7d", label: "Inactive (7d)", desc: "No visit in last 7 days", icon: Clock, color: "bg-red-100 text-red-600" },
];

const OFFER_TYPES = [
  { value: "flash_drop", label: "Flash Drop", emoji: "⚡" },
  { value: "bonus_points", label: "Bonus Points", emoji: "⭐" },
  { value: "discount", label: "Discount Offer", emoji: "🏷️" },
  { value: "tier_reward", label: "Tier Reward", emoji: "🏆" },
  { value: "re_engagement", label: "Re-Engagement", emoji: "👋" },
  { value: "custom", label: "Custom", emoji: "✏️" },
];

const TEMPLATES = [
  {
    id: "flash_drop",
    label: "Flash Drop Alert",
    offer_type: "flash_drop",
    audience: "all",
    emoji: "⚡",
    message: `⚡ *Flash Drop Alert — Bean!*\n\nHi {{name}}! ☕\n\nWe're dropping something special TODAY — limited items, first come first served!\n\n🎁 Exclusive treat for Bean members only\n⏰ Today only — don't miss out!\n\nOpen the Bean app now to claim yours! 🏃`,
  },
  {
    id: "bonus_points",
    label: "2x Points Weekend",
    offer_type: "bonus_points",
    audience: "all",
    emoji: "⭐",
    message: `⭐ *Double Points Weekend — Bean!*\n\nHi {{name}}! ☕\n\nThis weekend only: earn *2x points* on every order!\n\n💡 You currently have *{{points}} pts* — double them fast!\n\nVisit us Friday–Sunday to stack those points. See you soon! 🫘`,
  },
  {
    id: "win_back",
    label: "We Miss You",
    offer_type: "re_engagement",
    audience: "no_purchase_7d",
    emoji: "👋",
    message: `👋 *We miss you, {{name}}!*\n\nIt's been a while since your last visit to Bean ☕\n\nCome back this week and enjoy a *FREE upgrade* on your next order — just mention this message!\n\nYour {{tier}} membership perks are waiting for you 💛`,
  },
  {
    id: "platinum_vip",
    label: "Platinum VIP Reward",
    offer_type: "tier_reward",
    audience: "Platinum",
    emoji: "💎",
    message: `💎 *Exclusive Platinum Reward — Bean!*\n\nHi {{name}}, as one of our most valued Platinum members — you deserve something special.\n\n🎁 *Your exclusive reward is ready to claim!* Visit us and show this message to receive your VIP treat.\n\nThank you for being the heart of the Bean community ☕✨`,
  },
  {
    id: "tier_upgrade",
    label: "Almost Gold!",
    offer_type: "tier_reward",
    audience: "Silver",
    emoji: "🥇",
    message: `🥇 *You're SO close to Gold, {{name}}!*\n\nHi there! You're a valued *{{tier}}* member at Bean ☕\n\nJust a few more visits and you'll unlock *Gold tier* perks — exclusive rewards, priority offers & more!\n\n💡 You currently have *{{points}} pts* — keep going!\n\nSee you at Bean soon! 🫘`,
  },
  {
    id: "discount",
    label: "10% Off This Week",
    offer_type: "discount",
    audience: "all",
    emoji: "🏷️",
    message: `🏷️ *Special Offer for Bean Members!*\n\nHi {{name}}! ☕\n\nThis week only: enjoy *10% OFF* your entire order — just show this message at the counter.\n\n🎁 Exclusively for our loyalty members\n⏳ Valid until Sunday\n\nCome in and treat yourself! 🫘`,
  },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function TemplateBadge({ status }) {
  if (!status || status === 'none') return null;
  const cfg = {
    pending_approval: { icon: Hourglass, cls: 'bg-amber-100 text-amber-700', label: 'Awaiting Approval' },
    approved: { icon: FileCheck, cls: 'bg-green-100 text-green-700', label: 'Template Approved' },
    rejected: { icon: FileX, cls: 'bg-red-100 text-red-600', label: 'Template Rejected' },
  }[status];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    draft: { icon: Edit3, cls: 'bg-amber-100 text-amber-700', label: 'Draft' },
    sent: { icon: CheckCircle2, cls: 'bg-green-100 text-green-700', label: 'Sent' },
    failed: { icon: XCircle, cls: 'bg-red-100 text-red-600', label: 'Failed' },
  }[status] || { icon: Clock, cls: 'bg-gray-100 text-gray-600', label: status };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

function AudienceBadge({ value }) {
  const a = AUDIENCES.find(x => x.value === value) || AUDIENCES[0];
  const Icon = a.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${a.color}`}>
      <Icon className="h-3 w-3" />{a.label}
    </span>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminWhatsApp() {
  const [tab, setTab] = useState("campaigns"); // campaigns | compose | templates
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", message: "", audience: "all", offer_type: "custom", notes: "" });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(null); // campaignId being sent
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [confirmSend, setConfirmSend] = useState(null);
  const [submittingTemplate, setSubmittingTemplate] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(null);
  const [toast, setToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [templateDialog, setTemplateDialog] = useState(null); // { templateName, templateBody, campaignId }
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || u.role !== "admin") window.location.href = "/";
      else setUser(u);
    });
  }, []);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["wa-campaigns"],
    queryFn: () => base44.entities.WhatsAppCampaign.list("-created_date", 100),
    enabled: !!user,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["wa-customers"],
    queryFn: () => base44.entities.Customer.list("-total_points_earned", 500),
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["wa-users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const usersWithPhone = allUsers.filter(u => u.phone);

  const getAudienceCount = (audience) => {
    if (audience === "all") return usersWithPhone.length;
    if (["Bronze", "Silver", "Gold", "Platinum"].includes(audience)) {
      const emailsInTier = new Set(customers.filter(c => c.tier === audience).map(c => c.created_by));
      return usersWithPhone.filter(u => emailsInTier.has(u.email)).length;
    }
    if (audience === "high_spenders") {
      const highEmails = new Set(customers.filter(c => (c.total_spend_pkr || 0) >= 5000).map(c => c.created_by));
      return usersWithPhone.filter(u => highEmails.has(u.email)).length;
    }
    return "?";
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveDraft = async () => {
    if (!form.name || !form.message) return;
    setSaving(true);
    await base44.entities.WhatsAppCampaign.create({ ...form, status: "draft" });
    queryClient.invalidateQueries({ queryKey: ["wa-campaigns"] });
    setForm({ name: "", message: "", audience: "all", offer_type: "custom", notes: "" });
    setSaving(false);
    setTab("campaigns");
    showToast("Campaign saved as draft!");
  };

  const handleSaveAndSend = async () => {
    if (!form.name || !form.message) return;
    setSaving(true);
    const campaign = await base44.entities.WhatsAppCampaign.create({ ...form, status: "draft" });
    queryClient.invalidateQueries({ queryKey: ["wa-campaigns"] });
    setSaving(false);
    setForm({ name: "", message: "", audience: "all", offer_type: "custom", notes: "" });
    setTab("campaigns");
    setConfirmSend(campaign);
  };

  const handleApplyTemplate = (tpl) => {
    setForm(f => ({ ...f, message: tpl.message, offer_type: tpl.offer_type, audience: tpl.audience, name: f.name || tpl.label }));
    setTab("compose");
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    const audience = AUDIENCES.find(a => a.value === form.audience);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a WhatsApp marketing copywriter for "Bean" — a premium Pakistani coffee loyalty app.

Write a short, friendly, high-converting WhatsApp message for the following campaign:
- Campaign goal: ${aiPrompt}
- Target audience: ${audience?.label} — ${audience?.desc}
- Offer type: ${form.offer_type}

Rules:
- Use casual, warm tone (like a friend texting)
- Use emojis naturally
- Keep it under 200 words
- Use {{name}} for personalisation
- Use {{points}} if referencing their points balance
- Use {{tier}} if referencing their tier
- End with a clear call to action
- Use bold via *asterisks* for key info
- Do NOT include any markdown headers`,
    });
    setForm(f => ({ ...f, message: result }));
    setAiLoading(false);
  };

  const handleSubmitTemplate = async (campaign) => {
    setSubmittingTemplate(campaign.id);
    const res = await base44.functions.invoke('submitGHLTemplate', { campaignId: campaign.id });
    queryClient.invalidateQueries({ queryKey: ['wa-campaigns'] });
    setSubmittingTemplate(null);
    if (res.data?.success) {
      setTemplateDialog({
        campaignId: campaign.id,
        templateName: res.data.templateName,
        templateBody: res.data.templateBody,
      });
    } else {
      showToast(`❌ ${res.data?.error || 'Failed to prepare template'}`, 'error');
    }
  };

  const handleMarkApproved = async (campaignId) => {
    await base44.entities.WhatsAppCampaign.update(campaignId, { template_status: 'approved' });
    queryClient.invalidateQueries({ queryKey: ['wa-campaigns'] });
    setTemplateDialog(null);
    showToast('✅ Campaign marked as approved — ready to send!');
  };

  const handleCheckStatus = async (campaign) => {
    setCheckingStatus(campaign.id);
    const res = await base44.functions.invoke('checkGHLTemplateStatus', { campaignId: campaign.id });
    queryClient.invalidateQueries({ queryKey: ['wa-campaigns'] });
    setCheckingStatus(null);
    if (res.data?.success) {
      const s = res.data.status;
      if (s === 'approved') showToast('✅ Template is APPROVED! You can now send the campaign.');
      else if (s === 'rejected') showToast(`❌ Template rejected: ${res.data.rejectionReason || 'No reason given'}`, 'error');
      else showToast('⏳ Template still pending approval...');
    } else {
      showToast(`❌ ${res.data?.error || 'Could not check status'}`, 'error');
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.WhatsAppCampaign.delete(id);
    queryClient.invalidateQueries({ queryKey: ['wa-campaigns'] });
    showToast('Campaign deleted.');
  };

  const handleSendCampaign = async (campaign) => {
    setSending(campaign.id);
    setConfirmSend(null);
    const res = await base44.functions.invoke("runWhatsAppCampaign", { campaignId: campaign.id });
    queryClient.invalidateQueries({ queryKey: ["wa-campaigns"] });
    setSending(null);
    if (res.data?.success) {
      showToast(`✅ Sent to ${res.data.sent} recipients (${res.data.failed} failed)`);
    } else {
      showToast(`❌ Error: ${res.data?.error || "Unknown error"}`, "error");
    }
  };

  const copyMessage = (msg, id) => {
    navigator.clipboard.writeText(msg);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stats = {
    total: campaigns.length,
    sent: campaigns.filter(c => c.status === "sent").length,
    drafts: campaigns.filter(c => c.status === "draft").length,
    totalReach: campaigns.filter(c => c.status === "sent").reduce((s, c) => s + (c.sent_count || 0), 0),
  };

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
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-xl ${
              toast.type === "error" ? "bg-red-600 text-white" : "bg-[#5C4A3A] text-white"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Instructions Dialog */}
      <AnimatePresence>
        {templateDialog && (
          <div className="fixed inset-0 z-40 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.93 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <FileCheck className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#5C4A3A]">Create Template in GHL</h3>
                  <p className="text-xs text-[#8B7355]">GHL doesn't allow API template creation — follow these steps:</p>
                </div>
              </div>

              <ol className="text-sm text-[#5C4A3A] space-y-2 mb-4 list-decimal list-inside">
                <li>Go to <strong>GHL → Settings → WhatsApp → Templates</strong></li>
                <li>Create a new <strong>MARKETING</strong> template with this exact name:</li>
              </ol>

              <div className="bg-[#F5F1ED] rounded-xl p-3 mb-3 flex items-center justify-between gap-2">
                <code className="text-xs text-[#5C4A3A] font-mono break-all">{templateDialog.templateName}</code>
                <button onClick={() => { navigator.clipboard.writeText(templateDialog.templateName); showToast('Copied!'); }} className="flex-shrink-0 text-[#8B7355] hover:text-[#5C4A3A]">
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm text-[#5C4A3A] mb-2"><strong>3.</strong> Paste this message body (variables are numbered):</p>
              <div className="bg-[#F5F1ED] rounded-xl p-3 mb-4 flex items-start justify-between gap-2">
                <pre className="text-xs text-[#5C4A3A] font-mono whitespace-pre-wrap flex-1">{templateDialog.templateBody}</pre>
                <button onClick={() => { navigator.clipboard.writeText(templateDialog.templateBody); showToast('Copied!'); }} className="flex-shrink-0 text-[#8B7355] hover:text-[#5C4A3A]">
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-[#8B7355] mb-4">4. Submit in GHL for WhatsApp approval. Once approved, come back and click <strong>"Mark as Approved"</strong> below.</p>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setTemplateDialog(null)}>Close</Button>
                <Button
                  onClick={() => handleMarkApproved(templateDialog.campaignId)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" /> Mark as Approved
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Send Modal */}
      <AnimatePresence>
        {confirmSend && (
          <div className="fixed inset-0 z-40 flex items-center justify-center px-5" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.93 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-[#5C4A3A] text-center mb-1">Send Campaign?</h3>
              <p className="text-sm text-[#8B7355] text-center mb-2">
                <strong>"{confirmSend.name}"</strong>
              </p>
              <p className="text-sm text-[#8B7355] text-center mb-5">
                This will send WhatsApp messages to ~<strong>{getAudienceCount(confirmSend.audience)}</strong> users via GHL. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmSend(null)}>Cancel</Button>
                <Button
                  onClick={() => handleSendCampaign(confirmSend)}
                  className="flex-1 bg-[#8B7355] hover:bg-[#6B5744] text-white rounded-xl"
                >
                  <Send className="h-4 w-4 mr-1" /> Yes, Send
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#25D366]/90 via-[#128C7E] to-[#075E54] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none text-6xl">
          <span className="absolute top-4 left-6">💬</span>
          <span className="absolute top-16 right-10">📱</span>
          <span className="absolute bottom-4 left-1/3">⭐</span>
        </div>
        <div className="relative max-w-5xl mx-auto px-5 pt-10 pb-8">
          <Link to="/AdminDashboard" className="inline-flex items-center gap-1 text-white/70 text-sm mb-5 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-white/15 rounded-2xl p-3">
              <MessageSquare className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">WhatsApp Marketing</h1>
              <p className="text-white/70 text-sm">AI-powered campaigns · GHL integration</p>
            </div>
          </div>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Campaigns", value: stats.total },
              { label: "Sent", value: stats.sent },
              { label: "Drafts", value: stats.drafts },
              { label: "Total Reach", value: stats.totalReach.toLocaleString() },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-2xl p-3 text-center">
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-white/70 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="bg-white border-b border-[#E8DED8] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 py-2">
          {[
            { id: "campaigns", label: "Campaigns", icon: MessageSquare },
            { id: "compose", label: "Compose", icon: Plus },
            { id: "templates", label: "Templates", icon: Sparkles },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.id ? "bg-[#25D366] text-white shadow" : "text-[#8B7355] hover:bg-[#F5EBE8]"
                }`}
              >
                <Icon className="h-4 w-4" />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 pb-20 space-y-5">

        {/* ── CAMPAIGNS TAB ── */}
        {tab === "campaigns" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#5C4A3A] text-lg">All Campaigns</h2>
              <Button onClick={() => setTab("compose")} className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl text-sm gap-1.5">
                <Plus className="h-4 w-4" /> New Campaign
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}</div>
            ) : campaigns.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#E8DED8] p-12 text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 text-[#C9B8A6]" />
                <p className="text-[#8B7355] font-medium">No campaigns yet</p>
                <p className="text-xs text-[#C9B8A6] mt-1">Create one from Templates or Compose</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(c => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-[#E8DED8] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F5EBE8] flex items-center justify-center flex-shrink-0 text-lg">
                        {OFFER_TYPES.find(o => o.value === c.offer_type)?.emoji || "💬"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-[#5C4A3A] text-sm">{c.name}</span>
                          <StatusBadge status={c.status} />
                          <TemplateBadge status={c.template_status} />
                          {c.ai_generated && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles className="h-2.5 w-2.5" /> AI
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <AudienceBadge value={c.audience} />
                          {c.status === "sent" && (
                            <span className="text-xs text-[#8B7355]">
                              ✅ {c.sent_count} sent · {c.failed_count} failed · {new Date(c.sent_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8B7355] line-clamp-2 whitespace-pre-line">{c.message}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F5EBE8]">
                      <button
                        onClick={() => copyMessage(c.message, c.id)}
                        className="flex items-center gap-1.5 text-xs text-[#8B7355] hover:text-[#5C4A3A] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F5EBE8]"
                      >
                        {copiedId === c.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedId === c.id ? 'Copied!' : 'Copy'}
                      </button>

                      {c.status === 'draft' && (
                        <>
                          <div className="flex-1" />
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>

                          {/* Template flow */}
                          {!c.ghl_template_name && (
                            <Button
                              onClick={() => handleSubmitTemplate(c)}
                              disabled={submittingTemplate === c.id}
                              variant="outline"
                              className="text-xs rounded-xl px-3 h-8 gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-50"
                            >
                              {submittingTemplate === c.id
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...</>
                                : <><FileCheck className="h-3.5 w-3.5" /> Submit Template</>}
                            </Button>
                          )}

                          {c.ghl_template_name && c.template_status === 'pending_approval' && (
                            <Button
                              onClick={() => handleCheckStatus(c)}
                              disabled={checkingStatus === c.id}
                              variant="outline"
                              className="text-xs rounded-xl px-3 h-8 gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-50"
                            >
                              {checkingStatus === c.id
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking...</>
                                : <><RefreshCw className="h-3.5 w-3.5" /> Check Status</>}
                            </Button>
                          )}

                          {c.ghl_template_name && c.template_status === 'rejected' && (
                            <Button
                              onClick={() => handleSubmitTemplate(c)}
                              disabled={submittingTemplate === c.id}
                              variant="outline"
                              className="text-xs rounded-xl px-3 h-8 gap-1.5 border-red-400 text-red-700 hover:bg-red-50"
                            >
                              {submittingTemplate === c.id
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Resubmitting...</>
                                : <><RefreshCw className="h-3.5 w-3.5" /> Resubmit</>}
                            </Button>
                          )}

                          <Button
                            onClick={() => setConfirmSend(c)}
                            disabled={sending === c.id || (c.ghl_template_name && c.template_status !== 'approved')}
                            className="bg-[#25D366] hover:bg-[#128C7E] text-white text-xs rounded-xl px-4 h-8 gap-1.5 disabled:opacity-40"
                            title={c.ghl_template_name && c.template_status !== 'approved' ? 'Waiting for template approval' : ''}
                          >
                            {sending === c.id
                              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sending...</>
                              : <><Send className="h-3.5 w-3.5" /> {c.template_status === 'approved' ? 'Send (Template)' : 'Send Now'}</>
                            }
                          </Button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── COMPOSE TAB ── */}
        {tab === "compose" && (
          <div className="grid md:grid-cols-2 gap-5">
            {/* Left: Form */}
            <div className="space-y-4">
              <h2 className="font-bold text-[#5C4A3A] text-lg">New Campaign</h2>

              <div>
                <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1.5 block">Campaign Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Weekend Double Points"
                  className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1.5 block">Offer Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {OFFER_TYPES.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setForm(f => ({ ...f, offer_type: o.value }))}
                      className={`py-2 px-2 rounded-xl text-xs font-medium border transition-all ${
                        form.offer_type === o.value
                          ? "bg-[#25D366] text-white border-[#25D366]"
                          : "bg-white text-[#5C4A3A] border-[#E8DED8] hover:border-[#25D366]/40"
                      }`}
                    >
                      {o.emoji} {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1.5 block">Target Audience</label>
                <div className="space-y-2">
                  {AUDIENCES.map(a => {
                    const Icon = a.icon;
                    const count = getAudienceCount(a.value);
                    return (
                      <button
                        key={a.value}
                        onClick={() => setForm(f => ({ ...f, audience: a.value }))}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                          form.audience === a.value
                            ? "border-[#25D366] bg-[#25D366]/5"
                            : "border-[#E8DED8] bg-white hover:border-[#25D366]/30"
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#5C4A3A]">{a.label}</div>
                          <div className="text-xs text-[#8B7355]">{a.desc}</div>
                        </div>
                        <span className="text-xs font-bold text-[#8B7355] flex-shrink-0">{typeof count === 'number' ? `~${count}` : count}</span>
                        {form.audience === a.value && <Check className="h-4 w-4 text-[#25D366] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Message + AI */}
            <div className="space-y-4">
              {/* AI Generator */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-bold text-purple-700">AI Message Generator</span>
                </div>
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Describe your campaign goal... e.g. 'Bring back customers who haven't visited in a week with a special offer'"
                  className="w-full border border-purple-200 rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white resize-none"
                  rows={3}
                />
                <button
                  onClick={handleGenerateAI}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {aiLoading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate with AI</>}
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide">Message</label>
                  <span className="text-xs text-[#C9B8A6]">Use {"{{name}}"}, {"{{points}}"}, {"{{tier}}"}</span>
                </div>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Write your WhatsApp message here..."
                  className="w-full border border-[#E8DED8] rounded-xl px-3 py-3 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 resize-none font-mono"
                  rows={10}
                />
              </div>

              {/* Preview */}
              {form.message && (
                <div className="bg-[#ECE5DD] rounded-2xl p-4">
                  <p className="text-xs font-semibold text-[#8B7355] mb-2">Preview</p>
                  <div className="bg-white rounded-xl rounded-tl-none p-3 max-w-xs shadow-sm">
                    <p className="text-sm whitespace-pre-line text-[#111] leading-relaxed">
                      {form.message.replace(/\{\{name\}\}/g, "Ayesha").replace(/\{\{points\}\}/g, "246").replace(/\{\{tier\}\}/g, "Gold")}
                    </p>
                  </div>
                  <p className="text-xs text-[#8B7355] mt-2 text-right">~{getAudienceCount(form.audience)} recipients</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1.5 block">Internal Notes (optional)</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. for Eid campaign"
                  className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveDraft}
                  disabled={saving || !form.name || !form.message}
                  variant="outline"
                  className="flex-1 rounded-2xl py-3 font-bold gap-2 border-[#8B7355] text-[#8B7355] hover:bg-[#F5EBE8]"
                >
                  {saving ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</> : <><Edit3 className="h-4 w-4" /> Save Draft</>}
                </Button>
                <Button
                  onClick={handleSaveAndSend}
                  disabled={saving || !form.name || !form.message}
                  className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl py-3 font-bold gap-2"
                >
                  {saving ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</> : <><Send className="h-4 w-4" /> Save & Send Now</>}
                </Button>
              </div>
              <p className="text-xs text-center text-[#C9B8A6]">"Save Draft" to review first · "Save & Send Now" to send immediately</p>
            </div>
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <>
            <div>
              <h2 className="font-bold text-[#5C4A3A] text-lg mb-1">Message Templates</h2>
              <p className="text-sm text-[#8B7355]">Click a template to pre-fill the composer — then customise before saving.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {TEMPLATES.map(tpl => {
                const audience = AUDIENCES.find(a => a.value === tpl.audience);
                return (
                  <div key={tpl.id} className="bg-white rounded-2xl border border-[#E8DED8] p-4 hover:border-[#25D366]/40 transition-all">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{tpl.emoji}</span>
                        <div>
                          <p className="font-semibold text-[#5C4A3A] text-sm">{tpl.label}</p>
                          {audience && (
                            <AudienceBadge value={tpl.audience} />
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[#8B7355] whitespace-pre-line line-clamp-4 mb-3 font-mono bg-[#F9F6F3] rounded-xl p-3 leading-relaxed">
                      {tpl.message}
                    </p>
                    <button
                      onClick={() => handleApplyTemplate(tpl)}
                      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      Use This Template <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}