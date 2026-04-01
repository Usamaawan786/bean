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
      // Regular customers should not be here
      if (!u || u.role === "user") {
        window.location.href = "/Home";
        return;
      }
      setUser(u);
      setLoading(false);
    }).catch(() => {
      base44.auth.redirectToLogin(window.location.href);
    });
  }, []);

  const handleLogout = () => base44.auth.logout("/");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#D4C4B0] border-t-[#8B7355] rounded-full animate-spin" />
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