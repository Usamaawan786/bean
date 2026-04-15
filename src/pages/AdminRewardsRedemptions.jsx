import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift, Settings, BarChart3, Plus, Trash2, Edit3, Save, X,
  Star, TrendingUp, Users, Zap, PackageCheck, ArrowLeft,
  DollarSign, RefreshCw, Check, Search, CheckCircle, XCircle,
  Clock, AlertTriangle, Shield, Tag, ChevronDown, ChevronUp,
  Loader2, ToggleLeft, ToggleRight, Filter, Eye, ScanLine
} from "lucide-react";
import FlashDropScannerModal from "../components/admin/FlashDropScannerModal";
import UsersLeaderboard from "../components/admin/UsersLeaderboard";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

// ─── Config ─────────────────────────────────────────────────────────────────
const CATEGORY_OPTIONS = ["Drinks", "Food", "Merchandise", "Experience"];

const defaultSettings = {
  pkr_per_point: 10,
  min_spend_for_points: 100,
  welcome_bonus_points: 50,
  referral_bonus_points: 25,
  referral_joinee_bonus_points: 25,
  flash_drop_points: 25,
  notes: ""
};

const redeemStatusConfig = {
  pending:  { label: "Valid – Unclaimed",  color: "bg-green-100 text-green-700 border-green-200" },
  claimed:  { label: "Claimed",            color: "bg-gray-100 text-gray-500 border-gray-200" },
  expired:  { label: "Expired",            color: "bg-red-100 text-red-600 border-red-200" },
};

// ─── Small Components ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "brown" }) {
  const colors = {
    brown:  "from-[#8B7355] to-[#6B5744]",
    green:  "from-emerald-500 to-emerald-700",
    amber:  "from-amber-500 to-amber-700",
    purple: "from-purple-500 to-purple-700",
    blue:   "from-blue-500 to-blue-700",
    red:    "from-red-400 to-red-600",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-5 text-white shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className="h-6 w-6 text-white/80" />
        <span className="text-xs text-white/60">{sub}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-white/70 mt-1">{label}</div>
    </div>
  );
}

function FMBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
      <Shield className="h-2.5 w-2.5" /> FM
    </span>
  );
}

function EBABadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
      ⭐ EBA
    </span>
  );
}

