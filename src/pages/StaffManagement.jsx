import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus, Users, Shield, ChevronDown, Loader2, Mail, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const ROLE_CONFIG = {
  super_admin: { label: "Super Admin", color: "bg-purple-100 text-purple-700 border-purple-200", icon: "👑", description: "Full app access + staff management. Cannot be changed by anyone else." },
  admin:       { label: "Admin",       color: "bg-red-100 text-red-700 border-red-200",         icon: "🔴", description: "Full access to all app features & functionality management." },
  manager:     { label: "Manager",     color: "bg-blue-100 text-blue-700 border-blue-200",      icon: "📊", description: "POS + Analytics + Redemptions." },
  cashier:     { label: "Cashier",     color: "bg-green-100 text-green-700 border-green-200",   icon: "🧾", description: "POS terminal access only." },
  user:        { label: "Customer",    color: "bg-gray-100 text-gray-600 border-gray-200",      icon: "👤", description: "Regular app user." },
};

const DEFAULT_MATRIX = [
  { feature: "POS Terminal",          key: "pos",          cashier: true,  manager: true,  admin: true,  super_admin: true },
  { feature: "Product Management",    key: "products",     cashier: false, manager: true,  admin: true,  super_admin: true },
  { feature: "Analytics Dashboard",   key: "analytics",    cashier: false, manager: true,  admin: true,  super_admin: true },
  { feature: "Rewards & Redemptions", key: "rewards",      cashier: false, manager: true,  admin: true,  super_admin: true },
  { feature: "Expenses & Inventory",  key: "expenses",     cashier: false, manager: false, admin: true,  super_admin: true },
  { feature: "Flash Drops",           key: "flashdrops",   cashier: false, manager: false, admin: true,  super_admin: true },
  { feature: "WhatsApp Campaigns",    key: "whatsapp",     cashier: false, manager: false, admin: true,  super_admin: true },
  { feature: "Staff Management",      key: "staff",        cashier: false, manager: false, admin: false, super_admin: true },
];

const MATRIX_STORAGE_KEY = "bean_access_matrix";

function loadMatrix() {
  try {
    const saved = localStorage.getItem(MATRIX_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with default to catch any new features added
      return DEFAULT_MATRIX.map(def => parsed.find(r => r.key === def.key) || def);
    }
  } catch {}
  return DEFAULT_MATRIX;
}

