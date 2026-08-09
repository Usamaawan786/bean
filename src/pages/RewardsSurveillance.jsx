import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Star, Gift, Zap, Activity, AlertTriangle, Loader2, BarChart3, ScanLine, Repeat, Pencil, Clock } from "lucide-react";
import AppHeader from "@/components/shared/AppHeader";
import SurveillanceFilters from "@/components/surveillance/SurveillanceFilters";
import PointsEarningTable from "@/components/surveillance/PointsEarningTable";
import RedemptionTable from "@/components/surveillance/RedemptionTable";
import FlashDropTable from "@/components/surveillance/FlashDropTable";
import ActivityTable from "@/components/surveillance/ActivityTable";
import AnomalyPanel, { detectAnomalies } from "@/components/surveillance/AnomalyPanel";
import PointsAdjustmentTable from "@/components/surveillance/PointsAdjustmentTable";
import ScanTimingPanel from "@/components/surveillance/ScanTimingPanel";
import ExpiredBillsPanel from "@/components/surveillance/ExpiredBillsPanel";
import SuspiciousActivityPanel from "@/components/surveillance/SuspiciousActivityPanel";

export default function RewardsSurveillance() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (!["admin", "super_admin", "manager"].includes(u?.role)) {
        window.location.href = "/StaffPortal";
        return;
      }
      setUser(u);
    });
  }, []);

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["surv-sales"], queryFn: () => base44.entities.StoreSale.list("-created_date", 1000), enabled: !!user,
  });
  const { data: redemptions = [], isLoading: loadingRed } = useQuery({
    queryKey: ["surv-redemptions"], queryFn: () => base44.entities.Redemption.list("-created_date", 1000), enabled: !!user,
  });
  const { data: claims = [], isLoading: loadingClaims } = useQuery({
    queryKey: ["surv-claims"], queryFn: () => base44.entities.FlashDropClaim.list("-created_date", 1000), enabled: !!user,
  });
  const { data: activities = [], isLoading: loadingAct } = useQuery({
    queryKey: ["surv-activities"], queryFn: () => base44.entities.Activity.list("-created_date", 1000), enabled: !!user,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["surv-customers"], queryFn: () => base44.entities.Customer.list("-created_date", 1000), enabled: !!user,
  });
  const { data: settingsList = [] } = useQuery({
    queryKey: ["surv-settings"], queryFn: () => base44.entities.RewardSettings.list(), enabled: !!user,
  });
  const { data: adjustments = [] } = useQuery({
    queryKey: ["surv-adjustments"], queryFn: () => base44.entities.PointsAdjustment.list("-created_date", 1000), enabled: !!user,
  });
  const pkrPerPoint = settingsList[0]?.pkr_per_point || 10;

  const inRange = (iso) => {
    if (!iso) return true;
    const d = new Date(iso);
    if (dateFrom) { const f = new Date(dateFrom + "T00:00:00+05:00"); if (d < f) return false; }
    if (dateTo) { const t = new Date(dateTo + "T23:59:59+05:00"); if (d > t) return false; }
    return true;
  };
  const matchesSearch = (...vals) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return vals.some((v) => v && String(v).toLowerCase().includes(q));
  };

  const fSales = useMemo(() => sales.filter((s) => inRange(s.created_date) && matchesSearch(s.bill_number, s.scanned_by, s.cashier_email, s.customer_name, s.customer_phone)), [sales, search, dateFrom, dateTo]);
  const fRedemptions = useMemo(() => redemptions.filter((r) => inRange(r.created_date) && matchesSearch(r.redemption_code, r.customer_email, r.reward_name)), [redemptions, search, dateFrom, dateTo]);
  const fClaims = useMemo(() => claims.filter((c) => inRange(c.created_date) && matchesSearch(c.user_email, c.drop_title, c.qr_code)), [claims, search, dateFrom, dateTo]);
  const fActivities = useMemo(() => activities.filter((a) => inRange(a.created_date) && matchesSearch(a.user_email, a.description, a.action_type)), [activities, search, dateFrom, dateTo]);
  const fAdjustments = useMemo(() => adjustments.filter((a) => inRange(a.adjusted_at || a.created_date) && matchesSearch(a.customer_email, a.reason, a.adjusted_by)), [adjustments, search, dateFrom, dateTo]);

  const scannedSales = fSales.filter((s) => s.is_scanned);
  const totalPointsEarned = fSales.reduce((s, r) => s + (r.points_awarded || 0), 0);
  const totalPointsRedeemed = fRedemptions.reduce((s, r) => s + (r.points_spent || 0), 0);
  const anomalies = useMemo(() => detectAnomalies({ sales, redemptions, customers, pkrPerPoint }), [sales, redemptions, customers, pkrPerPoint]);

  const clearFilters = () => { setSearch(""); setDateFrom(""); setDateTo(""); };

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "earnings", label: "Points Earned", icon: ScanLine, count: fSales.length },
    { id: "redemptions", label: "Redemptions", icon: Gift, count: fRedemptions.length },
    { id: "flashdrops", label: "Flash Drops", icon: Zap, count: fClaims.length },
    { id: "activity", label: "Activity Log", icon: Activity, count: fActivities.length },
    { id: "suspicious", label: "Suspicious Activity", icon: ShieldCheck, alert: true },
    { id: "expired", label: "Expired Bills", icon: Clock, count: fSales.filter((s) => !s.is_scanned && s.qr_expires_at && new Date(s.qr_expires_at) < new Date()).length },
    { id: "scan-timing", label: "Scan Timing", icon: Clock, count: fSales.filter((s) => s.is_scanned && s.scanned_at).length },
    { id: "adjustments", label: "Adjustments", icon: Pencil, count: fAdjustments.length },
    { id: "anomalies", label: "Anomalies", icon: AlertTriangle, count: anomalies.length, alert: anomalies.length },
  ];

  if (!user) return null;
  const loading = loadingSales || loadingRed || loadingClaims || loadingAct;

  return (
    <div className="min-h-screen bg-[#F5F1ED] pb-20">
      <AppHeader title="Rewards Surveillance Vault" subtitle="Full audit of points earning, claiming & redemption (PKT)" icon={ShieldCheck} backTo="AdminDashboard" />

      <div className="max-w-5xl mx-auto px-4 -mt-4 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: ScanLine, label: "Bills Scanned", value: scannedSales.length, color: "from-[#8B7355] to-[#6B5744]" },
            { icon: Star, label: "Points Earned", value: totalPointsEarned.toLocaleString(), color: "from-amber-500 to-amber-700" },
            { icon: Gift, label: "Points Redeemed", value: totalPointsRedeemed.toLocaleString(), color: "from-purple-500 to-purple-700" },
            { icon: AlertTriangle, label: "Anomalies", value: anomalies.length, color: anomalies.length ? "from-red-400 to-red-600" : "from-emerald-500 to-emerald-700" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white shadow`}>
                <Icon className="h-5 w-5 text-white/80 mb-2" />
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-white/70">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <SurveillanceFilters search={search} setSearch={setSearch} dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} onClear={clearFilters} />

        {/* Tabs */}
        <div className="bg-white border border-[#E8DED8] rounded-2xl p-1.5 flex gap-1 overflow-x-auto sticky top-2 z-10 shadow-sm">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${active ? "bg-[#5C4A3A] text-white shadow" : "text-[#8B7355] hover:bg-[#F5EBE8]"}`}>
                <Icon className="h-3.5 w-3.5" /> {t.label}
                {t.count != null && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${t.alert ? "bg-red-500 text-white" : active ? "bg-white/20" : "bg-[#F5EBE8] text-[#8B7355]"}`}>{t.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#8B7355]" /></div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-[#E8DED8] p-5">
                  <h3 className="font-bold text-[#5C4A3A] mb-3 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[#8B7355]" /> Snapshot (filtered range)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: "Bills Scanned", value: scannedSales.length },
                      { label: "Points Earned", value: totalPointsEarned.toLocaleString() },
                      { label: "Redemptions", value: fRedemptions.length },
                      { label: "Points Redeemed", value: totalPointsRedeemed.toLocaleString() },
                      { label: "Flash Drop Claims", value: fClaims.length },
                      { label: "Activity Events", value: fActivities.length },
                    ].map((x) => (
                      <div key={x.label} className="bg-[#F5F1ED] rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-[#5C4A3A]">{x.value}</div>
                        <div className="text-xs text-[#8B7355]">{x.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {anomalies.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-red-700 font-semibold mb-1"><AlertTriangle className="h-5 w-5" /> {anomalies.length} anomaly flag{anomalies.length > 1 ? "s" : ""} detected</div>
                    <p className="text-sm text-red-600">Review the Anomalies tab for cashier self-scans, balance inflation, points mismatches, and rapid redemptions.</p>
                    <button onClick={() => setActiveTab("anomalies")} className="mt-2 text-xs text-red-700 underline font-semibold">Review anomalies →</button>
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-[#5C4A3A] mb-2 flex items-center gap-2"><Activity className="h-5 w-5 text-[#8B7355]" /> Recent Activity</h3>
                  <ActivityTable activities={fActivities.slice(0, 8)} />
                </div>
              </div>
            )}
            {activeTab === "earnings" && <PointsEarningTable sales={fSales} pkrPerPoint={pkrPerPoint} />}
            {activeTab === "redemptions" && <RedemptionTable redemptions={fRedemptions} />}
            {activeTab === "flashdrops" && <FlashDropTable claims={fClaims} />}
            {activeTab === "activity" && <ActivityTable activities={fActivities} />}
            {activeTab === "suspicious" && <SuspiciousActivityPanel sales={fSales} adjustments={fAdjustments} anomalies={anomalies} />}
            {activeTab === "expired" && <ExpiredBillsPanel sales={fSales} />}
            {activeTab === "scan-timing" && <ScanTimingPanel sales={fSales} />}
            {activeTab === "adjustments" && <PointsAdjustmentTable adjustments={fAdjustments} />}
            {activeTab === "anomalies" && <AnomalyPanel sales={sales} redemptions={redemptions} customers={customers} pkrPerPoint={pkrPerPoint} />}
          </>
        )}
      </div>
    </div>
  );
}