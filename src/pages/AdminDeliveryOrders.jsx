import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Filter, Truck, Loader2, Bell } from "lucide-react";
import AdminOrderCard, { STATUS_CONFIG } from "@/components/delivery/AdminOrderCard";
import { toast } from "sonner";

const STATUS_FILTERS = ["all", "pending", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"];

export default function AdminDeliveryOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [knownPendingIds, setKnownPendingIds] = useState(new Set());
  const [newPendingIds, setNewPendingIds] = useState(new Set());
  const originalTitle = useRef(document.title);
  const audioCtxRef = useRef(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["adminDeliveryOrders"],
    queryFn: () => base44.entities.DeliveryOrder.list("-placed_at", 200),
    refetchInterval: 15000,
  });

  const { data: riders = [] } = useQuery({
    queryKey: ["riders"],
    queryFn: () => base44.entities.User.filter({ role: "rider" }),
  });

  // New pending order detection: beep + title flash
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const currentPendingIds = new Set(pendingOrders.map((o) => o.id));

  useEffect(() => {
    if (knownPendingIds.size > 0) {
      const newOnes = new Set();
      for (const id of currentPendingIds) {
        if (!knownPendingIds.has(id)) newOnes.add(id);
      }
      if (newOnes.size > 0) {
        setNewPendingIds((prev) => new Set([...prev, ...newOnes]));
        playBeep();
        if (Notification.permission === "granted") {
          new Notification("🔔 New Delivery Order!", { body: "A new order is pending acceptance" });
        }
      }
    }
    setKnownPendingIds(currentPendingIds);
  }, [JSON.stringify([...currentPendingIds].sort())]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === "default") Notification.requestPermission();
  }, []);

  // Title flash when there are new pending orders
  useEffect(() => {
    if (newPendingIds.size > 0) {
      const interval = setInterval(() => {
        document.title = document.title === originalTitle.current ? "🔔 New Order!" : originalTitle.current;
      }, 1000);
      return () => {
        clearInterval(interval);
        document.title = originalTitle.current;
      };
    }
  }, [newPendingIds.size]);

  const playBeep = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  const handleAction = async (orderId, action, payload) => {
    try {
      const now = new Date().toISOString();
      if (action === "accept") {
        await base44.entities.DeliveryOrder.update(orderId, { status: "accepted", accepted_at: now });
        toast.success("Order accepted");
      } else if (action === "reject") {
        await base44.entities.DeliveryOrder.update(orderId, { status: "cancelled", rejection_reason: payload });
        toast.success("Order rejected");
      } else if (action === "prepare") {
        await base44.entities.DeliveryOrder.update(orderId, { status: "preparing" });
        toast.success("Order moved to preparing");
      } else if (action === "assign") {
        await base44.entities.DeliveryOrder.update(orderId, {
          status: "out_for_delivery",
          rider_email: payload.email,
          rider_name: payload.full_name || payload.email,
          rider_phone: payload.phone || "",
        });
        toast.success(`Assigned to ${payload.full_name || payload.email}`);
      } else if (action === "deliver") {
        await base44.entities.DeliveryOrder.update(orderId, { status: "delivered", delivered_at: now });
        toast.success("Order marked delivered");
      }
      setNewPendingIds((prev) => { const n = new Set(prev); n.delete(orderId); return n; });
      queryClient.invalidateQueries({ queryKey: ["adminDeliveryOrders"] });
    } catch (e) {
      toast.error("Action failed: " + (e.response?.data?.error || e.message));
    }
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.order_number?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = STATUS_FILTERS.reduce((acc, s) => {
    if (s === "all") return acc;
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white px-5 py-6">
        <div className="flex items-center gap-2 mb-1">
          <Truck className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Delivery Orders</h1>
        </div>
        <p className="text-white/70 text-sm">Live order board — auto-refreshes every 15s</p>
        {pendingOrders.length > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-200 px-3 py-1 rounded-full text-xs font-medium">
            <Bell className="h-3 w-3" /> {pendingOrders.length} pending
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Filters */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B7355]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order # or customer..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#E8DED8] rounded-xl text-sm text-[#5C4A3A]"
            />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === s ? "bg-[#5C4A3A] text-white" : "bg-white text-[#8B7355] border border-[#E8DED8]"
              }`}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s]?.label} {s !== "all" && counts[s] > 0 && `(${counts[s]})`}
            </button>
          ))}
        </div>

        {/* Order Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {filtered.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AdminOrderCard
                order={order}
                riders={riders}
                onAction={handleAction}
                isNew={newPendingIds.has(order.id)}
              />
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#8B7355]">
            <Filter className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}