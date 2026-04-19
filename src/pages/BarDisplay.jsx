import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Coffee, AlertTriangle, Wifi } from "lucide-react";
import { format } from "date-fns";

const STATION = "bar";

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
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`bg-gray-900 border-2 ${borderColor} rounded-2xl overflow-hidden`}
    >
      {/* Header */}
      <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-white">{order.order_number}</span>
          {isTakeaway && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> TAKEAWAY
            </span>
          )}
          {!isTakeaway && (
            <span className="bg-blue-800 text-blue-200 text-xs font-semibold px-2 py-1 rounded-full">
              DINE IN
            </span>
          )}
          {order.customer_name && (
            <span className="text-gray-300 text-sm font-medium">{order.customer_name}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ElapsedTimer placedAt={order.placed_at} />
          {allDone && (
            <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              DONE ✓
            </span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-3">
        {myItems.map((item, idx) => {
          const globalIdx = order.items.findIndex(
            (it, i) => it.product_id === item.product_id && it.station === STATION && i >= idx
          );
          const isDone = item.status === "done";
          return (
            <div
              key={idx}
              className={`flex items-center gap-3 rounded-xl p-3 transition-all ${
                isDone ? "bg-green-900/30 opacity-60" : "bg-gray-800"
              }`}
            >
              <button
                onClick={() => !isDone && onMarkItemDone(order.id, order.items.indexOf(item), item)}
                className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                  isDone
                    ? "border-green-500 bg-green-500"
                    : "border-gray-500 hover:border-green-400 active:scale-95"
                }`}
              >
                {isDone && <CheckCircle2 className="h-5 w-5 text-white" />}
              </button>
              <div className="flex-1">
                <p className={`text-lg font-bold leading-tight ${isDone ? "line-through text-gray-500" : "text-white"}`}>
                  {item.quantity > 1 && <span className="text-blue-400 mr-1">×{item.quantity}</span>}
                  {item.product_name}
                </p>
                {item.notes && (
                  <p className="text-yellow-400 text-sm mt-1 font-medium">⚠ {item.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Station Done Button */}
      {!allDone && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onMarkStationDone(order.id)}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold py-3 rounded-xl text-base transition-all"
          >
            ✓ All Drinks Ready
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function BarDisplay() {
  const [orders, setOrders] = useState([]);

  const loadOrders = async () => {
    const data = await base44.entities.KitchenOrder.filter(
      { bar_status: ["pending", "in_progress"] },
      "-priority,-placed_at",
      50
    );
    data.sort((a, b) => {
      if (a.order_type === "takeaway" && b.order_type !== "takeaway") return -1;
      if (b.order_type === "takeaway" && a.order_type !== "takeaway") return 1;
      return new Date(a.placed_at) - new Date(b.placed_at);
    });
    setOrders(data);
  };

  useEffect(() => {
    loadOrders();
    const unsub = base44.entities.KitchenOrder.subscribe((event) => {
      if (event.type === "create") {
        const o = event.data;
        if (o.bar_status === "pending" || o.bar_status === "in_progress") {
          setOrders(prev => {
            const next = [o, ...prev.filter(x => x.id !== o.id)];
            next.sort((a, b) => {
              if (a.order_type === "takeaway" && b.order_type !== "takeaway") return -1;
              if (b.order_type === "takeaway" && a.order_type !== "takeaway") return 1;
              return new Date(a.placed_at) - new Date(b.placed_at);
            });
            return next;
          });
        }
      } else if (event.type === "update") {
        const o = event.data;
        if (o.bar_status === "done" || o.bar_status === "not_applicable" || o.overall_status === "completed" || o.overall_status === "cancelled") {
          setOrders(prev => prev.filter(x => x.id !== o.id));
        } else {
          setOrders(prev => {
            const next = prev.map(x => x.id === o.id ? o : x);
            next.sort((a, b) => {
              if (a.order_type === "takeaway" && b.order_type !== "takeaway") return -1;
              if (b.order_type === "takeaway" && a.order_type !== "takeaway") return 1;
              return new Date(a.placed_at) - new Date(b.placed_at);
            });
            return next;
          });
        }
      }
    });
    return () => unsub();
  }, []);

  const markItemDone = async (orderId, itemIndex, item) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const updatedItems = order.items.map((it, idx) =>
      idx === itemIndex ? { ...it, status: "done" } : it
    );
    const barItems = updatedItems.filter(i => i.station === "bar");
    const allBarDone = barItems.every(i => i.status === "done");
    const updates = {
      items: updatedItems,
      bar_status: allBarDone ? "done" : "in_progress"
    };
    if (allBarDone) {
      const kitchenItems = updatedItems.filter(i => i.station === "kitchen");
      const allKitchenDone = kitchenItems.length === 0 || kitchenItems.every(i => i.status === "done");
      if (allKitchenDone) updates.overall_status = "ready";
    }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    await base44.entities.KitchenOrder.update(orderId, updates);
  };

  const markStationDone = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const updatedItems = order.items.map(it =>
      it.station === "bar" ? { ...it, status: "done" } : it
    );
    const kitchenItems = updatedItems.filter(i => i.station === "kitchen");
    const allKitchenDone = kitchenItems.length === 0 || kitchenItems.every(i => i.status === "done");
    const updates = {
      items: updatedItems,
      bar_status: "done",
      ...(allKitchenDone && { overall_status: "ready" })
    };
    setOrders(prev => prev.filter(o => o.id !== orderId));
    await base44.entities.KitchenOrder.update(orderId, updates);
  };

  const activeOrders = orders.filter(o => o.bar_status !== "not_applicable");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
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
            <Wifi className="h-3.5 w-3.5" />
            <span>Live</span>
          </div>
          <div className="text-gray-500 text-sm">{format(new Date(), "HH:mm")}</div>
        </div>
      </div>

      {/* Order Grid */}
      <div className="p-5">
        {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center">
            <Coffee className="h-20 w-20 text-gray-700 mb-4" />
            <h2 className="text-2xl font-bold text-gray-600">All Clear!</h2>
            <p className="text-gray-700 mt-2">No pending drink orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {activeOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onMarkItemDone={markItemDone}
                  onMarkStationDone={markStationDone}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}