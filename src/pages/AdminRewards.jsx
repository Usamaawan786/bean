import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift, Settings, BarChart3, Plus, Trash2, Edit3, Save, X,
  Star, TrendingUp, Users, Coffee, Zap, ChevronRight, AlertCircle,
  PackageCheck, ArrowLeft, DollarSign, RefreshCw, Check
} from "lucide-react";
import UsersLeaderboard from "../components/admin/UsersLeaderboard";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

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

function StatCard({ icon: Icon, label, value, sub, color = "brown" }) {
  const colors = {
    brown: "from-[#8B7355] to-[#6B5744]",
    green: "from-emerald-500 to-emerald-700",
    amber: "from-amber-500 to-amber-700",
    purple: "from-purple-500 to-purple-700",
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
          <input
            className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Spanish Latte"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Description</label>
          <input
            className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Short description"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Points Required</label>
          <input
            type="number"
            className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            value={form.points_required}
            onChange={e => setForm({ ...form, points_required: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Category</label>
          <select
            className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 bg-white"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Image URL</label>
          <input
            className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            value={form.image_url}
            onChange={e => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={e => setForm({ ...form, is_active: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="is_active" className="text-sm text-[#5C4A3A]">Active (visible to users)</label>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => onSave(form)}
          className="flex-1 bg-[#8B7355] hover:bg-[#6B5744] text-white rounded-xl"
        >
          <Save className="h-4 w-4 mr-1" /> Save Reward
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-xl border-[#E8DED8]">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminRewards() {
  const [activeTab, setActiveTab] = useState("overview");
  const [editingReward, setEditingReward] = useState(null);
  const [addingReward, setAddingReward] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsId, setSettingsId] = useState(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Auth check
  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || u.role !== "admin") navigate("/");
    });
  }, []);

  // Load reward settings
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
    queryFn: () => base44.entities.Reward.list("-created_date", 100)
  });

  const { data: redemptions = [], isLoading: loadingRedemptions } = useQuery({
    queryKey: ["admin-redemptions"],
    queryFn: () => base44.entities.Redemption.list("-created_date", 200)
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["admin-activities"],
    queryFn: () => base44.asServiceRole ? base44.entities.Activity.list("-created_date", 500) : Promise.resolve([])
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => base44.entities.Customer.list("-total_points_earned", 200)
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["admin-sales"],
    queryFn: () => base44.entities.StoreSale.list("-created_date", 500)
  });

  // Analytics
  const totalPointsInCirculation = customers.reduce((s, c) => s + (c.points_balance || 0), 0);
  const totalPointsEverEarned = customers.reduce((s, c) => s + (c.total_points_earned || 0), 0);
  const totalRedemptions = redemptions.length;
  const totalPointsRedeemed = redemptions.reduce((s, r) => s + (r.points_spent || 0), 0);
  const totalRevenue = sales.reduce((s, r) => s + (r.total_amount || 0), 0);
  const pointsValueInPKR = totalPointsInCirculation * (settings.pkr_per_point || 10);

  // Points earned from revenue (based on current setting)
  const estimatedPointsFromRevenue = Math.floor(totalRevenue / (settings.pkr_per_point || 10));

  // Redemptions by reward
  const redemptionByReward = redemptions.reduce((acc, r) => {
    acc[r.reward_name] = (acc[r.reward_name] || 0) + 1;
    return acc;
  }, {});

  const topRewards = Object.entries(redemptionByReward)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Save settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const payload = { ...settings, is_active: true };
    if (settingsId) {
      await base44.entities.RewardSettings.update(settingsId, payload);
    } else {
      const created = await base44.entities.RewardSettings.create(payload);
      setSettingsId(created.id);
    }
    setSavingSettings(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  // Reward CRUD
  const handleSaveReward = async (form) => {
    if (editingReward?.id) {
      await base44.entities.Reward.update(editingReward.id, form);
    } else {
      await base44.entities.Reward.create(form);
    }
    setEditingReward(null);
    setAddingReward(false);
    queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
  };

  const handleDeleteReward = async (id) => {
    if (!confirm("Delete this reward?")) return;
    await base44.entities.Reward.delete(id);
    queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "rewards", label: "Rewards", icon: Gift },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "redemptions", label: "Redemptions", icon: PackageCheck },
  ];

  // PKR spend example table
  const spendExamples = [100, 200, 500, 1000, 2000, 5000].map(pkr => ({
    pkr,
    points: Math.floor(pkr / (settings.pkr_per_point || 10))
  }));

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white px-5 pt-10 pb-6">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-white/15 rounded-2xl p-3">
              <Gift className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Rewards Admin</h1>
              <p className="text-[#E8DED8] text-sm">Full control over points, rewards & redemptions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="bg-white border-b border-[#E8DED8] sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 flex gap-1 py-2 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-[#8B7355] text-white shadow"
                    : "text-[#8B7355] hover:bg-[#F5EBE8]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-16">

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon={Star} label="Points in Circulation" value={totalPointsInCirculation.toLocaleString()} sub="Active" color="brown" />
              <StatCard icon={TrendingUp} label="Total Points Ever Earned" value={totalPointsEverEarned.toLocaleString()} sub="Lifetime" color="amber" />
              <StatCard icon={PackageCheck} label="Total Redemptions" value={totalRedemptions} sub="All time" color="green" />
              <StatCard icon={Users} label="Total Customers" value={customers.length} sub="Registered" color="purple" />
            </div>

            {/* Revenue vs Points */}
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-5">
              <h3 className="font-bold text-[#5C4A3A] mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#8B7355]" /> Revenue & Points Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#F5EBE8]">
                  <span className="text-sm text-[#8B7355]">Total Revenue (from sales)</span>
                  <span className="font-bold text-[#5C4A3A]">PKR {totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#F5EBE8]">
                  <span className="text-sm text-[#8B7355]">Est. Points Issued from Sales</span>
                  <span className="font-bold text-[#5C4A3A]">{estimatedPointsFromRevenue.toLocaleString()} pts</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#F5EBE8]">
                  <span className="text-sm text-[#8B7355]">Total Points Redeemed</span>
                  <span className="font-bold text-[#5C4A3A]">{totalPointsRedeemed.toLocaleString()} pts</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#F5EBE8]">
                  <span className="text-sm text-[#8B7355]">Active Points Liability (PKR value)</span>
                  <span className="font-bold text-red-600">PKR {pointsValueInPKR.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-[#8B7355]">Current Rate</span>
                  <span className="font-bold text-[#5C4A3A]">PKR {settings.pkr_per_point} = 1 point</span>
                </div>
              </div>
            </div>

            {/* Top Redeemed Rewards */}
            {topRewards.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E8DED8] p-5">
                <h3 className="font-bold text-[#5C4A3A] mb-4 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-[#8B7355]" /> Most Redeemed Rewards
                </h3>
                <div className="space-y-2">
                  {topRewards.map(([name, count], i) => (
                    <div key={name} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-gray-300 text-gray-700" : "bg-orange-300 text-white"
                      }`}>{i + 1}</div>
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
          </div>
        )}

        {/* REWARDS TAB */}
        {activeTab === "rewards" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#5C4A3A] text-lg">All Rewards ({rewards.length})</h2>
              <Button
                onClick={() => { setAddingReward(true); setEditingReward(null); }}
                className="bg-[#8B7355] hover:bg-[#6B5744] text-white rounded-xl text-sm"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Reward
              </Button>
            </div>

            {addingReward && (
              <RewardForm onSave={handleSaveReward} onCancel={() => setAddingReward(false)} />
            )}

            {loadingRewards ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}</div>
            ) : (
              <div className="space-y-3">
                {rewards.map(reward => (
                  <div key={reward.id}>
                    {editingReward?.id === reward.id ? (
                      <RewardForm
                        reward={editingReward}
                        onSave={handleSaveReward}
                        onCancel={() => setEditingReward(null)}
                      />
                    ) : (
                      <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 flex items-center gap-4">
                        {reward.image_url && (
                          <img src={reward.image_url} alt={reward.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#5C4A3A]">{reward.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${reward.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {reward.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="text-xs text-[#8B7355] mt-0.5 truncate">{reward.description}</div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-sm font-bold text-[#5C4A3A]">
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                              {reward.points_required} pts
                            </span>
                            <span className="text-xs text-[#C9B8A6]">≈ PKR {(reward.points_required * (settings.pkr_per_point || 10)).toLocaleString()} spend</span>
                            <span className="text-xs bg-[#F5EBE8] text-[#8B7355] px-2 py-0.5 rounded-full">{reward.category}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => setEditingReward(reward)}
                            className="p-2 rounded-xl bg-[#F5EBE8] hover:bg-[#EDE3DF] text-[#8B7355] transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReward(reward.id)}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                          >
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

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Points Conversion */}
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-5">
              <h3 className="font-bold text-[#5C4A3A] mb-1 flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#8B7355]" /> Points Conversion Rate
              </h3>
              <p className="text-xs text-[#8B7355] mb-5">How many PKR a customer must spend to earn 1 point</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">PKR per 1 Point</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      className="w-32 border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
                      value={settings.pkr_per_point}
                      onChange={e => setSettings({ ...settings, pkr_per_point: Number(e.target.value) })}
                    />
                    <span className="text-sm text-[#8B7355]">PKR = 1 point</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Minimum Spend to Earn Points (PKR)</label>
                  <input
                    type="number"
                    className="w-32 border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
                    value={settings.min_spend_for_points}
                    onChange={e => setSettings({ ...settings, min_spend_for_points: Number(e.target.value) })}
                  />
                </div>

                {/* Spend → Points table */}
                <div className="mt-4">
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

            {/* Bonus Points */}
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
                      <input
                        type="number"
                        className="w-24 border border-[#E8DED8] rounded-xl px-3 py-2 text-sm text-[#5C4A3A] text-center focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
                        value={settings[key] || 0}
                        onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })}
                      />
                      <span className="text-xs text-[#8B7355]">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-5">
              <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-2 block">Internal Notes</label>
              <textarea
                className="w-full border border-[#E8DED8] rounded-xl px-3 py-2.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 resize-none"
                rows={3}
                value={settings.notes || ""}
                onChange={e => setSettings({ ...settings, notes: e.target.value })}
                placeholder="Any notes about current reward structure..."
              />
            </div>

            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:from-[#6B5744] hover:to-[#5C4A3A] text-white rounded-2xl py-3 text-base font-bold shadow-lg"
            >
              {savingSettings ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : settingsSaved ? (
                <><Check className="h-4 w-4 mr-2" /> Saved!</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save All Settings</>
              )}
            </Button>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <UsersLeaderboard customers={customers} activities={activities} redemptions={redemptions} settings={settings} />
        )}

        {/* REDEMPTIONS TAB */}
        {activeTab === "redemptions" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
                <div className="text-2xl font-bold text-[#5C4A3A]">{totalRedemptions}</div>
                <div className="text-xs text-[#8B7355] mt-1">Total</div>
              </div>
              <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
                <div className="text-2xl font-bold text-[#5C4A3A]">{totalPointsRedeemed.toLocaleString()}</div>
                <div className="text-xs text-[#8B7355] mt-1">Points Used</div>
              </div>
              <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
                <div className="text-2xl font-bold text-[#5C4A3A]">PKR {(totalPointsRedeemed * (settings.pkr_per_point || 10)).toLocaleString()}</div>
                <div className="text-xs text-[#8B7355] mt-1">Est. Value</div>
              </div>
            </div>

            <h3 className="font-bold text-[#5C4A3A]">Redemption History</h3>

            {loadingRedemptions ? (
              <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}</div>
            ) : redemptions.length === 0 ? (
              <div className="text-center py-12 text-[#8B7355]">
                <PackageCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No redemptions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {redemptions.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl border border-[#E8DED8] px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F5EBE8] flex items-center justify-center flex-shrink-0">
                      <Gift className="h-5 w-5 text-[#8B7355]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#5C4A3A] text-sm truncate">{r.reward_name}</div>
                      <div className="text-xs text-[#8B7355] truncate">{r.customer_email}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-[#5C4A3A]">-{r.points_spent} pts</div>
                      <div className={`text-xs px-2 py-0.5 rounded-full mt-0.5 ${
                        r.status === "claimed" ? "bg-green-100 text-green-700" :
                        r.status === "expired" ? "bg-red-100 text-red-500" :
                        "bg-amber-100 text-amber-700"
                      }`}>{r.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}