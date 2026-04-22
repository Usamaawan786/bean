import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Shield, AlertTriangle, TrendingDown, Receipt, Users,
  Search, Filter, ChevronDown, ChevronUp, Eye, Download, RefreshCw,
  Banknote, CreditCard, Clock, Star, Package, AlertCircle, CheckCircle,
  XCircle, BarChart3, Percent
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";

const ROLE_COLORS = {
  cashier: "bg-green-100 text-green-700 border-green-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  admin: "bg-red-100 text-red-700 border-red-200",
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
};

const FLAG_RULES = [
  { id: "high_discount", label: "High Discount (≥20%)", check: (s) => (s.discount_pct || 0) >= 20, color: "text-red-600", bg: "bg-red-50 border-red-200", icon: "⚠️" },
  { id: "no_customer", label: "No Customer Info", check: (s) => !s.customer_name && !s.customer_phone, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: "👤" },
  { id: "void_size", label: "Large Order (>5 items)", check: (s) => s.items?.reduce((sum, i) => sum + i.quantity, 0) > 5, color: "text-orange-600", bg: "bg-orange-50 border-orange-200", icon: "📦" },
  { id: "cash_high", label: "High Cash Sale (>PKR 5000)", check: (s) => s.payment_method === "Cash" && s.total_amount > 5000, color: "text-red-600", bg: "bg-red-50 border-red-200", icon: "💸" },
  { id: "any_discount", label: "Discount Applied", check: (s) => (s.discount_pct || 0) > 0, color: "text-orange-500", bg: "bg-orange-50 border-orange-200", icon: "🏷️" },
];

function getFlags(sale) {
  return FLAG_RULES.filter(rule => rule.check(sale));
}

function StatCard({ icon: Icon, label, value, sub, color = "text-[#8B7355]", urgent }) {
  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm ${urgent ? "border-red-200" : "border-[#E8DED8]"}`}>
      <div className={`flex items-center gap-2 mb-2 ${urgent ? "text-red-500" : color}`}>
        <Icon className="h-5 w-5" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${urgent ? "text-red-600" : "text-[#5C4A3A]"}`}>{value}</div>
      {sub && <div className="text-xs text-[#C9B8A6] mt-0.5">{sub}</div>}
    </div>
  );
}

