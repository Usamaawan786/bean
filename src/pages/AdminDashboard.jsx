import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, TrendingUp, ShoppingCart, DollarSign, Package, Bell,
  MessageSquare, RefreshCw, Users, Gift, CreditCard, Banknote,
  TrendingDown, BarChart3, Clock, CheckCircle2, AlertTriangle, Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { format, subDays, startOfDay, isAfter } from "date-fns";

const COLORS = ['#8B7355', '#6B5744', '#D4C4B0', '#C9B8A6', '#B5A593', '#A08975', '#5C4A3A'];

function StatCard({ icon: Icon, label, value, sub, color = "text-white", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20"
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-white/70" />
        <span className="text-xs text-[#E8DED8]">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-white/50 mt-1">{sub}</div>}
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [timeRange, setTimeRange] = useState("7days");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!["admin", "super_admin", "manager"].includes(u?.role)) {
        window.location.href = "/StaffPortal";
        return;
      }
      setUser(u);
    });
  }, []);

  // Single backend function for all accurate metrics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await base44.functions.invoke('getDashboardStats', {});
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Keep sales for real-time subscription & recent transactions table
  const { data: sales = [] } = useQuery({
    queryKey: ["sales-analytics"],
    queryFn: () => base44.asServiceRole
      ? base44.entities.StoreSale.list("-created_date", 200)
      : base44.entities.StoreSale.list("-created_date", 200),
    enabled: !!user,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses-analytics"],
    queryFn: () => base44.entities.Expense.list("-created_date", 100),
    enabled: !!user,
    refetchInterval: 60000,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory-dashboard"],
    queryFn: () => base44.entities.Inventory.list("-updated_date", 200),
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Real-time subscription for new sales (with safe fallback)
  useEffect(() => {
    if (!user) return;
    try {
      const unsub = base44.entities.StoreSale.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ["sales-analytics"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        setLastRefresh(new Date());
      });
      return unsub;
    } catch (e) {
      // polling handles updates
    }
  }, [user, queryClient]);

  // Pull from backend stats (accurate, service-role, no RLS limits)
  const totalRevenue = stats?.allTimeRevenue || 0;
  const todayRevenue = stats?.todayRevenue || 0;
  const totalTransactions = stats?.allTimeTransactions || 0;
  const todayTransactions = stats?.todayTransactions || 0;
  const avgOrderValue = stats?.allTimeAvgOrder || 0;
  const totalExpenses = stats?.allTimeExpenses || 0;
  const netProfit = stats?.allTimeProfit || 0;
  const totalItemsSold = stats?.todayItemsSold || 0;
  const scannedBills = stats?.scannedTotal || 0;
  const scanRate = stats?.scanRate || 0;
  const totalCustomers = stats?.totalCustomers || 0;

  // Charts from backend stats
  const salesTimeline = stats?.dailyRevenue?.map(d => ({
    date: d.date.slice(5), // MM-DD
    revenue: d.revenue,
    orders: d.orders
  })) || [];

  const topProducts = stats?.topProducts || [];

  const paymentData = stats?.paymentBreakdown
    ? Object.entries(stats.paymentBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  const hourlySales = stats?.hourly || [];

  // Expenses by category (from local fetch — smaller dataset)
  const expensesData = useMemo(() => {
    const map = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  // Inventory alerts (local fetch)
  const lowStockItems = inventory.filter(i => (i.quantity || 0) <= (i.reorder_level || 5));
  const outOfStock = inventory.filter(i => (i.quantity || 0) === 0);

  const recentSales = sales.slice(0, 10);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["sales-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["expenses-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    setLastRefresh(new Date());
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-7xl mx-auto px-5 pt-6 pb-8">
          <div className="flex items-center justify-between mb-4">
            <Link to="/AdminPOS" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Back to POS
            </Link>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
              <Link to="/AdminPushNotifications" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-2 rounded-xl border border-white/20 transition-colors">
                <Bell className="h-4 w-4" /> Push
              </Link>
              <Link to="/AdminWhatsApp" className="inline-flex items-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-white text-sm px-3 py-2 rounded-xl border border-[#25D366]/40 transition-colors">
                <MessageSquare className="h-4 w-4" /> WhatsApp
              </Link>
              <Link to="/AdminRewardsRedemptions" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-2 rounded-xl border border-white/20 transition-colors">
                <Gift className="h-4 w-4" /> Rewards
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-[#E8DED8] text-sm mt-1 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live · Last updated {format(lastRefresh, "HH:mm:ss")}
              </p>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={DollarSign} label="Total Revenue" value={isLoadingStats ? '…' : `Rs. ${totalRevenue.toLocaleString()}`} sub={`Today: Rs. ${todayRevenue.toLocaleString()}`} delay={0} />
            <StatCard icon={ShoppingCart} label="Transactions" value={isLoadingStats ? '…' : totalTransactions} sub={`Today: ${todayTransactions}`} delay={0.05} />
            <StatCard icon={TrendingUp} label="Avg Order Value" value={isLoadingStats ? '…' : `Rs. ${avgOrderValue.toFixed(0)}`} sub={`Expenses: Rs. ${totalExpenses.toLocaleString()}`} delay={0.1} />
            <StatCard icon={Package} label="Net Profit" value={isLoadingStats ? '…' : `Rs. ${netProfit.toLocaleString()}`} color={netProfit >= 0 ? "text-green-300" : "text-red-300"} sub={`Margin: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%`} delay={0.15} />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <StatCard icon={Users} label="Total Customers" value={isLoadingStats ? '…' : totalCustomers} sub={`+${stats?.newCustomersWeek || 0} this week`} delay={0.2} />
            <StatCard icon={CheckCircle2} label="QR Scan Rate" value={isLoadingStats ? '…' : `${scanRate}%`} sub={`${scannedBills} / ${totalTransactions} scanned`} delay={0.25} />
            <StatCard icon={AlertTriangle} label="Low Stock Items" value={lowStockItems.length} color={lowStockItems.length > 0 ? "text-amber-300" : "text-white"} sub={`${outOfStock.length} out of stock`} delay={0.3} />
            <StatCard icon={Clock} label="Today's Orders" value={isLoadingStats ? '…' : todayTransactions} sub={`Revenue: Rs. ${todayRevenue.toLocaleString()}`} delay={0.35} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-6 space-y-6">
        {/* Revenue Area Chart */}
        <Card className="border-[#E8DED8]">
          <CardHeader>
            <CardTitle className="text-[#5C4A3A]">Revenue & Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {salesTimeline.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-[#8B7355]">No sales data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={salesTimeline}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B7355" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B7355" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DED8" />
                  <XAxis dataKey="date" stroke="#8B7355" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#8B7355" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6B5744" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E8DED8', borderRadius: '8px' }}
                    formatter={(value, name) => name === "Revenue (PKR)" ? `Rs. ${value.toLocaleString()}` : value}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#8B7355" strokeWidth={2} fill="url(#colorRevenue)" name="Revenue (PKR)" />
                  <Bar yAxisId="right" dataKey="orders" fill="#D4C4B0" name="Orders" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card className="border-[#E8DED8]">
            <CardHeader>
              <CardTitle className="text-[#5C4A3A]">Top Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-[#8B7355] text-sm">No sales data</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8DED8" />
                    <XAxis type="number" stroke="#8B7355" fontSize={11} tickFormatter={v => `Rs.${(v/1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" stroke="#8B7355" fontSize={10} width={90} />
                    <Tooltip formatter={v => `Rs. ${v.toLocaleString()}`} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="revenue" fill="#8B7355" name="Revenue" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="border-[#E8DED8]">
            <CardHeader>
              <CardTitle className="text-[#5C4A3A]">Orders by Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-[#8B7355] text-sm">No data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 justify-center mt-2">
                    {paymentData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-[#5C4A3A]">{d.name}</span>
                        <span className="text-[#8B7355] font-bold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Expenses by Category */}
          <Card className="border-[#E8DED8]">
            <CardHeader>
              <CardTitle className="text-[#5C4A3A]">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-[#8B7355] text-sm">No expense data</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={expensesData} cx="50%" cy="50%" labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80} dataKey="value">
                      {expensesData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => `Rs. ${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="border-[#E8DED8]">
            <CardHeader>
              <CardTitle className="text-[#5C4A3A]">Financial Summary (All Time)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingStats ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" /></div>
              ) : [
                { label: "Gross Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, color: "text-green-600" },
                { label: "Total Expenses", value: `- Rs. ${totalExpenses.toLocaleString()}`, color: "text-red-600" },
                { label: "Net Profit", value: `Rs. ${netProfit.toLocaleString()}`, color: netProfit >= 0 ? "text-green-600 font-bold text-lg" : "text-red-600 font-bold text-lg" },
                { label: "Profit Margin", value: `${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%`, color: "text-[#5C4A3A]" },
                { label: "Avg Order Value", value: `Rs. ${avgOrderValue.toFixed(0)}`, color: "text-[#5C4A3A]" },
                { label: "Total Customers", value: totalCustomers, color: "text-[#5C4A3A]" },
                { label: "New Customers Today", value: stats?.newCustomersToday || 0, color: "text-[#8B7355]" },
                { label: "QR Scans (Rewards)", value: `${scannedBills} (${scanRate}%)`, color: "text-[#8B7355]" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center pb-2 border-b border-[#F5EBE8] last:border-0">
                  <span className="text-[#8B7355] text-sm">{label}</span>
                  <span className={`font-semibold text-sm ${color}`}>{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Today's Hourly Activity */}
        <Card className="border-[#E8DED8]">
          <CardHeader>
            <CardTitle className="text-[#5C4A3A]">Today's Hourly Sales (PKT)</CardTitle>
          </CardHeader>
          <CardContent>
            {hourlySales.length === 0 || hourlySales.every(h => h.orders === 0) ? (
              <div className="h-48 flex items-center justify-center text-[#8B7355] text-sm">No sales today yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DED8" />
                  <XAxis dataKey="hour" stroke="#8B7355" fontSize={10} />
                  <YAxis stroke="#8B7355" fontSize={10} />
                  <Tooltip formatter={(v, n) => n === "revenue" ? `Rs. ${v.toLocaleString()}` : v} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="orders" fill="#8B7355" name="Orders" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        {lowStockItems.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Inventory Alerts ({lowStockItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {lowStockItems.slice(0, 8).map(item => (
                  <div key={item.id} className="bg-white rounded-xl p-3 border border-amber-200">
                    <p className="font-medium text-amber-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-amber-600 mt-1">
                      {item.quantity === 0
                        ? <span className="text-red-600 font-bold">OUT OF STOCK</span>
                        : <span>Stock: <strong>{item.quantity}</strong></span>}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Sales */}
        <Card className="border-[#E8DED8]">
          <CardHeader>
            <CardTitle className="text-[#5C4A3A] flex items-center justify-between">
              Recent Transactions
              <Badge variant="outline" className="text-xs font-normal text-[#8B7355]">{sales.length} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-center text-[#8B7355] py-8 text-sm">No sales recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8DED8]">
                      <th className="text-left py-2 px-3 text-[#5C4A3A] font-semibold">Invoice</th>
                      <th className="text-left py-2 px-3 text-[#5C4A3A] font-semibold">Customer</th>
                      <th className="text-left py-2 px-3 text-[#5C4A3A] font-semibold">Items</th>
                      <th className="text-center py-2 px-3 text-[#5C4A3A] font-semibold">Payment</th>
                      <th className="text-center py-2 px-3 text-[#5C4A3A] font-semibold">QR</th>
                      <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Amount</th>
                      <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map(sale => (
                      <tr key={sale.id} className="border-b border-[#F5EBE8] hover:bg-[#F5EBE8] transition-colors">
                        <td className="py-2 px-3 font-mono text-xs text-[#8B7355]">{sale.bill_number}</td>
                        <td className="py-2 px-3 text-[#5C4A3A]">{sale.customer_name || <span className="text-[#C9B8A6]">—</span>}</td>
                        <td className="py-2 px-3 text-[#8B7355]">{sale.items?.length || 0} items</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="outline" className="text-xs">
                            {sale.payment_method === "Card" ? <CreditCard className="h-3 w-3 inline mr-1" /> : <Banknote className="h-3 w-3 inline mr-1" />}
                            {sale.payment_method || "Cash"}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {sale.is_scanned
                            ? <span className="text-green-600 text-xs font-medium">✓ Scanned</span>
                            : <span className="text-[#C9B8A6] text-xs">Pending</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-[#5C4A3A]">Rs. {(sale.total_amount || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-[#8B7355] text-xs">{format(new Date(sale.created_date), "MMM dd, HH:mm")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Performance Table */}
        <Card className="border-[#E8DED8]">
          <CardHeader>
            <CardTitle className="text-[#5C4A3A]">Product Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-center text-[#8B7355] py-8 text-sm">No product sales data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8DED8]">
                      <th className="text-left py-2 px-3 text-[#5C4A3A] font-semibold">#</th>
                      <th className="text-left py-2 px-3 text-[#5C4A3A] font-semibold">Product</th>
                      <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Units Sold</th>
                      <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Revenue</th>
                      <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Avg Price</th>
                      <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">% of Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={i} className="border-b border-[#F5EBE8] hover:bg-[#F5EBE8] transition-colors">
                        <td className="py-2 px-3 text-[#C9B8A6] font-bold">{i + 1}</td>
                        <td className="py-2 px-3 text-[#5C4A3A] font-medium">{p.name}</td>
                        <td className="py-2 px-3 text-right text-[#8B7355]">{p.quantity}</td>
                        <td className="py-2 px-3 text-right font-semibold text-[#5C4A3A]">Rs. {p.revenue.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-[#8B7355]">Rs. {(p.revenue / p.quantity).toFixed(0)}</td>
                        <td className="py-2 px-3 text-right text-[#8B7355]">
                          {totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}