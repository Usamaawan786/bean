import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, Loader2 } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import AppHeader from "@/components/shared/AppHeader";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const TIER_COLORS = { Bronze: "#B08D57", Silver: "#A9A9A9", Gold: "#D4AF37", Platinum: "#8E9AAF" };
const STATUS_COLORS = { pending: "#D4AF37", claimed: "#4CAF50", expired: "#B0413E" };

export default function RewardAnalytics() {
  const [user, setUser] = useState(null);

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
    queryKey: ["analytics-customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 1000),
    enabled: !!user,
  });

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ["analytics-activities"],
    queryFn: () => base44.entities.Activity.filter({ action_type: "points_earned" }, "-created_date", 1000),
    enabled: !!user,
  });

  const { data: redemptions = [], isLoading: loadingRedemptions } = useQuery({
    queryKey: ["analytics-redemptions"],
    queryFn: () => base44.entities.Redemption.list("-created_date", 1000),
    enabled: !!user,
  });

  const pointsTrend = useMemo(() => {
    const days = Array.from({ length: 14 }).map((_, i) => startOfDay(subDays(new Date(), 13 - i)));
    return days.map((day) => {
      const dayKey = format(day, "MMM d");
      const total = activities
        .filter((a) => startOfDay(new Date(a.created_date)).getTime() === day.getTime())
        .reduce((s, a) => s + (a.points_amount || 0), 0);
      return { date: dayKey, points: total };
    });
  }, [activities]);

  const redemptionsTrend = useMemo(() => {
    const days = Array.from({ length: 14 }).map((_, i) => startOfDay(subDays(new Date(), 13 - i)));
    return days.map((day) => {
      const dayKey = format(day, "MMM d");
      const count = redemptions.filter(
        (r) => startOfDay(new Date(r.created_date)).getTime() === day.getTime()
      ).length;
      return { date: dayKey, redemptions: count };
    });
  }, [redemptions]);

  const tierBreakdown = useMemo(() => {
    const counts = { Bronze: 0, Silver: 0, Gold: 0, Platinum: 0 };
    customers.forEach((c) => {
      if (counts[c.tier] !== undefined) counts[c.tier]++;
    });
    return Object.entries(counts).map(([tier, value]) => ({ name: tier, value }));
  }, [customers]);

  const redemptionStatusBreakdown = useMemo(() => {
    const counts = { pending: 0, claimed: 0, expired: 0 };
    redemptions.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return Object.entries(counts).map(([status, value]) => ({ name: status, value }));
  }, [redemptions]);

  const totalPointsEarned = activities.reduce((s, a) => s + (a.points_amount || 0), 0);
  const totalPointsBalance = customers.reduce((s, c) => s + (c.points_balance || 0), 0);
  const isLoading = loadingCustomers || loadingActivities || loadingRedemptions;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED] dark:bg-[var(--bg-primary)] pb-20">
      <AppHeader
        title="Reward Analytics"
        subtitle="Points, tiers, and redemption trends"
        icon={BarChart2}
        backTo="AdminDashboard"
      />

      <div className="max-w-5xl mx-auto px-4 -mt-4 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Points Earned", value: totalPointsEarned.toLocaleString() },
            { label: "Outstanding Points Balance", value: totalPointsBalance.toLocaleString() },
            { label: "Total Members", value: customers.length },
            { label: "Total Redemptions", value: redemptions.length },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[#E8DED8] dark:border-[var(--border-light)] p-4 text-center">
              <div className="text-xl font-bold text-[#5C4A3A] dark:text-[var(--text-primary)]">{s.value}</div>
              <div className="text-xs text-[#8B7355] dark:text-[var(--text-secondary)]">{s.label}</div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-[#8B7355]" />
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl border border-[#E8DED8] dark:border-[var(--border-light)] p-5">
              <h2 className="font-bold text-[#5C4A3A] dark:text-[var(--text-primary)] mb-4">Points Earned — Last 14 Days</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={pointsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DED8" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="points" stroke="#8B7355" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl border border-[#E8DED8] dark:border-[var(--border-light)] p-5">
                <h2 className="font-bold text-[#5C4A3A] dark:text-[var(--text-primary)] mb-4">Active Loyalty Tiers</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={tierBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {tierBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={TIER_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl border border-[#E8DED8] dark:border-[var(--border-light)] p-5">
                <h2 className="font-bold text-[#5C4A3A] dark:text-[var(--text-primary)] mb-4">Redemption Status</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={redemptionStatusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {redemptionStatusBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl border border-[#E8DED8] dark:border-[var(--border-light)] p-5">
              <h2 className="font-bold text-[#5C4A3A] dark:text-[var(--text-primary)] mb-4">Redemptions — Last 14 Days</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={redemptionsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DED8" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="redemptions" fill="#8B7355" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}