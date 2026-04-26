import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Search, Users, Filter, RefreshCw, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import UserListCard from "@/components/admin/users/UserListCard";
import UserDetailDrawer from "@/components/admin/users/UserDetailDrawer";

const TIER_FILTERS = ["All", "Bronze", "Silver", "Gold", "Platinum"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "points_high", label: "Most Points" },
  { value: "points_low", label: "Least Points" },
  { value: "spend_high", label: "Highest Spend" },
];

export default function AdminAppUsers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedUser, setSelectedUser] = useState(null);

  // Auth guard
  useEffect(() => {
    base44.auth.me().then(u => {
      if (!["admin", "super_admin", "manager"].includes(u?.role)) {
        navigate("/");
      }
    });
  }, []);

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-app-users"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500),
    refetchInterval: 30000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["admin-user-list"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
  });

  const { data: deviceTokens = [] } = useQuery({
    queryKey: ["admin-device-tokens"],
    queryFn: () => base44.entities.DeviceToken.filter({ is_active: true }),
  });

  // Map users by email for quick lookup
  const userByEmail = {};
  allUsers.forEach(u => { userByEmail[u.email] = u; });

  const deviceEmailSet = new Set(deviceTokens.map(d => d.user_email));

  // Filter + sort
  let filtered = customers.filter(c => {
    const email = c.user_email || c.created_by || "";
    const name = c.display_name || userByEmail[email]?.full_name || "";
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || email.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === "All" || c.tier === tierFilter;
    return matchSearch && matchTier;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.created_date) - new Date(a.created_date);
    if (sortBy === "oldest") return new Date(a.created_date) - new Date(b.created_date);
    if (sortBy === "points_high") return (b.points_balance || 0) - (a.points_balance || 0);
    if (sortBy === "points_low") return (a.points_balance || 0) - (b.points_balance || 0);
    if (sortBy === "spend_high") return (b.total_spend_pkr || 0) - (a.total_spend_pkr || 0);
    return 0;
  });

  function normalizePhone(phone) {
    let p = (phone || '').trim();
    if (p.startsWith('0')) return '+92' + p.slice(1);
    if (p.startsWith('92') && !p.startsWith('+')) return '+' + p;
    return p;
  }

  function exportCSV() {
    const rows = customers.map(c => {
      const email = c.user_email || c.created_by || '';
      const u = userByEmail[email] || {};
      const fullName = c.display_name || u.full_name || '';
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const phone = normalizePhone(c.phone || u.phone || '');
      return [
        firstName,
        lastName,
        email,
        phone,
        c.tier || 'Bronze',
        c.points_balance || 0,
        c.total_spend_pkr || 0,
        c.is_founding_member ? 'Yes' : 'No',
        c.is_eba ? 'Yes' : 'No',
        c.referral_code || '',
        c.created_date ? format(new Date(c.created_date), 'yyyy-MM-dd') : '',
      ];
    });

    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Tier', 'Points Balance', 'Total Spend (PKR)', 'Founding Member', 'EBA', 'Referral Code', 'Joined Date'];
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bean-app-users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Summary stats
  const totalUsers = customers.length;
  const activeDevices = deviceTokens.length;
  const totalPoints = customers.reduce((s, c) => s + (c.points_balance || 0), 0);
  const foundingMembers = customers.filter(c => c.is_founding_member).length;

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#5C4A3A] to-[#8B7355] text-white px-5 pt-10 pb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/70 text-sm mb-4 hover:text-white transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold">App Users</h1>
            <p className="text-white/70 text-sm mt-0.5">Complete customer intelligence dashboard</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button onClick={() => refetch()} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Users", value: totalUsers },
            { label: "Active Devices", value: activeDevices },
            { label: "Total Points", value: totalPoints.toLocaleString() },
            { label: "Founding Members", value: foundingMembers },
          ].map(stat => (
            <div key={stat.label} className="bg-white/10 rounded-2xl p-3 text-center">
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-xs text-white/60 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 space-y-2 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 bg-white"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {TIER_FILTERS.map(t => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                tierFilter === t ? "bg-[#8B7355] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">{filtered.length} of {totalUsers} users</p>
      </div>

      {/* User List */}
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-2 pb-24">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No users found</p>
          </div>
        ) : (
          filtered.map((customer, i) => {
            const email = customer.user_email || customer.created_by;
            const userRecord = userByEmail[email];
            const hasDevice = deviceEmailSet.has(email);
            return (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <UserListCard
                  customer={customer}
                  userRecord={userRecord}
                  hasDevice={hasDevice}
                  onClick={() => setSelectedUser({ customer, userRecord })}
                />
              </motion.div>
            );
          })
        )}
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedUser && (
          <UserDetailDrawer
            customer={selectedUser.customer}
            userRecord={selectedUser.userRecord}
            deviceTokens={deviceTokens.filter(d => d.user_email === (selectedUser.customer.user_email || selectedUser.customer.created_by))}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}