export default function StaffManagement() {
  const [user, setUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("cashier");
  const [isInviting, setIsInviting] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [matrix, setMatrix] = useState(loadMatrix);
  const [matrixDirty, setMatrixDirty] = useState(false);
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
    enabled: !!user,
    refetchInterval: 10000,
  });

  const staffUsers = allUsers.filter(u => ["cashier", "manager", "super_admin", "admin"].includes(u.role));
  // Also show regular users who were recently invited (so admin can assign their role)
  const pendingUsers = allUsers.filter(u => u.role === "user");
  const roleCounts = staffUsers.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});

  // Invite fix: Base44 inviteUser only accepts "user" or "admin"
  // We invite as "user", then immediately update role once they appear
  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error("Please enter an email"); return; }
    setIsInviting(true);
    try {
      // Base44 only supports "user" or "admin" roles for inviteUser
      const base44Role = inviteRole === "admin" || inviteRole === "super_admin" ? "admin" : "user";
      await base44.users.inviteUser(inviteEmail.trim(), base44Role);
      toast.success(
        `✅ Invite sent to ${inviteEmail}! Once they sign up, assign them the ${ROLE_CONFIG[inviteRole].label} role from the staff list below.`,
        { duration: 6000 }
      );
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["all-staff-users"] });
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Failed to send invite");
    }
    setIsInviting(false);
  };

  const canChangeRole = (targetUser) => {
    // No one can change a super_admin's role except another super_admin
    if (targetUser.role === "super_admin" && user.role !== "super_admin") return false;
    // Can't change your own role
    if (targetUser.email === user.email) return false;
    return true;
  };

  const handleRoleChange = async (targetUser, newRole) => {
    if (!canChangeRole(targetUser)) {
      toast.error("You cannot change this user's role.");
      return;
    }
    // Prevent assigning super_admin unless you are super_admin
    if (newRole === "super_admin" && user.role !== "super_admin") {
      toast.error("Only a Super Admin can grant Super Admin access.");
      return;
    }
    await base44.entities.User.update(targetUser.id, { role: newRole });
    queryClient.invalidateQueries({ queryKey: ["all-staff-users"] });
    toast.success(`Role updated to ${ROLE_CONFIG[newRole]?.label || newRole}`);
  };

  const toggleMatrixCell = (featureKey, role) => {
    // super_admin column is always true and locked
    if (role === "super_admin") return;
    // Staff Management for admin is locked (only super_admin)
    if (featureKey === "staff" && role !== "super_admin") return;

    setMatrix(prev => prev.map(row =>
      row.key === featureKey ? { ...row, [role]: !row[role] } : row
    ));
    setMatrixDirty(true);
  };

  const saveMatrix = () => {
    localStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(matrix));
    setMatrixDirty(false);
    toast.success("Access matrix saved!");
  };

  const resetMatrix = () => {
    setMatrix(DEFAULT_MATRIX);
    localStorage.removeItem(MATRIX_STORAGE_KEY);
    setMatrixDirty(false);
    toast.success("Access matrix reset to defaults");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white">
        <div className="max-w-4xl mx-auto px-5 pt-8 pb-6">
          <Link to="/StaffPortal" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-4 mb-5">
            <div className="bg-white/15 rounded-2xl p-3"><Users className="h-7 w-7" /></div>
            <div>
              <h1 className="text-2xl font-bold">Staff Management</h1>
              <p className="text-white/70 text-sm">Invite team members & manage access roles</p>
            </div>
          </div>
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

        {/* Invite */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm">
          <h2 className="font-bold text-[#5C4A3A] mb-1 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#8B7355]" /> Invite New Staff Member
          </h2>
          <p className="text-xs text-[#8B7355] mb-4">Send them the Staff Portal link below — they sign up there directly and land on the staff portal (not the customer app).</p>
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
              <option value="admin">🔴 Admin</option>
              {user.role === "super_admin" && <option value="super_admin">👑 Super Admin</option>}
            </select>
          </div>
          {inviteRole && (
            <p className="text-xs text-[#8B7355] mt-2">
              <span className="font-semibold">{ROLE_CONFIG[inviteRole]?.icon} {ROLE_CONFIG[inviteRole]?.label}:</span> {ROLE_CONFIG[inviteRole]?.description}
            </p>
          )}
          <Button onClick={handleInvite} disabled={isInviting} className="mt-3 bg-[#8B7355] hover:bg-[#6B5744] rounded-xl gap-2">
            {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send Invite
          </Button>
        </div>

        {/* Current Staff */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm">
          <h2 className="font-bold text-[#5C4A3A] mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#8B7355]" /> Current Staff
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" /></div>
          ) : staffUsers.length === 0 && pendingUsers.length === 0 ? (
            <p className="text-center text-[#8B7355] py-8">No staff members yet.</p>
          ) : (
            <div className="space-y-3">
              {staffUsers.map(u => {
                const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.user;
                const isSelf = u.email === user.email;
                const locked = !canChangeRole(u);
                return (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-2xl bg-[#F9F6F3]">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#5C4A3A] text-sm">{u.full_name || "—"}</p>
                        {isSelf && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">You</span>}
                        {u.role === "super_admin" && !isSelf && <Lock className="h-3 w-3 text-purple-400" />}
                      </div>
                      <p className="text-xs text-[#8B7355] truncate">{u.email}</p>
                    </div>
                    {locked ? (
                      <Badge className={`${cfg.color} border text-xs`}>{cfg.icon} {cfg.label}</Badge>
                    ) : (
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u, e.target.value)}
                        className="text-xs border border-[#E8DED8] rounded-lg px-2 py-1 bg-white text-[#5C4A3A] focus:outline-none"
                      >
                        <option value="cashier">🧾 Cashier</option>
                        <option value="manager">📊 Manager</option>
                        <option value="admin">🔴 Admin</option>
                        {user.role === "super_admin" && <option value="super_admin">👑 Super Admin</option>}
                        <option value="user">👤 Remove Staff Access</option>
                      </select>
                    )}
                  </div>
                );
              })}
              {/* Pending users — invited but not yet assigned a staff role */}
              {pendingUsers.length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-2 pb-1">
                    <div className="h-px flex-1 bg-[#E8DED8]" />
                    <span className="text-xs text-[#C9B8A6] font-medium">Awaiting Role Assignment</span>
                    <div className="h-px flex-1 bg-[#E8DED8]" />
                  </div>
                  {pendingUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#5C4A3A] text-sm">{u.full_name || "—"}</p>
                        <p className="text-xs text-[#8B7355] truncate">{u.email}</p>
                        <p className="text-xs text-amber-600 font-medium mt-0.5">⏳ No staff role yet — assign below</p>
                      </div>
                      <select
                        defaultValue=""
                        onChange={e => e.target.value && handleRoleChange(u, e.target.value)}
                        className="text-xs border border-amber-300 rounded-lg px-2 py-1 bg-white text-[#5C4A3A] focus:outline-none"
                      >
                        <option value="" disabled>Assign role…</option>
                        <option value="cashier">🧾 Cashier</option>
                        <option value="manager">📊 Manager</option>
                        <option value="admin">🔴 Admin</option>
                        {user.role === "super_admin" && <option value="super_admin">👑 Super Admin</option>}
                      </select>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Editable Access Matrix */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] shadow-sm overflow-hidden">
          <button
            onClick={() => setShowMatrix(v => !v)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-[#F9F6F3] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#8B7355]" />
              <h2 className="font-bold text-[#5C4A3A]">Role Access Matrix</h2>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Editable</span>
              {matrixDirty && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Unsaved changes</span>}
            </div>
            <ChevronDown className={`h-4 w-4 text-[#C9B8A6] transition-transform ${showMatrix ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {showMatrix && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-6 pb-6 overflow-x-auto">
                  <p className="text-xs text-[#8B7355] mb-3">Click ✓/✗ to toggle access. Super Admin column is always locked. Changes are saved locally.</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E8DED8]">
                        <th className="text-left pb-3 text-[#8B7355] font-medium w-48">Feature</th>
                        <th className="text-center pb-3 text-green-600 font-medium">Cashier</th>
                        <th className="text-center pb-3 text-blue-600 font-medium">Manager</th>
                        <th className="text-center pb-3 text-red-600 font-medium">Admin</th>
                        <th className="text-center pb-3 text-purple-600 font-medium">Super Admin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.map((row) => {
                        const isLocked = (role) => role === "super_admin" || row.key === "staff";
                        return (
                          <tr key={row.key} className="border-b border-[#F5EBE8] last:border-0">
                            <td className="py-2.5 text-[#5C4A3A] font-medium">{row.feature}</td>
                            {["cashier", "manager", "admin", "super_admin"].map(role => (
                              <td key={role} className="py-2.5 text-center">
                                <button
                                  onClick={() => toggleMatrixCell(row.key, role)}
                                  disabled={isLocked(role)}
                                  className={`text-xl transition-transform ${isLocked(role) ? "opacity-50 cursor-not-allowed" : "hover:scale-125 cursor-pointer"}`}
                                >
                                  {row[role] ? "✅" : "❌"}
                                </button>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="flex gap-3 mt-4">
                    <Button onClick={saveMatrix} disabled={!matrixDirty} className="bg-[#8B7355] hover:bg-[#6B5744] rounded-xl text-sm">
                      Save Changes
                    </Button>
                    <Button onClick={resetMatrix} variant="outline" className="rounded-xl text-sm border-[#E8DED8]">
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Role descriptions */}
        <div className="grid md:grid-cols-2 gap-3">
          {["super_admin", "admin", "manager", "cashier"].map(role => {
            const cfg = ROLE_CONFIG[role];
            return (
              <div key={role} className="bg-white rounded-2xl border border-[#E8DED8] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{cfg.icon}</span>
                  <span className="font-bold text-[#5C4A3A]">{cfg.label}</span>
                  {role === "super_admin" && <Lock className="h-3.5 w-3.5 text-purple-400" />}
                </div>
                <p className="text-xs text-[#8B7355]">{cfg.description}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <p className="font-bold mb-2">📋 How to onboard staff</p>
          <ol className="list-decimal ml-4 space-y-1 text-xs">
            <li>Enter their email above and click <strong>Send Invite</strong></li>
            <li>Share the <strong>Staff Portal URL</strong> below with the new member</li>
            <li>They open that link, sign up / sign in — they land on the <strong>Staff Portal</strong> (not the customer app)</li>
            <li>Once they appear in the <strong>Current Staff</strong> list below, assign their role</li>
            <li>They tap Refresh on their screen and get full access</li>
          </ol>
          <div className="mt-3 flex items-center gap-2 bg-white border border-amber-300 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-amber-900">Staff Sign-up URL:</span>
            <code className="text-xs text-amber-700 flex-1">{window.location.origin}/staff</code>
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.origin + "/staff"); toast.success("Copied!"); }}
              className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-lg hover:bg-amber-600"
            >Copy</button>
          </div>
          <p className="text-xs text-amber-700 mt-2">⚠️ Make sure new staff use this link — <strong>not</strong> the default app link — so they don't land on the customer welcome page.</p>
        </div>
      </div>
    </div>
  );
}