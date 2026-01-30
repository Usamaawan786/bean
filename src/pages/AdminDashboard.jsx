import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, ShoppingCart, DollarSign, Package, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ['#8B7355', '#6B5744', '#D4C4B0', '#C9B8A6', '#B5A593', '#A08975'];

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [timeRange, setTimeRange] = useState("7days");

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      if (u.role !== 'admin') {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(u);
    };
    loadUser();
  }, []);

  const { data: sales = [] } = useQuery({
    queryKey: ["sales-analytics"],
    queryFn: () => base44.entities.StoreSale.list("-created_date", 500),
    enabled: !!user
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses-analytics"],
    queryFn: () => base44.entities.Expense.list("-created_date", 500),
    enabled: !!user
  });

  // Filter by time range
  const getDateThreshold = () => {
    const now = new Date();
    switch (timeRange) {
      case "today":
        return new Date(now.setHours(0, 0, 0, 0));
      case "7days":
        return new Date(now.setDate(now.getDate() - 7));
      case "30days":
        return new Date(now.setDate(now.getDate() - 30));
      case "90days":
        return new Date(now.setDate(now.getDate() - 90));
      default:
        return new Date(0);
    }
  };

  const threshold = getDateThreshold();
  const filteredSales = sales.filter(s => new Date(s.created_date) >= threshold);
  const filteredExpenses = expenses.filter(e => new Date(e.created_date) >= threshold);

  // Calculate metrics
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalTransactions = filteredSales.length;
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Sales over time (daily grouping)
  const salesByDate = filteredSales.reduce((acc, sale) => {
    const date = new Date(sale.created_date).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, revenue: 0, orders: 0 };
    }
    acc[date].revenue += sale.total_amount;
    acc[date].orders += 1;
    return acc;
  }, {});
  const salesTimeline = Object.values(salesByDate).sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  // Best selling products
  const productSales = {};
  filteredSales.forEach(sale => {
    sale.items?.forEach(item => {
      if (!productSales[item.product_name]) {
        productSales[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
      }
      productSales[item.product_name].quantity += item.quantity;
      productSales[item.product_name].revenue += item.price * item.quantity;
    });
  });
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Expenses by category
  const expensesByCategory = filteredExpenses.reduce((acc, exp) => {
    if (!acc[exp.category]) {
      acc[exp.category] = 0;
    }
    acc[exp.category] += exp.amount;
    return acc;
  }, {});
  const expensesData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value
  }));

  // Payment method breakdown
  const paymentMethods = filteredSales.reduce((acc, sale) => {
    const method = sale.payment_method || 'Unknown';
    if (!acc[method]) {
      acc[method] = 0;
    }
    acc[method] += sale.total_amount;
    return acc;
  }, {});
  const paymentData = Object.entries(paymentMethods).map(([name, value]) => ({
    name,
    value
  }));

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-7xl mx-auto px-5 pt-6 pb-8">
          <Link to={createPageUrl("AdminPOS")} className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to POS
          </Link>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-[#E8DED8] text-sm mt-1">Business insights & metrics</p>
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

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-300" />
                <span className="text-xs text-[#E8DED8]">Total Revenue</span>
              </div>
              <div className="text-2xl font-bold">Rs. {totalRevenue.toLocaleString()}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-blue-300" />
                <span className="text-xs text-[#E8DED8]">Transactions</span>
              </div>
              <div className="text-2xl font-bold">{totalTransactions}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-amber-300" />
                <span className="text-xs text-[#E8DED8]">Avg Order</span>
              </div>
              <div className="text-2xl font-bold">Rs. {averageOrderValue.toFixed(0)}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-purple-300" />
                <span className="text-xs text-[#E8DED8]">Net Profit</span>
              </div>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                Rs. {netProfit.toLocaleString()}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="max-w-7xl mx-auto px-5 py-6 space-y-6">
        {/* Sales Timeline */}
        <Card className="border-[#E8DED8]">
          <CardHeader>
            <CardTitle className="text-[#5C4A3A]">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DED8" />
                <XAxis dataKey="date" stroke="#8B7355" fontSize={12} />
                <YAxis stroke="#8B7355" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E8DED8', borderRadius: '8px' }}
                  formatter={(value) => `Rs. ${value.toFixed(0)}`}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8B7355" strokeWidth={2} name="Revenue (PKR)" />
                <Line type="monotone" dataKey="orders" stroke="#6B5744" strokeWidth={2} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Best Selling Products */}
          <Card className="border-[#E8DED8]">
            <CardHeader>
              <CardTitle className="text-[#5C4A3A]">Top Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DED8" />
                  <XAxis type="number" stroke="#8B7355" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#8B7355" fontSize={12} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E8DED8', borderRadius: '8px' }}
                    formatter={(value) => `Rs. ${value.toFixed(0)}`}
                  />
                  <Bar dataKey="revenue" fill="#8B7355" name="Revenue (PKR)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expenses by Category */}
          <Card className="border-[#E8DED8]">
            <CardHeader>
              <CardTitle className="text-[#5C4A3A]">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Payment Methods */}
          <Card className="border-[#E8DED8]">
            <CardHeader>
              <CardTitle className="text-[#5C4A3A]">Revenue by Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: Rs. ${value.toLocaleString()}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card className="border-[#E8DED8]">
            <CardHeader>
              <CardTitle className="text-[#5C4A3A]">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[#E8DED8]">
                <span className="text-[#8B7355]">Total Revenue</span>
                <span className="font-bold text-[#5C4A3A]">Rs. {totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[#E8DED8]">
                <span className="text-[#8B7355]">Total Expenses</span>
                <span className="font-bold text-red-600">- Rs. {totalExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[#E8DED8]">
                <span className="text-[#8B7355]">Net Profit</span>
                <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rs. {netProfit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[#E8DED8]">
                <span className="text-[#8B7355]">Profit Margin</span>
                <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8B7355]">Avg Transaction Value</span>
                <span className="font-bold text-[#5C4A3A]">Rs. {averageOrderValue.toFixed(0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Performance Table */}
        <Card className="border-[#E8DED8]">
          <CardHeader>
            <CardTitle className="text-[#5C4A3A]">Product Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8DED8]">
                    <th className="text-left py-3 px-4 text-[#5C4A3A] font-semibold">Product</th>
                    <th className="text-right py-3 px-4 text-[#5C4A3A] font-semibold">Qty Sold</th>
                    <th className="text-right py-3 px-4 text-[#5C4A3A] font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, i) => (
                    <tr key={i} className="border-b border-[#E8DED8] hover:bg-[#F5EBE8] transition-colors">
                      <td className="py-3 px-4 text-[#5C4A3A]">{product.name}</td>
                      <td className="py-3 px-4 text-right text-[#8B7355]">{product.quantity}</td>
                      <td className="py-3 px-4 text-right font-semibold text-[#5C4A3A]">
                        Rs. {product.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}