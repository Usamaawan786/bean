import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus, Users, Shield, Coffee, ChevronDown, Loader2, Mail, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const ROLE_CONFIG = {
  super_admin: {
    label: "Super Admin",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: "👑",
    description: "Full access to all features including staff management"
  },
  admin: {
    label: "Admin",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: "🔴",
    description: "Full administrative access"
  },
  manager: {
    label: "Manager",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: "📊",
    description: "POS + Analytics + Redemptions"
  },
  cashier: {
    label: "Cashier",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: "🧾",
    description: "POS terminal access only"
  },
  user: {
    label: "Customer",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: "👤",
    description: "Regular app user"
  }
};

const ACCESS_MATRIX = [
  { feature: "POS Terminal", cashier: true, manager: true, admin: true, super_admin: true },
  { feature: "Product Management", cashier: false, manager: true, admin: true, super_admin: true },
  { feature: "Analytics Dashboard", cashier: false, manager: true, admin: true, super_admin: true },
  { feature: "Rewards & Redemptions", cashier: false, manager: true, admin: true, super_admin: true },
  { feature: "Expenses & Inventory", cashier: false, manager: false, admin: true, super_admin: true },
  { feature: "Flash Drops", cashier: false, manager: false, admin: true, super_admin: true },
  { feature: "WhatsApp Campaigns", cashier: false, manager: false, admin: true, super_admin: true },
  { feature: "Staff Management", cashier: false, manager: false, admin: false, super_admin: true },
];

export default function StaffManagement() {
  const [user, setUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("cashier");
  const [isInviting, setIsInviting] = useState(false);
  const [showAccessMatrix, setShowAccessMatrix] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!["admin", "super_admin"].includes(u?.role)) {
        window.location.href = "/";
        return;
      }
      setUser(u);
    });
  }, []);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["all-staff-users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user
  });

  const staffUsers = allUsers.filter(u => ["cashier", "manager", "super_admin", "admin"].includes(u.role));
  const roleCounts = staffUsers.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error("Please enter an email"); return; }
    setIsInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      toast.success(`✅ Invite sent to ${inviteEmail} as ${ROLE_CONFIG[inviteRole].label}`);
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["all-staff-users"] });
    } catch (e) {
      toast.error(e.message || "Failed to send invite");
    }
    setIsInviting(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    await base44.entities.User.update(userId, { role: newRole });
    queryClient.invalidateQueries({ queryKey: ["all-staff-users"] });
    toast.success("Role updated successfully");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white">
        <div className="max-w-4xl mx-auto px-5 pt-8 pb-6">
          <Link to="/AdminPOS" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-4 mb-5">
            <div className="bg-white/15 rounded-2xl p-3"><Users className="h-7 w-7" /></div>
            <div>
              <h1 className="text-2xl font-bold">Staff Management</h1>
              <p className="text-white/70 text-sm">Invite team members & manage access</p>
            </div>
          </div>
          {/* Role Count Badges */}
          <div className="flex gap-3 flex-wrap">
            {["cashier", "manager", "admin", "super_admin"].map(role => (
              <div key={role} className="bg-white/10 rounded-xl px-3 py-2 text-center">
                <div className="text-lg font-bold">{roleCounts[role] || 0}</div>
                <div className="text-xs text-white/70">{ROLE_CONFIG[role].label}s</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 pb-20 space-y-6">

        {/* Invite New Staff */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm">
          <h2 className="font-bold text-[#5C4A3A] mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#8B7355]" /> Invite New Staff Member
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder="staff@email.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleInvite()}
                className="border-[#E8DED8]"
              />
            </div>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="border border-[#E8DED8] rounded-xl px-3 py-2 text-sm bg-white text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            >
              <option value="cashier">🧾 Cashier</option>
              <option value="manager">📊 Manager</option>
              {user.role === "super_admin" && <option value="admin">🔴 Admin</option>}
              {user.role === "super_admin" && <option value="super_admin">👑 Super Admin</option>}
            </select>
          </div>
          {inviteRole && (
            <p className="text-xs text-[#8B7355] mt-2">
              <span className="font-semibold">{ROLE_CONFIG[inviteRole]?.icon} {ROLE_CONFIG[inviteRole]?.label}:</span> {ROLE_CONFIG[inviteRole]?.description}
            </p>
          )}
          <Button
            onClick={handleInvite}
            disabled={isInviting}
            className="mt-3 bg-[#8B7355] hover:bg-[#6B5744] rounded-xl gap-2"
          >
            {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send Invite
          </Button>
        </div>

        {/* Access Matrix */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] shadow-sm overflow-hidden">
          <button
            onClick={() => setShowAccessMatrix(v => !v)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-[#F9F6F3] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#8B7355]" />
              <h2 className="font-bold text-[#5C4A3A]">Role Access Matrix</h2>
            </div>
            <ChevronDown className={`h-4 w-4 text-[#C9B8A6] transition-transform ${showAccessMatrix ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {showAccessMatrix && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-6 pb-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E8DED8]">
                        <th className="text-left pb-3 text-[#8B7355] font-medium">Feature</th>
                        <th className="text-center pb-3 text-green-600 font-medium">Cashier</th>
                        <th className="text-center pb-3 text-blue-600 font-medium">Manager</th>
                        <th className="text-center pb-3 text-red-600 font-medium">Admin</th>
                        <th className="text-center pb-3 text-purple-600 font-medium">Super Admin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ACCESS_MATRIX.map((row, i) => (
                        <tr key={i} className="border-b border-[#F5EBE8] last:border-0">
                          <td className="py-2.5 text-[#5C4A3A] font-medium">{row.feature}</td>
                          {["cashier", "manager", "admin", "super_admin"].map(role => (
                            <td key={role} className="py-2.5 text-center">
                              {row[role] ? (
                                <span className="text-green-500 text-lg">✓</span>
                              ) : (
                                <span className="text-gray-300 text-lg">✗</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Current Staff List */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm">
          <h2 className="font-bold text-[#5C4A3A] mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#8B7355]" /> Current Staff
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" /></div>
          ) : staffUsers.length === 0 ? (
            <p className="text-center text-[#8B7355] py-8">No staff members yet. Invite someone above!</p>
          ) : (
            <div className="space-y-3">
              {staffUsers.map(u => {
                const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.user;
                return (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-2xl bg-[#F9F6F3]">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#5C4A3A] text-sm">{u.full_name || "—"}</p>
                      <p className="text-xs text-[#8B7355] truncate">{u.email}</p>
                    </div>
                    {/* Only allow changing roles of non-self users */}
                    {u.email !== user.email ? (
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="text-xs border border-[#E8DED8] rounded-lg px-2 py-1 bg-white text-[#5C4A3A] focus:outline-none"
                      >
                        <option value="cashier">🧾 Cashier</option>
                        <option value="manager">📊 Manager</option>
                        <option value="admin">🔴 Admin</option>
                        {user.role === "super_admin" && <option value="super_admin">👑 Super Admin</option>}
                        <option value="user">👤 Customer</option>
                      </select>
                    ) : (
                      <Badge className={`${cfg.color} border text-xs`}>{cfg.icon} {cfg.label} (You)</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Staff Portal Link Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <p className="font-bold mb-1">📋 How Staff Log In</p>
          <p>Invite staff via the form above — they'll receive an email to set their password. Once logged in, they'll be redirected to the <strong>Staff Portal</strong> (<code>/StaffPortal</code>) which shows only the features their role permits. <strong>You never need to share your personal login.</strong></p>
        </div>
      </div>
    </div>
  );
}