function SaleRow({ sale }) {
  const [expanded, setExpanded] = useState(false);
  const flags = getFlags(sale);
  const hasFlags = flags.length > 0;
  const highRisk = flags.some(f => f.id === "high_discount" || f.id === "cash_high");

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${highRisk ? "border-red-200 bg-red-50/30" : hasFlags ? "border-amber-200 bg-amber-50/20" : "border-[#E8DED8] bg-white"}`}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        {/* Alert indicator */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${highRisk ? "bg-red-500" : hasFlags ? "bg-amber-400" : "bg-green-400"}`} />

        {/* Bill */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#5C4A3A] text-sm">{sale.bill_number}</span>
            {hasFlags && flags.map(f => (
              <span key={f.id} className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${f.bg} ${f.color}`}>
                {f.icon} {f.label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-[#8B7355]">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{sale.created_date ? format(new Date(sale.created_date), "dd MMM, hh:mm a") : "—"}</span>
            <span>{sale.cashier_name || sale.cashier_email || "Unknown"}</span>
            {sale.cashier_role && <Badge className={`text-[10px] px-1.5 py-0 border ${ROLE_COLORS[sale.cashier_role] || "bg-gray-100 text-gray-600"}`}>{sale.cashier_role}</Badge>}
            <span>{sale.order_type === "takeaway" ? "🛍 Takeaway" : "🪑 Dine In"}</span>
          </div>
        </div>

        {/* Totals */}
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-[#5C4A3A]">PKR {sale.total_amount?.toFixed(0)}</div>
          {sale.discount_pct > 0 && (
            <div className="text-xs text-red-500 font-medium">-{sale.discount_pct}% off</div>
          )}
          <div className="text-xs text-[#C9B8A6]">
            {sale.payment_method === "Cash" ? "💵 Cash" : sale.payment_method === "Card" ? "💳 Card" : "📱 Mobile"}
          </div>
        </div>

        {expanded ? <ChevronUp className="h-4 w-4 text-[#C9B8A6] flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-[#C9B8A6] flex-shrink-0" />}
      </div>

      {expanded && (
        <div className="border-t border-[#E8DED8] px-4 py-4 bg-white/80 space-y-4">
          {/* Items breakdown */}
          <div>
            <p className="text-xs font-bold text-[#5C4A3A] mb-2">Items Purchased</p>
            <div className="space-y-1">
              {(sale.items || []).map((item, i) => (
                <div key={i} className="flex justify-between text-xs text-[#8B7355]">
                  <span>{item.quantity}x {item.product_name}</span>
                  <span className="font-medium">PKR {(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Financials */}
          <div className="bg-[#F9F6F3] rounded-xl p-3 space-y-1 text-xs">
            {sale.discount_pct > 0 && (
              <>
                <div className="flex justify-between text-[#8B7355]"><span>Original Subtotal</span><span>PKR {sale.original_subtotal?.toFixed(0)}</span></div>
                <div className="flex justify-between text-red-500 font-bold"><span>Discount ({sale.discount_pct}%)</span><span>- PKR {sale.discount_amount?.toFixed(0)}</span></div>
              </>
            )}
            <div className="flex justify-between text-[#8B7355]"><span>Subtotal (after discount)</span><span>PKR {sale.subtotal?.toFixed(0)}</span></div>
            <div className="flex justify-between text-[#8B7355]"><span>GST</span><span>PKR {sale.tax?.toFixed(0)}</span></div>
            <div className="flex justify-between font-bold text-[#5C4A3A] border-t border-[#E8DED8] pt-1 mt-1"><span>Total</span><span>PKR {sale.total_amount?.toFixed(0)}</span></div>
          </div>

          {/* Cashier details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#F9F6F3] rounded-xl p-3">
              <p className="text-[#C9B8A6] mb-0.5">Processed By</p>
              <p className="font-bold text-[#5C4A3A]">{sale.cashier_name || "—"}</p>
              <p className="text-[#8B7355]">{sale.cashier_email || "—"}</p>
            </div>
            <div className="bg-[#F9F6F3] rounded-xl p-3">
              <p className="text-[#C9B8A6] mb-0.5">Counter / Type</p>
              <p className="font-bold text-[#5C4A3A]">{sale.counter === "counter_1" ? "Counter 1 (Takeaway)" : sale.counter === "counter_2" ? "Counter 2 (Dine In)" : sale.counter || "—"}</p>
              <p className="text-[#8B7355]">{sale.order_type || "—"}</p>
            </div>
            <div className="bg-[#F9F6F3] rounded-xl p-3">
              <p className="text-[#C9B8A6] mb-0.5">Customer</p>
              <p className="font-bold text-[#5C4A3A]">{sale.customer_name || <span className="text-amber-500">No name</span>}</p>
              <p className="text-[#8B7355]">{sale.customer_phone || "No phone"}</p>
            </div>
            <div className="bg-[#F9F6F3] rounded-xl p-3">
              <p className="text-[#C9B8A6] mb-0.5">QR Scanned</p>
              <p className={`font-bold ${sale.is_scanned ? "text-green-600" : "text-[#8B7355]"}`}>{sale.is_scanned ? `✅ Yes by ${sale.scanned_by || "?"}` : "Not yet"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminStaffScrutiny() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterFlag, setFilterFlag] = useState("all");
  const [filterDays, setFilterDays] = useState("7");
  const [filterPayment, setFilterPayment] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!["admin", "super_admin"].includes(u?.role)) {
        window.location.href = "/StaffPortal";
        return;
      }
      setUser(u);
    });
  }, []);

  const { data: sales = [], isLoading, refetch } = useQuery({
    queryKey: ["scrutiny-sales"],
    queryFn: () => base44.entities.StoreSale.list("-created_date", 500),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["scrutiny-users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const staffList = useMemo(() => {
    const emails = [...new Set(sales.map(s => s.cashier_email).filter(Boolean))];
    return emails;
  }, [sales]);

  const filtered = useMemo(() => {
    let result = [...sales];

    // Date filter
    if (filterDays !== "all") {
      const days = parseInt(filterDays);
      const cutoff = startOfDay(subDays(new Date(), days - 1));
      result = result.filter(s => s.created_date && new Date(s.created_date) >= cutoff);
    }

    // Staff filter
    if (filterStaff !== "all") {
      result = result.filter(s => s.cashier_email === filterStaff);
    }

    // Payment filter
    if (filterPayment !== "all") {
      result = result.filter(s => s.payment_method === filterPayment);
    }

    // Flag filter
    if (filterFlag !== "all") {
      result = result.filter(s => getFlags(s).some(f => f.id === filterFlag));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.bill_number?.toLowerCase().includes(q) ||
        s.cashier_email?.toLowerCase().includes(q) ||
        s.cashier_name?.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q) ||
        s.customer_phone?.includes(q)
      );
    }

    // Sort
    if (sortBy === "newest") result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    else if (sortBy === "highest") result.sort((a, b) => b.total_amount - a.total_amount);
    else if (sortBy === "most_discount") result.sort((a, b) => (b.discount_pct || 0) - (a.discount_pct || 0));
    else if (sortBy === "flagged") result.sort((a, b) => getFlags(b).length - getFlags(a).length);

    return result;
  }, [sales, filterDays, filterStaff, filterPayment, filterFlag, search, sortBy]);

  // Compute stats per staff
  const staffStats = useMemo(() => {
    const map = {};
    sales.forEach(s => {
      const key = s.cashier_email || "unknown";
      if (!map[key]) map[key] = { email: key, name: s.cashier_name || key, role: s.cashier_role, sales: 0, revenue: 0, discounts: 0, totalDiscountAmt: 0, cash: 0, card: 0, flags: 0 };
      map[key].sales++;
      map[key].revenue += s.total_amount || 0;
      if (s.discount_pct > 0) { map[key].discounts++; map[key].totalDiscountAmt += s.discount_amount || 0; }
      if (s.payment_method === "Cash") map[key].cash++;
      else if (s.payment_method === "Card") map[key].card++;
      map[key].flags += getFlags(s).length;
    });
    return Object.values(map).sort((a, b) => b.sales - a.sales);
  }, [sales]);

  const totalRevenue = filtered.reduce((s, x) => s + (x.total_amount || 0), 0);
  const totalDiscount = filtered.reduce((s, x) => s + (x.discount_amount || 0), 0);
  const discountedCount = filtered.filter(x => (x.discount_pct || 0) > 0).length;
  const flaggedCount = filtered.filter(x => getFlags(x).length > 0).length;
  const highRiskCount = filtered.filter(x => getFlags(x).some(f => f.id === "high_discount" || f.id === "cash_high")).length;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3D2B1F] via-[#5C4A3A] to-[#8B7355] text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-5 pt-6 pb-4">
          <Link to="/StaffPortal" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Staff Portal
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-red-500/20 rounded-2xl p-3 border border-red-400/30">
                <Shield className="h-7 w-7 text-red-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Staff Scrutiny Dashboard</h1>
                <p className="text-[#D4C4B0] text-sm">Full audit trail · Fraud detection · Staff performance</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 gap-2">
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>
          {/* Security alert strip */}
          {highRiskCount > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-red-200">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span><strong>{highRiskCount} high-risk transaction{highRiskCount !== 1 ? "s" : ""}</strong> detected in the current view — review immediately.</span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-6 pb-24 space-y-6">

        {/* Overview KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Receipt} label="Total Bills" value={filtered.length} sub={`of ${sales.length} all time`} />
          <StatCard icon={Banknote} label="Revenue" value={`PKR ${(totalRevenue / 1000).toFixed(1)}k`} sub="in selected range" />
          <StatCard icon={Percent} label="Discounted Bills" value={discountedCount} sub={`PKR ${totalDiscount.toFixed(0)} given away`} />
          <StatCard icon={AlertTriangle} label="Flagged" value={flaggedCount} sub="need review" urgent={flaggedCount > 0} />
          <StatCard icon={AlertCircle} label="High Risk" value={highRiskCount} sub="immediate attention" urgent={highRiskCount > 0} />
          <StatCard icon={Users} label="Staff Active" value={staffList.length} sub="processed sales" />
        </div>

        {/* Staff Performance Table */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm overflow-x-auto">
          <h2 className="font-bold text-[#5C4A3A] mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#8B7355]" /> Staff Performance Overview
          </h2>
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-[#E8DED8]">
                <th className="text-left pb-3 text-[#8B7355] font-medium">Staff Member</th>
                <th className="text-center pb-3 text-[#8B7355] font-medium">Sales</th>
                <th className="text-right pb-3 text-[#8B7355] font-medium">Revenue</th>
                <th className="text-center pb-3 text-[#8B7355] font-medium">Discounts Given</th>
                <th className="text-right pb-3 text-[#8B7355] font-medium">Discount PKR</th>
                <th className="text-center pb-3 text-[#8B7355] font-medium">Cash / Card</th>
                <th className="text-center pb-3 text-[#8B7355] font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {staffStats.map(s => (
                <tr key={s.email} className="border-b border-[#F5EBE8] last:border-0 hover:bg-[#FDFAF8]">
                  <td className="py-3">
                    <p className="font-semibold text-[#5C4A3A]">{s.name}</p>
                    <p className="text-xs text-[#8B7355]">{s.email}</p>
                    {s.role && <Badge className={`text-[10px] px-1.5 py-0 border mt-0.5 ${ROLE_COLORS[s.role] || "bg-gray-100 text-gray-600"}`}>{s.role}</Badge>}
                  </td>
                  <td className="py-3 text-center font-bold text-[#5C4A3A]">{s.sales}</td>
                  <td className="py-3 text-right font-medium text-[#5C4A3A]">PKR {s.revenue.toFixed(0)}</td>
                  <td className="py-3 text-center">
                    <span className={`font-bold ${s.discounts > 0 ? "text-amber-600" : "text-[#C9B8A6]"}`}>{s.discounts}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className={`font-medium ${s.totalDiscountAmt > 0 ? "text-red-500" : "text-[#C9B8A6]"}`}>
                      {s.totalDiscountAmt > 0 ? `- PKR ${s.totalDiscountAmt.toFixed(0)}` : "—"}
                    </span>
                  </td>
                  <td className="py-3 text-center text-xs text-[#8B7355]">
                    💵 {s.cash} / 💳 {s.card}
                  </td>
                  <td className="py-3 text-center">
                    {s.flags > 0
                      ? <span className="bg-red-100 text-red-700 border border-red-200 rounded-full px-2 py-0.5 text-xs font-bold">{s.flags} ⚠️</span>
                      : <span className="text-green-500 text-xs">✅ Clean</span>}
                  </td>
                </tr>
              ))}
              {staffStats.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-[#C9B8A6]">No staff activity recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-[#8B7355]" />
            <h2 className="font-bold text-[#5C4A3A] text-sm">Filter & Search Bills</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Input
              placeholder="Search bill / staff / customer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border-[#E8DED8] col-span-2 md:col-span-3 lg:col-span-2"
            />
            <select value={filterDays} onChange={e => setFilterDays(e.target.value)} className="border border-[#E8DED8] rounded-xl px-3 py-2 text-sm bg-white text-[#5C4A3A] focus:outline-none">
              <option value="1">Today</option>
              <option value="3">Last 3 Days</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
            <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="border border-[#E8DED8] rounded-xl px-3 py-2 text-sm bg-white text-[#5C4A3A] focus:outline-none">
              <option value="all">All Staff</option>
              {staffList.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} className="border border-[#E8DED8] rounded-xl px-3 py-2 text-sm bg-white text-[#5C4A3A] focus:outline-none">
              <option value="all">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Mobile Payment">Mobile</option>
            </select>
            <select value={filterFlag} onChange={e => setFilterFlag(e.target.value)} className="border border-[#E8DED8] rounded-xl px-3 py-2 text-sm bg-white text-[#5C4A3A] focus:outline-none">
              <option value="all">All Flags</option>
              {FLAG_RULES.map(f => <option key={f.id} value={f.id}>{f.icon} {f.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="text-xs text-[#C9B8A6]">Sort by:</span>
            {[
              { key: "newest", label: "Newest" },
              { key: "highest", label: "Highest Value" },
              { key: "most_discount", label: "Most Discount" },
              { key: "flagged", label: "Most Flagged" },
            ].map(opt => (
              <button key={opt.key} onClick={() => setSortBy(opt.key)}
                className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all ${sortBy === opt.key ? "bg-[#8B7355] text-white border-[#8B7355]" : "bg-white text-[#8B7355] border-[#E8DED8]"}`}>
                {opt.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-[#8B7355] font-medium">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#8B7355]"><div className="w-2.5 h-2.5 rounded-full bg-green-400" /><span>Clean</span></div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span>Minor Flag</span></div>
          <div className="flex items-center gap-1.5 text-xs text-red-600"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><span>High Risk</span></div>
          {FLAG_RULES.map(f => (
            <span key={f.id} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${f.bg} ${f.color}`}>{f.icon} {f.label}</span>
          ))}
        </div>

        {/* Bills List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="bg-white rounded-2xl border border-[#E8DED8] h-16 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-12 text-center">
              <Receipt className="h-12 w-12 text-[#C9B8A6] mx-auto mb-3" />
              <p className="text-[#8B7355]">No bills match the current filters.</p>
            </div>
          ) : (
            filtered.map(sale => <SaleRow key={sale.id} sale={sale} />)
          )}
        </div>
      </div>
    </div>
  );
}