// ─── Reward Form ─────────────────────────────────────────────────────────────
function RewardForm({ reward, onSave, onCancel }) {
  const [form, setForm] = useState(reward || {
    name: "", description: "", points_required: 100,
    category: "Drinks", image_url: "", is_active: true
  });
  return (
    <div className="bg-[#FDF9F7] rounded-2xl border border-[#E8DED8] p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Reward Name</label>
          <input className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Spanish Latte" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Description</label>
          <input className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Points Required</label>
          <input type="number" className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            value={form.points_required} onChange={e => setForm({ ...form, points_required: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Category</label>
          <select className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Image URL</label>
          <input className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" id="is_active" checked={form.is_active}
            onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
          <label htmlFor="is_active" className="text-sm text-[#5C4A3A]">Active (visible to users)</label>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave(form)} className="flex-1 bg-[#8B7355] hover:bg-[#6B5744] text-white rounded-xl">
          <Save className="h-4 w-4 mr-1" /> Save Reward
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-xl border-[#E8DED8]">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Discount Row (FM / EBA) ─────────────────────────────────────────────────
function DiscountRow({ customer, user: appUser, onMarkDiscount }) {
  const [expanded, setExpanded] = useState(false);
  const isFM = customer.is_founding_member;
  const isEBA = customer.is_eba;
  const fmUsed = customer.fm_discount_used || 0;
  const ebaUsed = customer.eba_discount_used || 0;
  const FM_TOTAL = 3;
  const EBA_TOTAL = 3;

  return (
    <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden">
      <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#F9F6F3] transition-colors"
        onClick={() => setExpanded(v => !v)}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {(appUser?.full_name || customer.created_by || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#5C4A3A] text-sm">{appUser?.full_name || appUser?.display_name || "Unknown"}</span>
            {isFM && <FMBadge />}
            {isEBA && <EBABadge />}
          </div>
          <p className="text-xs text-[#8B7355] truncate">{customer.created_by}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isFM && (
            <div className="text-center">
              <div className={`text-sm font-bold ${fmUsed >= FM_TOTAL ? "text-gray-400" : "text-amber-600"}`}>{fmUsed}/{FM_TOTAL}</div>
              <div className="text-[10px] text-[#C9B8A6]">FM Disc.</div>
            </div>
          )}
          {isEBA && (
            <div className="text-center">
              <div className={`text-sm font-bold ${ebaUsed >= EBA_TOTAL ? "text-gray-400" : "text-purple-600"}`}>{ebaUsed}/{EBA_TOTAL}</div>
              <div className="text-[10px] text-[#C9B8A6]">EBA Disc.</div>
            </div>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-[#C9B8A6]" /> : <ChevronDown className="h-4 w-4 text-[#C9B8A6]" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-0 border-t border-[#F5EBE8] space-y-4">
              <div className="grid grid-cols-3 gap-3 pt-3">
                <div className="bg-[#F5F1ED] rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-[#8B7355]">{customer.points_balance || 0}</div>
                  <div className="text-xs text-[#C9B8A6]">Points</div>
                </div>
                <div className="bg-[#F5F1ED] rounded-xl p-3 text-center">
                  <div className="text-sm font-bold text-[#8B7355] capitalize">{customer.tier || "Bronze"}</div>
                  <div className="text-xs text-[#C9B8A6]">Tier</div>
                </div>
                <div className="bg-[#F5F1ED] rounded-xl p-3 text-center">
                  <div className="text-sm font-bold text-[#8B7355]">PKR {(customer.total_spend_pkr || 0).toLocaleString()}</div>
                  <div className="text-xs text-[#C9B8A6]">Total Spent</div>
                </div>
              </div>

              {isFM && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FMBadge />
                    <span className="font-semibold text-amber-800 text-sm">Founding Member — 10% Discount</span>
                    <span className="ml-auto text-xs font-bold text-amber-700">{FM_TOTAL - fmUsed} remaining</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    {Array.from({ length: FM_TOTAL }).map((_, i) => (
                      <div key={i} className={`flex-1 h-2.5 rounded-full ${i < fmUsed ? "bg-amber-400" : "bg-amber-200"}`} />
                    ))}
                  </div>
                  {fmUsed < FM_TOTAL ? (
                    <Button onClick={() => onMarkDiscount(customer, "fm")}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-9 text-sm gap-2">
                      <Tag className="h-4 w-4" /> Mark 10% Discount Used (#{fmUsed + 1}/3)
                    </Button>
                  ) : (
                    <div className="text-center text-xs text-amber-600 font-semibold py-1">✅ All 3 FM discounts used</div>
                  )}
                </div>
              )}

              {isEBA && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <EBABadge />
                    <span className="font-semibold text-purple-800 text-sm">EBA — 10% Discount</span>
                    <span className="ml-auto text-xs font-bold text-purple-700">{EBA_TOTAL - ebaUsed} remaining</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    {Array.from({ length: EBA_TOTAL }).map((_, i) => (
                      <div key={i} className={`flex-1 h-2.5 rounded-full ${i < ebaUsed ? "bg-purple-400" : "bg-purple-200"}`} />
                    ))}
                  </div>
                  {ebaUsed < EBA_TOTAL ? (
                    <Button onClick={() => onMarkDiscount(customer, "eba")}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 text-sm gap-2">
                      <Tag className="h-4 w-4" /> Mark 10% Discount Used (#{ebaUsed + 1}/3)
                    </Button>
                  ) : (
                    <div className="text-center text-xs text-purple-700 font-semibold py-1">✅ All 3 EBA discounts used</div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminRewardsRedemptions() {
  const [activeTab, setActiveTab] = useState("overview");
  const [editingReward, setEditingReward] = useState(null);
  const [addingReward, setAddingReward] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsId, setSettingsId] = useState(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Verify-code state
  const [codeInput, setCodeInput] = useState("");
  const [lookedUp, setLookedUp] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [showFDScanner, setShowFDScanner] = useState(false);

  // Discount state
  const [searchFM, setSearchFM] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Redemptions filter
  const [redeemFilter, setRedeemFilter] = useState("all");
  const [redeemSearch, setRedeemSearch] = useState("");

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || u.role !== "admin") navigate("/");
    });
  }, []);

  useEffect(() => {
    base44.entities.RewardSettings.list().then(list => {
      if (list.length > 0) {
        setSettingsId(list[0].id);
        setSettings({ ...defaultSettings, ...list[0] });
      }
    });
  }, []);

  const { data: rewards = [], isLoading: loadingRewards } = useQuery({
    queryKey: ["admin-rewards"],
    queryFn: () => base44.entities.Reward.list("-created_date", 100),
  });

  const { data: redemptions = [], isLoading: loadingRedemptions } = useQuery({
    queryKey: ["admin-redemptions-all"],
    queryFn: () => base44.entities.Redemption.list("-created_date", 300),
    refetchInterval: 20000,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["admin-activities"],
    queryFn: () => base44.entities.Activity.list("-created_date", 500),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => base44.entities.Customer.list("-total_points_earned", 300),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["admin-sales"],
    queryFn: () => base44.entities.StoreSale.list("-created_date", 500),
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["all-users-admin"],
    queryFn: () => base44.entities.User.list(),
  });

  // Derived
  const userMap = {};
  allUsers.forEach(u => { userMap[u.email] = u; });

  const totalPointsInCirculation = customers.reduce((s, c) => s + (c.points_balance || 0), 0);
  const totalPointsEverEarned    = customers.reduce((s, c) => s + (c.total_points_earned || 0), 0);
  const totalPointsRedeemed      = redemptions.reduce((s, r) => s + (r.points_spent || 0), 0);
  const totalRevenue             = sales.reduce((s, r) => s + (r.total_amount || 0), 0);
  const pointsValueInPKR         = totalPointsInCirculation * (settings.pkr_per_point || 10);
  const estimatedPointsFromRevenue = Math.floor(totalRevenue / (settings.pkr_per_point || 10));

  const pendingRedemptions  = redemptions.filter(r => r.status === "pending");
  const claimedRedemptions  = redemptions.filter(r => r.status === "claimed");

  const redemptionByReward = redemptions.reduce((acc, r) => { acc[r.reward_name] = (acc[r.reward_name] || 0) + 1; return acc; }, {});
  const topRewards = Object.entries(redemptionByReward).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // FM/EBA stats
  const specialCustomers = customers.filter(c => c.is_founding_member || c.is_eba);
  const totalFM = customers.filter(c => c.is_founding_member).length;
  const totalEBA = customers.filter(c => c.is_eba).length;
  const fmDiscountsLeft  = customers.filter(c => c.is_founding_member).reduce((s, c) => s + Math.max(0, 3 - (c.fm_discount_used || 0)), 0);
  const ebaDiscountsLeft = customers.filter(c => c.is_eba).reduce((s, c) => s + Math.max(0, 3 - (c.eba_discount_used || 0)), 0);

  const filteredSpecialCustomers = specialCustomers
    .filter(c => filterType === "fm" ? c.is_founding_member : filterType === "eba" ? c.is_eba : true)
    .filter(c => {
      if (!searchFM) return true;
      const u = userMap[c.created_by];
      return (u?.full_name || "").toLowerCase().includes(searchFM.toLowerCase())
        || (c.created_by || "").toLowerCase().includes(searchFM.toLowerCase());
    });

  const filteredRedemptions = redemptions
    .filter(r => redeemFilter === "all" ? true : r.status === redeemFilter)
    .filter(r => !redeemSearch || r.customer_email?.toLowerCase().includes(redeemSearch.toLowerCase())
      || r.reward_name?.toLowerCase().includes(redeemSearch.toLowerCase())
      || r.redemption_code?.toLowerCase().includes(redeemSearch.toLowerCase()));

  const spendExamples = [100, 200, 500, 1000, 2000, 5000].map(pkr => ({
    pkr, points: Math.floor(pkr / (settings.pkr_per_point || 10))
  }));

  // Handlers
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const payload = { ...settings, is_active: true };
    if (settingsId) { await base44.entities.RewardSettings.update(settingsId, payload); }
    else { const c = await base44.entities.RewardSettings.create(payload); setSettingsId(c.id); }
    setSavingSettings(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
    toast.success("Settings saved!");
  };

  const handleSaveReward = async (form) => {
    if (editingReward?.id) { await base44.entities.Reward.update(editingReward.id, form); }
    else { await base44.entities.Reward.create(form); }
    setEditingReward(null);
    setAddingReward(false);
    queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
    toast.success("Reward saved!");
  };

  const handleDeleteReward = async (id) => {
    if (!confirm("Delete this reward?")) return;
    await base44.entities.Reward.delete(id);
    queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
    toast.success("Reward deleted.");
  };

  const handleToggleReward = async (reward) => {
    await base44.entities.Reward.update(reward.id, { is_active: !reward.is_active });
    queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
    toast.success(reward.is_active ? "Reward deactivated" : "Reward activated");
  };

  const handleMarkDiscount = async (customer, type) => {
    const field = type === "fm" ? "fm_discount_used" : "eba_discount_used";
    const current = customer[field] || 0;
    if (current >= 3) { toast.error("All discounts already used!"); return; }
    await base44.entities.Customer.update(customer.id, { [field]: current + 1 });
    queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    toast.success(`✅ ${type === "fm" ? "FM" : "EBA"} 10% discount marked — ${current + 1}/3 used`);
  };

  const handleCodeLookup = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setNotFound(false); setLookedUp(null);
    const results = await base44.entities.Redemption.filter({ redemption_code: code });
    if (results.length === 0) setNotFound(true);
    else setLookedUp(results[0]);
  };

  const handleClaim = async (r) => {
    await base44.entities.Redemption.update(r.id, { status: "claimed" });
    setLookedUp(prev => ({ ...prev, status: "claimed" }));
    queryClient.invalidateQueries({ queryKey: ["admin-redemptions-all"] });
    toast.success("Marked as claimed!");
  };

  const handleExpire = async (r) => {
    await base44.entities.Redemption.update(r.id, { status: "expired" });
    setLookedUp(prev => ({ ...prev, status: "expired" }));
    queryClient.invalidateQueries({ queryKey: ["admin-redemptions-all"] });
    toast.success("Marked as expired.");
  };

  const handleQuickClaim = async (r) => {
    await base44.entities.Redemption.update(r.id, { status: "claimed" });
    queryClient.invalidateQueries({ queryKey: ["admin-redemptions-all"] });
    toast.success("Marked as claimed!");
  };

  const tabs = [
    { id: "overview",   label: "Overview",       icon: BarChart3 },
    { id: "rewards",    label: "Rewards",         icon: Gift },
    { id: "verify",     label: "Verify Code",     icon: Search },
    { id: "redemptions",label: "Redemptions",     icon: PackageCheck },
    { id: "discounts",  label: "FM & EBA",        icon: Shield },
    { id: "users",      label: "Users",           icon: Users },
    { id: "settings",   label: "Settings",        icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none text-5xl">
          <span className="absolute top-4 left-8">🎁</span>
          <span className="absolute bottom-4 right-12">⭐</span>
          <span className="absolute top-16 right-6">☕</span>
        </div>
        <div className="relative max-w-5xl mx-auto px-5 pt-10 pb-8">
          <Link to="/AdminDashboard" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-white/15 rounded-2xl p-3"><Gift className="h-7 w-7" /></div>
            <div>
              <h1 className="text-2xl font-bold">Rewards & Redemptions</h1>
              <p className="text-white/70 text-sm">Full control over points, rewards, codes, FM/EBA discounts</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Points in Circulation", value: totalPointsInCirculation.toLocaleString(), icon: "⭐" },
              { label: "Redemptions (Total)", value: redemptions.length, icon: "🎁" },
              { label: "Pending Claims", value: pendingRedemptions.length, icon: "⏳" },
              { label: "FM + EBA Members", value: totalFM + totalEBA, icon: "🏅" },
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
      <div className="bg-white border-b border-[#E8DED8] sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 py-2 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id ? "bg-[#5C4A3A] text-white shadow" : "text-[#8B7355] hover:bg-[#F5EBE8]"
                }`}>
                <Icon className="h-3.5 w-3.5" />{tab.label}
                {tab.id === "verify" && pendingRedemptions.length > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingRedemptions.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 pb-16">

        {/* ─── OVERVIEW ─── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard icon={Star}         label="Points in Circulation"    value={totalPointsInCirculation.toLocaleString()} sub="Active"    color="brown" />
              <StatCard icon={TrendingUp}   label="Total Points Ever Earned"  value={totalPointsEverEarned.toLocaleString()}   sub="Lifetime"  color="amber" />
              <StatCard icon={PackageCheck} label="Total Redemptions"         value={redemptions.length}                       sub="All time"  color="green" />
              <StatCard icon={Clock}        label="Pending Claims"            value={pendingRedemptions.length}                sub="Unclaimed" color="blue" />
              <StatCard icon={Users}        label="Total Customers"           value={customers.length}                         sub="Registered" color="purple" />
              <StatCard icon={DollarSign}   label="Points Liability (PKR)"    value={`PKR ${pointsValueInPKR.toLocaleString()}`} sub="Outstanding" color="red" />
            </div>

            {/* Revenue summary */}
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-5">
              <h3 className="font-bold text-[#5C4A3A] mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#8B7355]" /> Revenue & Points Summary
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Total Revenue (from sales)", val: `PKR ${totalRevenue.toLocaleString()}` },
                  { label: "Est. Points Issued from Sales", val: `${estimatedPointsFromRevenue.toLocaleString()} pts` },
                  { label: "Total Points Redeemed", val: `${totalPointsRedeemed.toLocaleString()} pts` },
                  { label: "Active Points Liability (PKR)", val: `PKR ${pointsValueInPKR.toLocaleString()}`, red: true },
                  { label: "Current Rate", val: `PKR ${settings.pkr_per_point} = 1 point` },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-[#F5EBE8] last:border-0">
                    <span className="text-sm text-[#8B7355]">{item.label}</span>
                    <span className={`font-bold ${item.red ? "text-red-600" : "text-[#5C4A3A]"}`}>{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top redeemed rewards */}
            {topRewards.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E8DED8] p-5">
                <h3 className="font-bold text-[#5C4A3A] mb-4 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-[#8B7355]" /> Most Redeemed Rewards
                </h3>
                <div className="space-y-3">
                  {topRewards.map(([name, count], i) => (
                    <div key={name} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-gray-300 text-gray-700" : "bg-orange-300 text-white"}`}>{i + 1}</div>
                      <div className="flex-1 text-sm text-[#5C4A3A] font-medium">{name}</div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 bg-[#8B7355] rounded-full" style={{ width: `${(count / topRewards[0][1]) * 80}px` }} />
                        <span className="text-sm font-bold text-[#8B7355] w-8 text-right">{count}x</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FM/EBA Quick Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3"><FMBadge /><span className="font-bold text-amber-800">Founding Members</span></div>
                <div className="text-3xl font-bold text-amber-700 mb-1">{totalFM}</div>
                <div className="text-sm text-amber-600">{fmDiscountsLeft} discounts remaining</div>
                <button onClick={() => setActiveTab("discounts")} className="mt-3 text-xs text-amber-700 underline font-semibold">Manage →</button>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3"><EBABadge /><span className="font-bold text-purple-800">EBA Members</span></div>
                <div className="text-3xl font-bold text-purple-700 mb-1">{totalEBA}</div>
                <div className="text-sm text-purple-600">{ebaDiscountsLeft} discounts remaining</div>
                <button onClick={() => setActiveTab("discounts")} className="mt-3 text-xs text-purple-700 underline font-semibold">Manage →</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── REWARDS ─── */}
        {activeTab === "rewards" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#5C4A3A] text-lg">All Rewards ({rewards.length})</h2>
              <Button onClick={() => { setAddingReward(true); setEditingReward(null); }}
                className="bg-[#8B7355] hover:bg-[#6B5744] text-white rounded-xl text-sm gap-1">
                <Plus className="h-4 w-4" /> Add Reward
              </Button>
            </div>

            {addingReward && <RewardForm onSave={handleSaveReward} onCancel={() => setAddingReward(false)} />}

            {loadingRewards ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}</div>
            ) : (
              <div className="space-y-3">
                {rewards.map(reward => (
                  <div key={reward.id}>
                    {editingReward?.id === reward.id ? (
                      <RewardForm reward={editingReward} onSave={handleSaveReward} onCancel={() => setEditingReward(null)} />
                    ) : (
                      <div className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition-opacity ${!reward.is_active ? "opacity-60 border-gray-200" : "border-[#E8DED8]"}`}>
                        {reward.image_url && (
                          <img src={reward.image_url} alt={reward.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#5C4A3A]">{reward.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${reward.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {reward.is_active ? "Active" : "Inactive"}
                            </span>
                            <span className="text-xs bg-[#F5EBE8] text-[#8B7355] px-2 py-0.5 rounded-full">{reward.category}</span>
                          </div>
                          <div className="text-xs text-[#8B7355] mt-0.5 truncate">{reward.description}</div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-sm font-bold text-[#5C4A3A]">
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />{reward.points_required} pts
                            </span>
                            <span className="text-xs text-[#C9B8A6]">≈ PKR {(reward.points_required * (settings.pkr_per_point || 10)).toLocaleString()} spend</span>
                            <span className="text-xs text-[#C9B8A6]">{(redemptionByReward[reward.name] || 0)}x redeemed</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleToggleReward(reward)}
                            className={`p-2 rounded-xl transition-colors ${reward.is_active ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                            title={reward.is_active ? "Deactivate" : "Activate"}>
                            {reward.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          </button>
                          <button onClick={() => setEditingReward(reward)}
                            className="p-2 rounded-xl bg-[#F5EBE8] hover:bg-[#EDE3DF] text-[#8B7355] transition-colors">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteReward(reward.id)}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Flash Drop Scanner Modal */}
        {showFDScanner && (
          <FlashDropScannerModal
            onClose={() => setShowFDScanner(false)}
            onRedeemed={() => queryClient.invalidateQueries({ queryKey: ["admin-redemptions-all"] })}
          />
        )}

        {/* ─── VERIFY CODE ─── */}
        {activeTab === "verify" && (
          <div className="space-y-5">

            {/* Flash Drop QR Scanner Card */}
            <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] rounded-3xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Flash Drop QR Scanner</h3>
                  <p className="text-white/70 text-xs">Scan customer's Flash Drop QR to auto-redeem</p>
                </div>
              </div>
              <button
                onClick={() => setShowFDScanner(true)}
                className="w-full bg-white text-[#5C4A3A] font-bold rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-[#F5F1ED] transition-colors"
              >
                <ScanLine className="h-5 w-5" /> Open Scanner
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm">
              <h2 className="font-bold text-[#5C4A3A] mb-1 flex items-center gap-2">
                <Search className="h-5 w-5 text-[#8B7355]" /> Look Up Reward Redemption Code
              </h2>
              <p className="text-sm text-[#8B7355] mb-4">Enter the code shown on the customer's reward screen to verify and honour.</p>
              <div className="flex gap-3">
                <Input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleCodeLookup()}
                  placeholder="Enter code (e.g. 3Z79DYJK)"
                  className="font-mono text-lg tracking-widest border-[#E8DED8] uppercase" />
                <Button onClick={handleCodeLookup} className="bg-[#5C4A3A] hover:bg-[#4A3829] px-6 rounded-xl gap-2">
                  <Search className="h-4 w-4" /> Verify
                </Button>
              </div>

              <AnimatePresence>
                {notFound && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                    <XCircle className="h-6 w-6 text-red-500" />
                    <div><p className="font-semibold text-red-700">Code Not Found</p><p className="text-sm text-red-500">Do not honour this reward.</p></div>
                  </motion.div>
                )}
                {lookedUp && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`mt-4 rounded-2xl border-2 p-5 ${lookedUp.status === "pending" ? "bg-green-50 border-green-300" : lookedUp.status === "claimed" ? "bg-gray-50 border-gray-300" : "bg-red-50 border-red-300"}`}>
                    {lookedUp.status === "pending" && <div className="flex items-center gap-2 mb-4 text-green-700 font-bold text-lg"><CheckCircle className="h-6 w-6" />✅ Valid Code — OK to Honour</div>}
                    {lookedUp.status === "claimed" && <div className="flex items-center gap-2 mb-4 text-gray-600 font-bold text-lg"><AlertTriangle className="h-6 w-6" />⚠️ Already Claimed — Do NOT Honour Again</div>}
                    {lookedUp.status === "expired"  && <div className="flex items-center gap-2 mb-4 text-red-600 font-bold text-lg"><XCircle className="h-6 w-6" />❌ Expired — Do Not Honour</div>}
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div><p className="text-[#8B7355] text-xs">Code</p><p className="font-mono font-bold text-[#5C4A3A] text-lg tracking-widest">{lookedUp.redemption_code}</p></div>
                      <div><p className="text-[#8B7355] text-xs">Reward</p><p className="font-bold text-[#5C4A3A]">{lookedUp.reward_name}</p></div>
                      <div><p className="text-[#8B7355] text-xs">Customer</p><p className="font-medium text-[#5C4A3A]">{lookedUp.customer_email}</p></div>
                      <div><p className="text-[#8B7355] text-xs">Points Spent</p><p className="font-bold text-[#5C4A3A]">{lookedUp.points_spent} pts</p></div>
                      <div><p className="text-[#8B7355] text-xs">Date</p><p className="font-medium text-[#5C4A3A]">{format(new Date(lookedUp.created_date), "MMM d, yyyy HH:mm")}</p></div>
                      <div><p className="text-[#8B7355] text-xs">Status</p><Badge className={`${redeemStatusConfig[lookedUp.status]?.color} border`}>{redeemStatusConfig[lookedUp.status]?.label}</Badge></div>
                    </div>
                    {lookedUp.status === "pending" && (
                      <div className="flex gap-3">
                        <Button onClick={() => handleClaim(lookedUp)} className="flex-1 bg-green-600 hover:bg-green-700 rounded-xl"><CheckCircle className="h-4 w-4 mr-2" />Mark as Claimed</Button>
                        <Button onClick={() => handleExpire(lookedUp)} variant="outline" className="rounded-xl border-red-200 text-red-600 hover:bg-red-50">Expire</Button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pending queue */}
            {pendingRedemptions.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E8DED8] p-5">
                <h3 className="font-bold text-[#5C4A3A] mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" /> Pending Claims ({pendingRedemptions.length})
                </h3>
                <div className="space-y-2">
                  {pendingRedemptions.slice(0, 10).map(r => (
                    <div key={r.id} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-bold text-[#5C4A3A]">{r.redemption_code}</div>
                        <div className="text-xs text-[#8B7355] truncate">{r.customer_email} · {r.reward_name}</div>
                      </div>
                      <Button size="sm" onClick={() => handleQuickClaim(r)}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg h-8 text-xs px-3 gap-1">
                        <Check className="h-3 w-3" /> Claim
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── REDEMPTIONS HISTORY ─── */}
        {activeTab === "redemptions" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
                <div className="text-2xl font-bold text-[#5C4A3A]">{redemptions.length}</div>
                <div className="text-xs text-[#8B7355] mt-1">Total</div>
              </div>
              <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{pendingRedemptions.length}</div>
                <div className="text-xs text-[#8B7355] mt-1">Pending</div>
              </div>
              <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{claimedRedemptions.length}</div>
                <div className="text-xs text-[#8B7355] mt-1">Claimed</div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
                <input value={redeemSearch} onChange={e => setRedeemSearch(e.target.value)}
                  placeholder="Search by customer, reward or code..."
                  className="w-full border border-[#E8DED8] rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30" />
              </div>
              <div className="flex gap-2">
                {[{ id: "all", label: "All" }, { id: "pending", label: "⏳ Pending" }, { id: "claimed", label: "✅ Claimed" }, { id: "expired", label: "❌ Expired" }].map(f => (
                  <button key={f.id} onClick={() => setRedeemFilter(f.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${redeemFilter === f.id ? "bg-[#5C4A3A] text-white" : "bg-white border border-[#E8DED8] text-[#8B7355] hover:bg-[#F5EBE8]"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingRedemptions ? (
              <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}</div>
            ) : filteredRedemptions.length === 0 ? (
              <div className="text-center py-12 text-[#8B7355]">
                <PackageCheck className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No redemptions found</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F5EBE8]">
                      <tr>
                        <th className="text-left px-4 py-3 text-[#8B7355] font-semibold">Code</th>
                        <th className="text-left px-4 py-3 text-[#8B7355] font-semibold">Reward</th>
                        <th className="text-left px-4 py-3 text-[#8B7355] font-semibold">Customer</th>
                        <th className="text-left px-4 py-3 text-[#8B7355] font-semibold">Points</th>
                        <th className="text-left px-4 py-3 text-[#8B7355] font-semibold">Date</th>
                        <th className="text-left px-4 py-3 text-[#8B7355] font-semibold">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRedemptions.map(r => {
                        const cfg = redeemStatusConfig[r.status] || redeemStatusConfig.pending;
                        return (
                          <tr key={r.id} className="border-t border-[#F5EBE8] hover:bg-[#FDF9F7] transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-[#5C4A3A]">{r.redemption_code}</td>
                            <td className="px-4 py-3 text-[#5C4A3A]">{r.reward_name}</td>
                            <td className="px-4 py-3 text-[#8B7355] max-w-[130px] truncate">{r.customer_email}</td>
                            <td className="px-4 py-3 font-medium text-[#5C4A3A]">{r.points_spent}</td>
                            <td className="px-4 py-3 text-[#8B7355] whitespace-nowrap">{format(new Date(r.created_date), "MMM d, HH:mm")}</td>
                            <td className="px-4 py-3"><Badge className={`${cfg.color} border text-xs`}>{cfg.label}</Badge></td>
                            <td className="px-4 py-3">
                              {r.status === "pending" && (
                                <Button size="sm" onClick={() => handleQuickClaim(r)}
                                  className="bg-green-600 hover:bg-green-700 rounded-lg h-7 text-xs px-3">Claim</Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── FM & EBA DISCOUNTS ─── */}
        {activeTab === "discounts" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Founding Members", value: totalFM, icon: "🏅" },
                { label: "FM Discounts Left", value: fmDiscountsLeft, icon: "🏷️" },
                { label: "EBA Members", value: totalEBA, icon: "⭐" },
                { label: "EBA Discounts Left", value: ebaDiscountsLeft, icon: "🎖️" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-2xl font-bold text-[#5C4A3A]">{s.value}</div>
                  <div className="text-xs text-[#8B7355]">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
              <p className="font-bold mb-1">📋 Cashier Instructions</p>
              <p>When a customer claims FM or EBA discount, search their name/email below, expand their card, and tap <strong>"Mark Discount Used"</strong>. Each member gets <strong>3 × 10% off</strong> on separate orders.</p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
                <input value={searchFM} onChange={e => setSearchFM(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full border border-[#E8DED8] rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30" />
              </div>
              <div className="flex gap-2">
                {[{ id: "all", label: "All" }, { id: "fm", label: "🏅 FM" }, { id: "eba", label: "⭐ EBA" }].map(f => (
                  <button key={f.id} onClick={() => setFilterType(f.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filterType === f.id ? "bg-[#5C4A3A] text-white" : "bg-white border border-[#E8DED8] text-[#8B7355] hover:bg-[#F5EBE8]"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#8B7355]" /></div>
            ) : filteredSpecialCustomers.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#E8DED8] p-12 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 text-[#C9B8A6]" />
                <p className="text-[#8B7355] font-medium">No members found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSpecialCustomers.map(c => (
                  <DiscountRow key={c.id} customer={c} user={userMap[c.created_by]} onMarkDiscount={handleMarkDiscount} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── USERS ─── */}
        {activeTab === "users" && (
          <UsersLeaderboard customers={customers} activities={activities} redemptions={redemptions} settings={settings} />
        )}

        {/* ─── SETTINGS ─── */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-5">
              <h3 className="font-bold text-[#5C4A3A] mb-1 flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#8B7355]" /> Points Conversion Rate
              </h3>
              <p className="text-xs text-[#8B7355] mb-5">How many PKR a customer must spend to earn 1 point</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">PKR per 1 Point</label>
                  <div className="flex items-center gap-3">
                    <input type="number"
                      className="w-32 border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
                      value={settings.pkr_per_point} onChange={e => setSettings({ ...settings, pkr_per_point: Number(e.target.value) })} />
                    <span className="text-sm text-[#8B7355]">PKR = 1 point</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Minimum Spend to Earn Points (PKR)</label>
                  <input type="number"
                    className="w-32 border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
                    value={settings.min_spend_for_points} onChange={e => setSettings({ ...settings, min_spend_for_points: Number(e.target.value) })} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-2">Points Earned Preview</p>
                  <div className="rounded-xl overflow-hidden border border-[#E8DED8]">
                    <table className="w-full text-sm">
                      <thead className="bg-[#F5EBE8]">
                        <tr>
                          <th className="text-left px-4 py-2 text-[#8B7355] font-semibold">Spend (PKR)</th>
                          <th className="text-right px-4 py-2 text-[#8B7355] font-semibold">Points Earned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spendExamples.map(({ pkr, points }, i) => (
                          <tr key={pkr} className={i % 2 === 0 ? "bg-white" : "bg-[#FDF9F7]"}>
                            <td className="px-4 py-2 text-[#5C4A3A] font-medium">PKR {pkr.toLocaleString()}</td>
                            <td className="px-4 py-2 text-right font-bold text-[#8B7355]">{points} pts ⭐</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8DED8] p-5">
              <h3 className="font-bold text-[#5C4A3A] mb-1 flex items-center gap-2">
                <Gift className="h-5 w-5 text-[#8B7355]" /> Bonus Points Configuration
              </h3>
              <p className="text-xs text-[#8B7355] mb-5">Control points for special events and actions</p>
              <div className="space-y-4">
                {[
                  { key: "welcome_bonus_points", label: "Welcome Bonus (New Signup)", desc: "Points given to new users when they first join" },
                  { key: "referral_bonus_points", label: "Referral Bonus (Referrer)", desc: "Points given to the person who referred" },
                  { key: "referral_joinee_bonus_points", label: "Referral Bonus (Joinee)", desc: "Points given to the person who joined via referral" },
                  { key: "flash_drop_points", label: "Flash Drop Claim Points", desc: "Points given when a flash drop is claimed" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#5C4A3A]">{label}</div>
                      <div className="text-xs text-[#8B7355]">{desc}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input type="number"
                        className="w-24 border border-[#E8DED8] rounded-xl px-3 py-2 text-sm text-[#5C4A3A] text-center focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
                        value={settings[key] || 0} onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })} />
                      <span className="text-xs text-[#8B7355]">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8DED8] p-5">
              <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-2 block">Internal Notes</label>
              <textarea className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 resize-none"
                rows={3} value={settings.notes || ""} onChange={e => setSettings({ ...settings, notes: e.target.value })}
                placeholder="Any notes about current reward structure..." />
            </div>

            <Button onClick={handleSaveSettings} disabled={savingSettings}
              className="w-full bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:from-[#6B5744] hover:to-[#5C4A3A] text-white rounded-2xl py-3 text-base font-bold shadow-lg">
              {savingSettings ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...</> :
               settingsSaved  ? <><Check className="h-4 w-4 mr-2" /> Saved!</>                   :
               <><Save className="h-4 w-4 mr-2" /> Save All Settings</>}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}