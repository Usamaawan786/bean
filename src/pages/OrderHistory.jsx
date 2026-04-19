import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, formatDistanceStrict } from "date-fns";
import { ArrowLeft, Clock, CheckCircle2, TrendingUp, BarChart3, Coffee, ChefHat, ShoppingBag, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function durationMins(start, end) {
  if (!start || !end) return null;
  return Math.round((new Date(end) - new Date(start)) / 60000);
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <div className="text-2xl font-black text-white">{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  );
}

export default function OrderHistory() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | dine_in | takeaway
  const [dateFilter, setDateFilter] = useState("today"); // today | week | all

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || !["cashier", "manager", "admin", "super_admin"].includes(u?.role)) {
        window.location.href = "/StaffPortal";
        return;
      }
      setUser(u);
      loadOrders();
    });
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    const data = await base44.entities.KitchenOrder.filter(
      { overall_status: ["ready", "completed", "cancelled"] },
      "-placed_at",
      200
    );
    setOrders(data);
    setLoading(false);
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const filtered = orders.filter(o => {
    const placed = new Date(o.placed_at);
    if (dateFilter === "today" && placed < todayStart) return false;
    if (dateFilter === "week" && placed < weekStart) return false;
    if (filter === "dine_in" && o.order_type !== "dine_in") return false;
    if (filter === "takeaway" && o.order_type !== "takeaway") return false;
    return true;
  });

  // Efficiency stats
  const completed = filtered.filter(o => o.overall_status === "ready" || o.overall_status === "completed");
  const withTimes = completed.filter(o => o.placed_at && o.ready_at);
  const durations = withTimes.map(o => durationMins(o.placed_at, o.ready_at));
  const avgTime = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
  const fastOrders = durations.filter(d => d <= 5).length;
  const slowOrders = durations.filter(d => d > 10).length;

  const takeawayCount = filtered.filter(o => o.order_type === "takeaway").length;
  const dineInCount = filtered.filter(o => o.order_type === "dine_in").length;

  if (!user) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/OrderManager" className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-white">Order History</h1>
              <p className="text-gray-400 text-xs">Efficiency & delivery tracking</p>
            </div>
          </div>
          <button onClick={loadOrders} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
            {[["today", "Today"], ["week", "This Week"], ["all", "All Time"]].map(([val, label]) => (
              <button key={val} onClick={() => setDateFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dateFilter === val ? "bg-amber-500 text-white" : "text-gray-400 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
            {[["all", "All Types"], ["takeaway", "🛍 Takeaway"], ["dine_in", "🪑 Dine In"]].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === val ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={BarChart3} label="Total Orders" value={filtered.length} color="bg-blue-600" />
          <StatCard icon={Clock} label="Avg. Completion" value={avgTime !== null ? `${avgTime}m` : "—"} color="bg-amber-600" />
          <StatCard icon={TrendingUp} label="Under 5 mins" value={fastOrders} color="bg-green-600" />
          <StatCard icon={ShoppingBag} label="Takeaway" value={takeawayCount} color="bg-orange-600" />
        </div>

        {/* Efficiency breakdown */}
        {durations.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-400" /> Efficiency Breakdown
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-black text-green-400">{fastOrders}</div>
                <div className="text-xs text-gray-400 mt-1">Fast (≤5 min)</div>
                <div className="text-xs text-green-500">{durations.length > 0 ? Math.round(fastOrders / durations.length * 100) : 0}%</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-yellow-400">{durations.filter(d => d > 5 && d <= 10).length}</div>
                <div className="text-xs text-gray-400 mt-1">On-Time (6–10 min)</div>
                <div className="text-xs text-yellow-500">{durations.length > 0 ? Math.round(durations.filter(d => d > 5 && d <= 10).length / durations.length * 100) : 0}%</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-red-400">{slowOrders}</div>
                <div className="text-xs text-gray-400 mt-1">Slow ({">"}10 min)</div>
                <div className="text-xs text-red-500">{durations.length > 0 ? Math.round(slowOrders / durations.length * 100) : 0}%</div>
              </div>
            </div>
            {/* Visual bar */}
            <div className="mt-4 h-2 rounded-full bg-gray-800 flex overflow-hidden">
              <div className="bg-green-500 h-full transition-all" style={{ width: `${durations.length > 0 ? fastOrders / durations.length * 100 : 0}%` }} />
              <div className="bg-yellow-500 h-full transition-all" style={{ width: `${durations.length > 0 ? durations.filter(d => d > 5 && d <= 10).length / durations.length * 100 : 0}%` }} />
              <div className="bg-red-500 h-full transition-all" style={{ width: `${durations.length > 0 ? slowOrders / durations.length * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {/* Order list */}
        <div className="space-y-2">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" /> Order Log ({filtered.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-amber-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-600">No orders found for this period</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(order => {
                const dur = durationMins(order.placed_at, order.ready_at);
                const isTakeaway = order.order_type === "takeaway";
                const isReady = order.overall_status === "ready" || order.overall_status === "completed";
                const isCancelled = order.overall_status === "cancelled";
                const speedColor = dur === null ? "text-gray-500" : dur <= 5 ? "text-green-400" : dur <= 10 ? "text-yellow-400" : "text-red-400";

                return (
                  <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                    {/* Status dot */}
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isCancelled ? "bg-red-600" : "bg-green-500"}`} />

                    {/* Order info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-white text-base">{order.order_number}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isTakeaway ? "bg-orange-900/60 text-orange-300" : "bg-blue-900/60 text-blue-300"}`}>
                          {isTakeaway ? "🛍 Takeaway" : "🪑 Dine In"}
                        </span>
                        {order.customer_name && <span className="text-gray-400 text-xs">{order.customer_name}</span>}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isCancelled ? "bg-red-900/60 text-red-300" : "bg-green-900/60 text-green-300"}`}>
                          {isCancelled ? "Cancelled" : "Completed"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">
                          Placed: {order.placed_at ? format(new Date(order.placed_at), "HH:mm") : "—"}
                        </span>
                        {order.ready_at && (
                          <span className="text-xs text-gray-500">
                            Ready: {format(new Date(order.ready_at), "HH:mm")}
                          </span>
                        )}
                        <span className="text-xs text-gray-600">
                          {order.placed_at ? format(new Date(order.placed_at), "d MMM") : ""}
                        </span>
                        {/* Items summary */}
                        <span className="text-xs text-gray-600">
                          {order.items?.length} item{order.items?.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {/* Item names */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {order.items?.slice(0, 4).map((item, i) => (
                          <span key={i} className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
                            {item.quantity > 1 ? `×${item.quantity} ` : ""}{item.product_name}
                          </span>
                        ))}
                        {(order.items?.length || 0) > 4 && (
                          <span className="text-xs text-gray-600">+{order.items.length - 4} more</span>
                        )}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="text-right flex-shrink-0">
                      {dur !== null ? (
                        <div className={`text-2xl font-black ${speedColor}`}>{dur}m</div>
                      ) : (
                        <div className="text-lg font-bold text-gray-600">—</div>
                      )}
                      <div className="text-xs text-gray-600">total time</div>
                      {dur !== null && (
                        <div className={`text-xs font-semibold mt-0.5 ${speedColor}`}>
                          {dur <= 5 ? "⚡ Fast" : dur <= 10 ? "✓ On time" : "⚠ Slow"}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}