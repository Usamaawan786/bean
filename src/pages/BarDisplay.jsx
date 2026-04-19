import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Coffee, AlertTriangle, Wifi, Lock, LogOut, Loader2, BarChart3, Clock, TrendingUp, ShoppingBag } from "lucide-react";
import { format } from "date-fns";

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

const STATION = "bar";
const STAFF_ROLES = ["cashier", "manager", "admin", "super_admin"];

function elapsed(placedAt) {
  return Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000);
}

function ElapsedTimer({ placedAt }) {
  const [mins, setMins] = useState(elapsed(placedAt));
  useEffect(() => {
    const t = setInterval(() => setMins(elapsed(placedAt)), 30000);
    return () => clearInterval(t);
  }, [placedAt]);
  const urgent = mins >= 6;
  const warning = mins >= 3;
  return (
    <span className={`text-sm font-bold tabular-nums ${urgent ? "text-red-400 animate-pulse" : warning ? "text-yellow-400" : "text-gray-400"}`}>
      {mins}m
    </span>
  );
}

function OrderCard({ order, onMarkItemDone, onMarkStationDone }) {
  const myItems = order.items.filter(i => i.station === STATION);
  if (myItems.length === 0) return null;
  const allDone = myItems.every(i => i.status === "done");
  const isTakeaway = order.order_type === "takeaway";
  const borderColor = allDone ? "border-green-600" : isTakeaway ? "border-orange-500" : "border-blue-700";
  const headerBg = allDone ? "bg-green-900/40" : isTakeaway ? "bg-orange-900/40" : "bg-blue-900/30";

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
      className={`bg-gray-900 border-2 ${borderColor} rounded-2xl overflow-hidden`}>
      <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-white">{order.order_number}</span>
          {isTakeaway ? (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> TAKEAWAY
            </span>
          ) : (
            <span className="bg-blue-800 text-blue-200 text-xs font-semibold px-2 py-1 rounded-full">DINE IN</span>
          )}
          {order.customer_name && <span className="text-gray-300 text-sm font-medium">{order.customer_name}</span>}
        </div>
        <div className="flex items-center gap-3">
          <ElapsedTimer placedAt={order.placed_at} />
          {allDone && <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">DONE ✓</span>}
        </div>
      </div>
      <div className="p-4 space-y-3">
        {myItems.map((item, idx) => {
          const realIdx = order.items.indexOf(item);
          const isDone = item.status === "done";
          return (
            <div key={idx} className={`flex items-center gap-3 rounded-xl p-3 transition-all ${isDone ? "bg-green-900/30 opacity-60" : "bg-gray-800"}`}>
              <button
                onClick={() => !isDone && onMarkItemDone(order.id, realIdx, item)}
                className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? "border-green-500 bg-green-500" : "border-gray-500 hover:border-green-400 active:scale-95"}`}
              >
                {isDone && <CheckCircle2 className="h-5 w-5 text-white" />}
              </button>
              <div className="flex-1">
                <p className={`text-lg font-bold leading-tight ${isDone ? "line-through text-gray-500" : "text-white"}`}>
                  {item.quantity > 1 && <span className="text-blue-400 mr-1">×{item.quantity}</span>}
                  {item.product_name}
                </p>
                {item.notes && <p className="text-yellow-400 text-sm mt-1 font-medium">⚠ {item.notes}</p>}
              </div>
            </div>
          );
        })}
      </div>
      {!allDone && (
        <div className="px-4 pb-4">
          <button onClick={() => onMarkStationDone(order.id)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-base transition-all">
            ✓ All Drinks Ready
          </button>
        </div>
      )}
    </motion.div>
  );
}

function LoginScreen() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-20 h-20 bg-blue-400/10 border-2 border-blue-400/30 rounded-3xl flex items-center justify-center mb-6">
        <Coffee className="h-10 w-10 text-blue-400" />
      </div>
      <h1 className="text-3xl font-black text-white mb-2">Bar Display</h1>
      <p className="text-gray-400 text-sm text-center mb-8 max-w-xs">
        Sign in with your staff account to unlock this display.
      </p>
      <button
        onClick={() => base44.auth.redirectToLogin("/BarDisplay")}
        className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-10 py-4 rounded-2xl text-base transition-all hover:scale-105 shadow-lg shadow-blue-500/20 flex items-center gap-2"
      >
        <Lock className="h-5 w-5" /> Sign In to Bar Display
      </button>
      <p className="text-gray-600 text-xs mt-6">Bean Coffee · Staff Access Only</p>
    </div>
  );
}

export default function BarDisplay() {
  const [authState, setAuthState] = useState("checking");
  const [orders, setOrders] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [filterType, setFilterType] = useState("all"); // all | dine_in | takeaway
  const [filterDate, setFilterDate] = useState("today"); // today | week | all
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (isAuth) => {
      if (!isAuth) { setAuthState("unauthenticated"); return; }
      const u = await base44.auth.me();
      if (!STAFF_ROLES.includes(u?.role)) { setAuthState("unauthenticated"); return; }
      setAuthState("ready");
    });
  }, []);

  const sortOrders = (arr) => [...arr].sort((a, b) => {
    if (a.order_type === "takeaway" && b.order_type !== "takeaway") return -1;
    if (b.order_type === "takeaway" && a.order_type !== "takeaway") return 1;
    return new Date(a.placed_at) - new Date(b.placed_at);
  });

  const loadOrders = async () => {
    const data = await base44.entities.KitchenOrder.filter(
      { bar_status: ["pending", "in_progress"] }, "-placed_at", 50
    );
    setOrders(sortOrders(data));
  };

  const loadHistory = async () => {
    const data = await base44.entities.KitchenOrder.filter(
      { overall_status: ["ready", "completed", "cancelled"] },
      "-placed_at",
      200
    );
    setHistoryOrders(data);
  };

  useEffect(() => {
    if (authState !== "ready") return;
    loadOrders();
    if (showHistory) loadHistory();
    const unsub = base44.entities.KitchenOrder.subscribe((event) => {
      if (event.type === "create") {
        const o = event.data;
        if (o.bar_status === "pending" || o.bar_status === "in_progress") {
          setOrders(prev => sortOrders([o, ...prev.filter(x => x.id !== o.id)]));
        }
      } else if (event.type === "update") {
        const o = event.data;
        if (["done", "not_applicable"].includes(o.bar_status) || ["completed", "cancelled"].includes(o.overall_status)) {
          setOrders(prev => prev.filter(x => x.id !== o.id));
        } else {
          setOrders(prev => sortOrders(prev.map(x => x.id === o.id ? o : x)));
        }
      }
    });
    return () => unsub();
  }, [authState]);

  const markItemDone = async (orderId, itemIndex) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const updatedItems = order.items.map((it, idx) => idx === itemIndex ? { ...it, status: "done" } : it);
    const barItems = updatedItems.filter(i => i.station === "bar");
    const allBarDone = barItems.every(i => i.status === "done");
    const updates = { items: updatedItems, bar_status: allBarDone ? "done" : "in_progress" };
    if (allBarDone) {
      const kitchenItems = updatedItems.filter(i => i.station === "kitchen");
      if (kitchenItems.length === 0 || kitchenItems.every(i => i.status === "done")) updates.overall_status = "ready";
    }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    await base44.entities.KitchenOrder.update(orderId, updates);
  };

  const markStationDone = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const updatedItems = order.items.map(it => it.station === "bar" ? { ...it, status: "done" } : it);
    const kitchenItems = updatedItems.filter(i => i.station === "kitchen");
    const allKitchenDone = kitchenItems.length === 0 || kitchenItems.every(i => i.status === "done");
    const updates = { items: updatedItems, bar_status: "done", ...(allKitchenDone && { overall_status: "ready", ready_at: new Date().toISOString() }) };
    setOrders(prev => prev.filter(o => o.id !== orderId));
    await base44.entities.KitchenOrder.update(orderId, updates);
  };

  // Triple-tap header to reveal logout
  const handleHeaderTap = () => {
    setTapCount(n => n + 1);
    clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => setTapCount(0), 2000);
  };

  const handleLogout = () => base44.auth.logout("/BarDisplay");

  if (authState === "checking") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (authState === "unauthenticated") return <LoginScreen />;

  const activeOrders = orders.filter(o => o.bar_status !== "not_applicable");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header — triple-tap to reveal logout */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10 select-none"
        onClick={handleHeaderTap}>
        <div className="flex items-center gap-3">
          <Coffee className="h-7 w-7 text-blue-400" />
          <div>
            <h1 className="text-xl font-black text-white">BAR DISPLAY</h1>
            <p className="text-gray-400 text-xs">Bean Coffee — Barista Station</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-gray-800 rounded-xl px-4 py-2 text-center">
            <div className="text-2xl font-black text-blue-400">{activeOrders.length}</div>
            <div className="text-xs text-gray-400">Active Drinks</div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <Wifi className="h-3.5 w-3.5" /><span>Live</span>
          </div>
          <div className="text-gray-500 text-sm">{format(new Date(), "HH:mm")}</div>
          {tapCount >= 3 && (
            <button onClick={(e) => { e.stopPropagation(); handleLogout(); }}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-6 flex gap-2">
        <button
          onClick={() => setShowHistory(false)}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            !showHistory ? "text-white border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Active Orders
        </button>
        <button
          onClick={() => { setShowHistory(true); loadHistory(); }}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            showHistory ? "text-white border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          History
        </button>
      </div>

      {/* History Filters */}
      {showHistory && (
        <div className="border-b border-gray-800 px-6 py-4 flex flex-wrap gap-3">
          <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
            {[["today", "Today"], ["week", "This Week"], ["all", "All Time"]].map(([val, label]) => (
              <button key={val} onClick={() => setFilterDate(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterDate === val ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
            {[["all", "All Types"], ["takeaway", "🛍 Takeaway"], ["dine_in", "🪑 Dine In"]].map(([val, label]) => (
              <button key={val} onClick={() => setFilterType(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === val ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Order Grid */}
      <div className="p-5">
        {!showHistory && activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center">
            <Coffee className="h-20 w-20 text-gray-700 mb-4" />
            <h2 className="text-2xl font-bold text-gray-600">All Clear!</h2>
            <p className="text-gray-700 mt-2">No pending drink orders</p>
          </div>
        ) : showHistory ? (
          <div className="space-y-6">
            {(() => {
              const now = new Date();
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              
              const filtered = historyOrders.filter(o => {
                const placed = new Date(o.placed_at);
                if (filterDate === "today" && placed < todayStart) return false;
                if (filterDate === "week" && placed < weekStart) return false;
                if (filterType === "dine_in" && o.order_type !== "dine_in") return false;
                if (filterType === "takeaway" && o.order_type !== "takeaway") return false;
                return true;
              });

              const completed = filtered.filter(o => o.overall_status === "ready" || o.overall_status === "completed");
              const withTimes = completed.filter(o => o.placed_at && o.ready_at);
              const durations = withTimes.map(o => durationMins(o.placed_at, o.ready_at));
              const avgTime = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
              const fastOrders = durations.filter(d => d <= 5).length;
              const slowOrders = durations.filter(d => d > 10).length;

              return (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={BarChart3} label="Total Orders" value={filtered.length} color="bg-blue-600" />
                    <StatCard icon={Clock} label="Avg. Completion" value={avgTime !== null ? `${avgTime}m` : "—"} color="bg-blue-600" />
                    <StatCard icon={TrendingUp} label="Under 5 mins" value={fastOrders} color="bg-green-600" />
                    <StatCard icon={ShoppingBag} label="Takeaway" value={filtered.filter(o => o.order_type === "takeaway").length} color="bg-orange-600" />
                  </div>

                  {/* Efficiency breakdown */}
                  {durations.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                      <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-400" /> Efficiency Breakdown
                      </h2>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-3xl font-black text-green-400">{fastOrders}</div>
                          <div className="text-xs text-gray-400 mt-1">Fast (≤5 min)</div>
                          <div className="text-xs text-green-500">{Math.round(fastOrders / durations.length * 100)}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-black text-yellow-400">{durations.filter(d => d > 5 && d <= 10).length}</div>
                          <div className="text-xs text-gray-400 mt-1">On-Time (6–10 min)</div>
                          <div className="text-xs text-yellow-500">{Math.round(durations.filter(d => d > 5 && d <= 10).length / durations.length * 100)}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-black text-red-400">{slowOrders}</div>
                          <div className="text-xs text-gray-400 mt-1">Slow ({">"}10 min)</div>
                          <div className="text-xs text-red-500">{Math.round(slowOrders / durations.length * 100)}%</div>
                        </div>
                      </div>
                      <div className="mt-4 h-2 rounded-full bg-gray-800 flex overflow-hidden">
                        <div className="bg-green-500 h-full transition-all" style={{ width: `${fastOrders / durations.length * 100}%` }} />
                        <div className="bg-yellow-500 h-full transition-all" style={{ width: `${durations.filter(d => d > 5 && d <= 10).length / durations.length * 100}%` }} />
                        <div className="bg-red-500 h-full transition-all" style={{ width: `${slowOrders / durations.length * 100}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Order list */}
                  <div className="space-y-2">
                    {filtered.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No orders found for this period</p>
                    ) : (
                      filtered.map(order => {
                        const dur = durationMins(order.placed_at, order.ready_at);
                        const isTakeaway = order.order_type === "takeaway";
                        const isCancelled = order.overall_status === "cancelled";
                        const speedColor = dur === null ? "text-gray-500" : dur <= 5 ? "text-green-400" : dur <= 10 ? "text-yellow-400" : "text-red-400";

                        return (
                          <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isCancelled ? "bg-red-600" : "bg-green-500"}`} />
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
                              <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
                                <span>Placed: {order.placed_at ? format(new Date(order.placed_at), "HH:mm") : "—"}</span>
                                {order.ready_at && <span>Ready: {format(new Date(order.ready_at), "HH:mm")}</span>}
                                <span className="text-gray-600">{order.items?.length} item{order.items?.length !== 1 ? "s" : ""}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {order.items?.slice(0, 3).map((item, i) => (
                                  <span key={i} className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
                                    {item.quantity > 1 ? `×${item.quantity} ` : ""}{item.product_name}
                                  </span>
                                ))}
                                {(order.items?.length || 0) > 3 && <span className="text-xs text-gray-600">+{order.items.length - 3} more</span>}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {dur !== null ? <div className={`text-2xl font-black ${speedColor}`}>{dur}m</div> : <div className="text-lg font-bold text-gray-600">—</div>}
                              <div className="text-xs text-gray-600">total time</div>
                              {dur !== null && <div className={`text-xs font-semibold mt-0.5 ${speedColor}`}>{dur <= 5 ? "⚡ Fast" : dur <= 10 ? "✓ On time" : "⚠ Slow"}</div>}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {activeOrders.map(order => (
                <OrderCard key={order.id} order={order} onMarkItemDone={markItemDone} onMarkStationDone={markStationDone} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}