import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, CheckCircle2, Clock, AlertTriangle, ChefHat,
  Coffee, X, Wifi, ArrowLeft, BarChart3, RefreshCw
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const STATUS_CONFIG = {
  queued:      { label: "Queued",      color: "bg-gray-700 text-gray-200",       dot: "bg-gray-400" },
  in_progress: { label: "In Progress", color: "bg-yellow-900 text-yellow-300",   dot: "bg-yellow-400 animate-pulse" },
  ready:       { label: "Ready ✓",    color: "bg-green-900 text-green-300",      dot: "bg-green-400" },
  completed:   { label: "Completed",   color: "bg-blue-900 text-blue-300",       dot: "bg-blue-400" },
  cancelled:   { label: "Cancelled",   color: "bg-red-900 text-red-400",         dot: "bg-red-400" },
};

function OrderRow({ order, onComplete, onCancel }) {
  const status = STATUS_CONFIG[order.overall_status] || STATUS_CONFIG.queued;
  const isTakeaway = order.order_type === "takeaway";
  const mins = Math.floor((Date.now() - new Date(order.placed_at).getTime()) / 60000);
  const isOverdue = mins >= 10 && !["completed", "cancelled"].includes(order.overall_status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-gray-900 rounded-2xl border ${isOverdue ? "border-red-700" : isTakeaway ? "border-orange-800" : "border-gray-800"} overflow-hidden`}
    >
      <div className="p-4 flex items-start gap-4">
        {/* Order Number */}
        <div className="text-center flex-shrink-0">
          <div className="text-3xl font-black text-white leading-none">{order.order_number}</div>
          <div className={`text-xs mt-1 px-2 py-0.5 rounded-full font-semibold ${isTakeaway ? "bg-orange-900 text-orange-300" : "bg-gray-800 text-gray-400"}`}>
            {isTakeaway ? "TAKE" : "DINE"}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {order.customer_name && (
              <span className="text-white font-semibold text-sm">{order.customer_name}</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${status.color} flex items-center gap-1.5`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {isOverdue && (
              <span className="text-xs bg-red-900 text-red-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> OVERDUE {mins}m
              </span>
            )}
          </div>

          {/* Items summary */}
          <div className="flex flex-wrap gap-1 mb-2">
            {order.items.map((item, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1 ${
                  item.status === "done"
                    ? "bg-green-900/50 text-green-400 line-through"
                    : item.station === "bar"
                    ? "bg-blue-900/50 text-blue-300"
                    : "bg-gray-800 text-gray-300"
                }`}
              >
                {item.station === "bar" ? <Coffee className="h-2.5 w-2.5" /> : <ChefHat className="h-2.5 w-2.5" />}
                {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.product_name}
              </span>
            ))}
          </div>

          {/* Station statuses */}
          <div className="flex gap-2 text-xs">
            {order.kitchen_status !== "not_applicable" && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                order.kitchen_status === "done" ? "bg-green-900/40 text-green-400" :
                order.kitchen_status === "in_progress" ? "bg-yellow-900/40 text-yellow-400" :
                "bg-gray-800 text-gray-500"
              }`}>
                <ChefHat className="h-3 w-3" />
                Kitchen: {order.kitchen_status}
              </span>
            )}
            {order.bar_status !== "not_applicable" && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                order.bar_status === "done" ? "bg-green-900/40 text-green-400" :
                order.bar_status === "in_progress" ? "bg-yellow-900/40 text-yellow-400" :
                "bg-gray-800 text-gray-500"
              }`}>
                <Coffee className="h-3 w-3" />
                Bar: {order.bar_status}
              </span>
            )}
            <span className="text-gray-600 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(order.placed_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {order.overall_status === "ready" && (
            <button
              onClick={() => onComplete(order.id)}
              className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Served
            </button>
          )}
          {!["completed", "cancelled"].includes(order.overall_status) && (
            <button
              onClick={() => onCancel(order.id)}
              className="bg-red-900 hover:bg-red-800 text-red-400 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function OrderManager() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("active"); // active | ready | all
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || !["admin", "super_admin", "manager", "cashier"].includes(u?.role)) {
        window.location.href = "/StaffPortal";
        return;
      }
      setUser(u);
    });
  }, []);

  const loadOrders = async () => {
    let data;
    if (filter === "active") {
      const [queued, inProg] = await Promise.all([
        base44.entities.KitchenOrder.filter({ overall_status: "queued" }, "-priority,-placed_at", 50),
        base44.entities.KitchenOrder.filter({ overall_status: "in_progress" }, "-priority,-placed_at", 50),
      ]);
      data = [...queued, ...inProg];
    } else if (filter === "ready") {
      data = await base44.entities.KitchenOrder.filter({ overall_status: "ready" }, "-placed_at", 50);
    } else {
      data = await base44.entities.KitchenOrder.list("-placed_at", 100);
    }
    // Sort takeaway first for active
    if (filter !== "all") {
      data.sort((a, b) => {
        if (a.order_type === "takeaway" && b.order_type !== "takeaway") return -1;
        if (b.order_type === "takeaway" && a.order_type !== "takeaway") return 1;
        return new Date(a.placed_at) - new Date(b.placed_at);
      });
    }
    setOrders(data);
  };

  useEffect(() => {
    if (!user) return;
    loadOrders();
    const unsub = base44.entities.KitchenOrder.subscribe(() => loadOrders());
    return () => unsub();
  }, [user, filter]);

  const completeOrder = async (id) => {
    await base44.entities.KitchenOrder.update(id, {
      overall_status: "completed",
      completed_at: new Date().toISOString()
    });
    toast.success("Order marked as served!");
    loadOrders();
  };

  const cancelOrder = async (id) => {
    await base44.entities.KitchenOrder.update(id, { overall_status: "cancelled" });
    toast.success("Order cancelled");
    loadOrders();
  };

  const stats = {
    active: orders.filter(o => ["queued", "in_progress"].includes(o.overall_status)).length,
    ready: orders.filter(o => o.overall_status === "ready").length,
    takeaway: orders.filter(o => o.order_type === "takeaway" && !["completed", "cancelled"].includes(o.overall_status)).length,
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/StaffPortal" className="text-gray-500 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <ClipboardList className="h-6 w-6 text-amber-400" />
            <div>
              <h1 className="text-lg font-black">ORDER MANAGER</h1>
              <p className="text-gray-500 text-xs">Bean Coffee — Live Orders</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick stats */}
            <div className="flex gap-2">
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center min-w-[52px]">
                <div className="text-xl font-black text-yellow-400">{stats.active}</div>
                <div className="text-xs text-gray-500">Active</div>
              </div>
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center min-w-[52px]">
                <div className="text-xl font-black text-green-400">{stats.ready}</div>
                <div className="text-xs text-gray-500">Ready</div>
              </div>
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center min-w-[52px]">
                <div className="text-xl font-black text-orange-400">{stats.takeaway}</div>
                <div className="text-xs text-gray-500">Takeaway</div>
              </div>
            </div>
            <button onClick={loadOrders} className="text-gray-500 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { k: "active", label: "Active Orders" },
            { k: "ready", label: "Ready to Serve" },
            { k: "all", label: "All Today" },
          ].map(({ k, label }) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                filter === k
                  ? "bg-amber-400 text-gray-950"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Links to display screens */}
        <div className="flex gap-3 mb-6">
          <Link
            to="/KitchenDisplay"
            target="_blank"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-300 transition-colors"
          >
            <ChefHat className="h-4 w-4 text-amber-400" /> Kitchen Display ↗
          </Link>
          <Link
            to="/BarDisplay"
            target="_blank"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-300 transition-colors"
          >
            <Coffee className="h-4 w-4 text-blue-400" /> Bar Display ↗
          </Link>
        </div>

        {/* Orders list */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ClipboardList className="h-16 w-16 text-gray-700 mb-4" />
            <p className="text-gray-600 text-lg font-semibold">No orders</p>
            <p className="text-gray-700 text-sm mt-1">
              {filter === "active" ? "No active orders right now" : filter === "ready" ? "No orders ready to serve" : "No orders today"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {orders.map(order => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onComplete={completeOrder}
                  onCancel={cancelOrder}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}