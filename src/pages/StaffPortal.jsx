import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ShoppingCart, BarChart3, Gift, Package, Coffee, LogOut, Users } from "lucide-react";
import { motion } from "framer-motion";

const ROLE_FEATURES = {
  cashier: [
    { icon: ShoppingCart, label: "POS Terminal", desc: "Process sales & print bills", link: "/AdminPOS", color: "from-[#8B7355] to-[#6B5744]" },
  ],
  manager: [
    { icon: ShoppingCart, label: "POS Terminal", desc: "Process sales & print bills", link: "/AdminPOS", color: "from-[#8B7355] to-[#6B5744]" },
    { icon: BarChart3, label: "Analytics", desc: "View sales & revenue reports", link: "/AdminDashboard", color: "from-blue-600 to-blue-700" },
    { icon: Gift, label: "Redemptions", desc: "Verify reward codes & FM/EBA discounts", link: "/AdminRedemptions", color: "from-emerald-600 to-emerald-700" },
  ],
  admin: [
    { icon: ShoppingCart, label: "POS Terminal", desc: "Process sales & print bills", link: "/AdminPOS", color: "from-[#8B7355] to-[#6B5744]" },
    { icon: BarChart3, label: "Analytics", desc: "View sales & revenue reports", link: "/AdminDashboard", color: "from-blue-600 to-blue-700" },
    { icon: Gift, label: "Rewards & Redemptions", desc: "Manage rewards & verify codes", link: "/AdminRewardsRedemptions", color: "from-emerald-600 to-emerald-700" },
    { icon: Package, label: "Inventory", desc: "Manage stock levels", link: "/AdminInventory", color: "from-orange-600 to-orange-700" },
    { icon: Users, label: "Referrals", desc: "View referral activity", link: "/AdminReferrals", color: "from-purple-600 to-purple-700" },
  ],
  super_admin: [
    { icon: ShoppingCart, label: "POS Terminal", desc: "Process sales & print bills", link: "/AdminPOS", color: "from-[#8B7355] to-[#6B5744]" },
    { icon: BarChart3, label: "Analytics", desc: "View sales & revenue reports", link: "/AdminDashboard", color: "from-blue-600 to-blue-700" },
    { icon: Gift, label: "Rewards & Redemptions", desc: "Manage rewards & verify codes", link: "/AdminRewardsRedemptions", color: "from-emerald-600 to-emerald-700" },
    { icon: Package, label: "Inventory", desc: "Manage stock levels", link: "/AdminInventory", color: "from-orange-600 to-orange-700" },
    { icon: Users, label: "Staff Management", desc: "Invite & manage team access", link: "/StaffManagement", color: "from-purple-600 to-purple-700" },
  ],
};

const ROLE_LABELS = {
  cashier: { label: "Cashier", icon: "🧾" },
  manager: { label: "Manager", icon: "📊" },
  admin: { label: "Admin", icon: "🔴" },
  super_admin: { label: "Super Admin", icon: "👑" },
};

export default function StaffPortal() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u) {
        base44.auth.redirectToLogin("/StaffPortal");
        return;
      }
      setUser(u);
      setLoading(false);
    }).catch(() => {
      base44.auth.redirectToLogin("/StaffPortal");
    });
  }, []);

  const handleLogout = () => base44.auth.logout("/");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  // User is authenticated but has no staff role assigned yet
  if (!user || user.role === "user") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-5">
        <div className="w-20 h-20 bg-amber-400/10 border-2 border-amber-400/30 rounded-3xl flex items-center justify-center mb-6">
          <Coffee className="h-10 w-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold mb-3 text-center">No Staff Access Yet</h1>
        <p className="text-gray-400 text-sm text-center max-w-sm leading-relaxed mb-6">
          Your account <strong className="text-white">{user?.email}</strong> has been created but hasn't been assigned a staff role yet.
          <br /><br />
          Please ask your manager or admin to assign your role from the Staff Management dashboard.
        </p>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-center text-gray-400 mb-6 max-w-sm w-full">
          Once your role is assigned, refresh this page or sign in again.
        </div>
        <button
          onClick={() => window.location.reload()}
          className="bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold px-8 py-3 rounded-2xl text-sm mb-4"
        >
          Refresh
        </button>
        <button
          onClick={() => base44.auth.logout("/staff")}
          className="text-gray-500 hover:text-gray-300 text-xs underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  const features = ROLE_FEATURES[user?.role] || ROLE_FEATURES.cashier;
  const roleInfo = ROLE_LABELS[user?.role] || { label: "Staff", icon: "👤" };

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white">
        <div className="max-w-2xl mx-auto px-5 pt-10 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-lg">{user?.full_name || user?.email}</p>
                <p className="text-[#D4C4B0] text-sm">{roleInfo.icon} {roleInfo.label}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-sm transition-colors"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-[#D4C4B0]" />
            <h1 className="text-2xl font-bold">Bean Staff Portal</h1>
          </div>
          <p className="text-white/70 text-sm mt-1">Select a feature to get started</p>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="max-w-2xl mx-auto px-5 py-8 pb-20">
        <div className="grid gap-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link to={feature.link}>
                  <div className={`bg-gradient-to-r ${feature.color} text-white rounded-3xl p-6 flex items-center gap-5 shadow-lg hover:shadow-xl transition-shadow`}>
                    <div className="bg-white/20 rounded-2xl p-4 flex-shrink-0">
                      <Icon className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{feature.label}</h3>
                      <p className="text-white/80 text-sm mt-0.5">{feature.desc}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-[#C9B8A6] mt-8">
          Bean Coffee · Staff Portal · {roleInfo.icon} {roleInfo.label} Access
        </p>
      </div>
    </div>
  );
}