import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck, Loader2, Bell } from "lucide-react";
import { toast } from "sonner";
import AdminOrderCard, { STATUS_CONFIG } from "@/components/delivery/AdminOrderCard";

const FILTERS = ["active", "pending", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"];

// Shared by the POS tab badge and the panel (same cache key)
export function useDeliveryBoard(enabled = true) {
  return useQuery({
    queryKey: ["posDeliveryBoard"],
    queryFn: async () => {
      const res = await base44.functions.invoke("posDelivery", { action: "list" });
      if (res.data?.error) throw new Error(res.data.error);
      return { orders: res.data.orders || [], riders: res.data.riders || [] };
    },
    enabled,
    refetchInterval: 10000,
    retry: false,
  });
}

// ONE customer push for ONE order; never blocks the action
const notifyCustomer = (orderId, status) =>
  base44.functions.invoke("notifyDeliveryStatus", { order_id: orderId, status }).catch((e) => console.error("notifyDeliveryStatus failed:", e));

// Runs a delivery action through the server (validated, ticket + KDS created on accept) and sends the right push
export async function runDeliveryAction(orderId, action, payload) {
  const body = { order_id: orderId };
  if (action === "reject") { body.action = "reject"; body.reason = payload; }
  else if (action === "assign") { body.action = "assign"; body.rider_email = payload.email; }
  else body.action = action === "prepare" ? "prepare" : action === "deliver" ? "deliver" : "accept";
  const res = await base44.functions.invoke("posDelivery", body);
  if (res.data?.error) throw new Error(res.data.error);

  if (action === "accept") { notifyCustomer(orderId, "accepted"); toast.success(`Accepted — ticket ${res.data.ticket_number} sent to POS and kitchen`); }
  else if (action === "reject") { notifyCustomer(orderId, "rejected"); toast.success("Order rejected"); }
  else if (action === "prepare") { notifyCustomer(orderId, "preparing"); toast.success("Order moved to preparing"); }
  else if (action === "assign") {
    notifyCustomer(orderId, "rider_picked_up");
    base44.functions.invoke("notifyRiderAssigned", { order_id: orderId }).catch((e) => console.error("notifyRiderAssigned failed:", e));
    toast.success(`Picked up by ${res.data.rider_name || payload.full_name || payload.email}`);
  } else if (action === "deliver") { notifyCustomer(orderId, "delivered"); toast.success("Order marked delivered"); }
  return res.data;
}

export default function DeliveryOrdersPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useDeliveryBoard(true);
  const orders = data?.orders || [];
  const riders = data?.riders || [];
  const [filter, setFilter] = useState("active");
  const [busy, setBusy] = useState(false);
  const knownPending = useRef(null);
  const audioRef = useRef(null);

  const pending = orders.filter((o) => o.status === "pending");

  const beep = () => {
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start(); osc.stop(ctx.currentTime + 0.6);
    } catch (e) { /* sound is a nicety */ }
  };

  // Beep when a NEW pending order shows up (not on first load)
  const pendingKey = pending.map((o) => o.id).sort().join(",");
  useEffect(() => {
    const ids = new Set(pending.map((o) => o.id));
    if (knownPending.current) {
      for (const id of ids) if (!knownPending.current.has(id)) { beep(); toast.info("🔔 New delivery order!"); break; }
    }
    knownPending.current = ids;
  }, [pendingKey]);

  const handleAction = async (orderId, action, payload) => {
    if (busy) return;
    setBusy(true);
    try {
      await runDeliveryAction(orderId, action, payload);
      queryClient.invalidateQueries({ queryKey: ["posDeliveryBoard"] });
      queryClient.invalidateQueries({ queryKey: ["open-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["open-ticket-items-all"] });
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || "Action failed", { duration: 8000 });
    } finally {
      setBusy(false);
    }
  };

  const recentCutoff = Date.now() - 24 * 3600 * 1000;
  const visible = orders.filter((o) => {
    if (filter === "active") return !["delivered", "cancelled"].includes(o.status);
    if (o.status !== filter) return false;
    return filter === "delivered" || filter === "cancelled" ? new Date(o.placed_at || o.created_date).getTime() > recentCutoff : true;
  });

  if (isLoading) return <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" /></div>;
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8DED8] p-8 text-center text-sm text-[#8B7355]">
        {error.response?.data?.error || error.message || "Couldn't load delivery orders"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-[#8B7355]" />
        <h2 className="font-semibold text-[#5C4A3A]">Delivery Orders</h2>
        {pending.length > 0 && (
          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <Bell className="h-3 w-3" /> {pending.length} waiting
          </span>
        )}
        <span className="ml-auto text-xs text-[#8B7355]">Accepting sends the order to the kitchen and creates its POS ticket</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filter === s ? "bg-[#5C4A3A] text-white" : "bg-white text-[#8B7355] border border-[#E8DED8]"}`}
          >
            {s === "active" ? "Active" : STATUS_CONFIG[s]?.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((order) => (
          <AdminOrderCard key={order.id} order={order} riders={riders} onAction={handleAction} isNew={order.status === "pending"} />
        ))}
      </div>

      {visible.length === 0 && (
        <div className="text-center py-16 text-[#8B7355] text-sm">No delivery orders here</div>
      )}
    </div>
  );
}
