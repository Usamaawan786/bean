import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, UserCheck, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import AppHeader from "@/components/shared/AppHeader";
import { Badge } from "@/components/ui/badge";

export default function CustomerDirectory() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (!["admin", "super_admin", "manager"].includes(u?.role)) {
        window.location.href = "/StaffPortal";
        return;
      }
      setUser(u);
    });
  }, []);

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["directory-customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 1000),
    enabled: !!user,
  });

  const { data: waitlist = [], isLoading: loadingWaitlist } = useQuery({
    queryKey: ["directory-waitlist"],
    queryFn: () => base44.entities.WaitlistSignup.list("-created_date", 1000),
    enabled: !!user,
  });

  const records = useMemo(() => {
    const fromCustomers = customers.map((c) => ({
      id: `customer-${c.id}`,
      type: "customer",
      name: c.display_name || c.created_by || "Unknown",
      phone: c.phone || "",
      email: c.user_email || c.created_by || "",
      tier: c.tier,
      created_date: c.created_date,
    }));
    const fromWaitlist = waitlist.map((w) => ({
      id: `waitlist-${w.id}`,
      type: "waitlist",
      name: w.full_name || "Unknown",
      phone: w.phone || "",
      email: w.email || "",
      tier: null,
      created_date: w.created_date,
    }));
    return [...fromCustomers, ...fromWaitlist].sort(
      (a, b) => new Date(b.created_date) - new Date(a.created_date)
    );
  }, [customers, waitlist]);

  const filtered = useMemo(() => {
    return records
      .filter((r) => (tab === "all" ? true : r.type === tab))
      .filter((r) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return r.name.toLowerCase().includes(q) || (r.phone || "").toLowerCase().includes(q);
      });
  }, [records, tab, search]);

  const isLoading = loadingCustomers || loadingWaitlist;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED] dark:bg-[var(--bg-primary)] pb-20">
      <AppHeader
        title="Customer Directory"
        subtitle="Search all registered customers & waitlist leads"
        icon={Users}
        backTo="AdminDashboard"
      />

      <div className="max-w-5xl mx-auto px-4 -mt-4">
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[#E8DED8] dark:border-[var(--border-light)] p-4 text-center">
            <div className="text-2xl font-bold text-[#5C4A3A] dark:text-[var(--text-primary)]">{records.length}</div>
            <div className="text-xs text-[#8B7355] dark:text-[var(--text-secondary)]">Total Records</div>
          </div>
          <div className="bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[#E8DED8] dark:border-[var(--border-light)] p-4 text-center">
            <div className="text-2xl font-bold text-[#5C4A3A] dark:text-[var(--text-primary)]">{customers.length}</div>
            <div className="text-xs text-[#8B7355] dark:text-[var(--text-secondary)]">Registered Customers</div>
          </div>
          <div className="bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[#E8DED8] dark:border-[var(--border-light)] p-4 text-center">
            <div className="text-2xl font-bold text-[#5C4A3A] dark:text-[var(--text-primary)]">{waitlist.length}</div>
            <div className="text-xs text-[#8B7355] dark:text-[var(--text-secondary)]">Waitlist Leads</div>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone number..."
              className="w-full border border-[#E8DED8] dark:border-[var(--border-light)] rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-[var(--bg-card)] text-[#5C4A3A] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            />
          </div>
          <div className="flex gap-2">
            {[
              { id: "all", label: "All", icon: Users },
              { id: "customer", label: "Customers", icon: UserCheck },
              { id: "waitlist", label: "Waitlist", icon: Clock },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTab(f.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  tab === f.id
                    ? "bg-[#5C4A3A] text-white"
                    : "bg-white dark:bg-[var(--bg-card)] border border-[#E8DED8] dark:border-[var(--border-light)] text-[#8B7355] dark:text-[var(--text-secondary)] hover:bg-[#F5EBE8]"
                }`}
              >
                <f.icon className="h-3.5 w-3.5" /> {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-[#8B7355]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl border border-[#E8DED8] dark:border-[var(--border-light)] p-12 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-[#C9B8A6]" />
            <p className="text-[#8B7355] dark:text-[var(--text-secondary)] font-medium">No records found</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl border border-[#E8DED8] dark:border-[var(--border-light)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8DED8] dark:border-[var(--border-light)] text-left bg-[#F9F6F3] dark:bg-[var(--bg-elevated)]">
                    <th className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)] font-medium">Name</th>
                    <th className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)] font-medium">Phone</th>
                    <th className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)] font-medium">Tier</th>
                    <th className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)] font-medium">Type</th>
                    <th className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)] font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-[#F5EBE8] dark:border-[var(--border-light)] last:border-0 hover:bg-[#F9F6F3] dark:hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#5C4A3A] dark:text-[var(--text-primary)]">{r.name}</td>
                      <td className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)]">{r.phone || "—"}</td>
                      <td className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)]">{r.tier || "—"}</td>
                      <td className="py-3 px-4">
                        <Badge className={`${r.type === "customer" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"} border text-xs`}>
                          {r.type === "customer" ? "Customer" : "Waitlist"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)] whitespace-nowrap">
                        {format(new Date(r.created_date), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}