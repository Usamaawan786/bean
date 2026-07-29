import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bike, Phone, MapPin, Package, Loader2, LogOut, Navigation, Square, Check } from "lucide-react";
import { toast } from "sonner";

export default function RiderPortal() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (!u) { base44.auth.redirectToLogin("/RiderPortal"); return; }
      if (u.role !== "rider") { window.location.replace("/Home"); return; }
      setUser(u);
      setPhoneInput(u.phone || "");
      setLoading(false);
    }).catch(() => base44.auth.redirectToLogin("/RiderPortal"));
  }, []);

  const { data: activeOrders = [] } = useQuery({
    queryKey: ["riderOrders", user?.email],
    queryFn: () => base44.entities.DeliveryOrder.filter({ rider_email: user.email, status: "out_for_delivery" }),
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  // GPS Broadcasting
  useEffect(() => {
    if (!isBroadcasting || !user?.email || activeOrders.length === 0) return;

    const updateLocation = () => {
      if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude, heading } = pos.coords;
          const now = new Date().toISOString();
          for (const order of activeOrders) {
            try {
              const existing = await base44.entities.RiderLocation.filter({ order_id: order.id });
              if (existing.length > 0) {
                await base44.entities.RiderLocation.update(existing[0].id, {
                  latitude, longitude, heading: heading || 0, updated_at: now,
                });
              } else {
                await base44.entities.RiderLocation.create({
                  rider_email: user.email,
                  rider_name: user.full_name || user.email,
                  order_id: order.id,
                  latitude, longitude, heading: heading || 0, updated_at: now,
                });
              }
            } catch (e) { console.error("Location update failed:", e); }
          }
        },
        (err) => toast.error("GPS error: " + err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    updateLocation();
    intervalRef.current = setInterval(updateLocation, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isBroadcasting, user?.email, JSON.stringify(activeOrders.map((o) => o.id))]);

  const handleMarkDelivered = async (orderId) => {
    try {
      await base44.entities.DeliveryOrder.update(orderId, { status: "delivered", delivered_at: new Date().toISOString() });
      toast.success("Order marked delivered");
      queryClient.invalidateQueries({ queryKey: ["riderOrders"] });
    } catch (e) {
      toast.error("Failed to mark delivered");
    }
  };

  const savePhone = async () => {
    setSavingPhone(true);
    try {
      await base44.auth.updateMe({ phone: phoneInput });
      setUser({ ...user, phone: phoneInput });
      toast.success("Phone number saved");
    } catch (e) {
      toast.error("Failed to save phone");
    } finally {
      setSavingPhone(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1612] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Dark Header */}
      <div className="bg-gradient-to-br from-[#3a3329] to-[#1a1612] text-white px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bike className="h-6 w-6 text-amber-400" />
            <h1 className="text-xl font-bold">Rider Portal</h1>
          </div>
          <button onClick={() => base44.auth.logout("/")} className="flex items-center gap-1 text-white/60 text-sm">
            <LogOut className="h-4 w-4" /> Exit
          </button>
        </div>
        <div className="text-white/80 text-sm">{user?.full_name || user?.email}</div>

        {/* Phone Setup */}
        {!user?.phone && (
          <div className="mt-4 bg-amber-400/10 border border-amber-400/30 rounded-xl p-3">
            <div className="text-amber-300 text-xs mb-2 flex items-center gap-1"><Phone className="h-3 w-3" /> Add your phone so customers can call you</div>
            <div className="flex gap-2">
              <input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="03XX-XXXXXXX" className="flex-1 bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 text-sm" />
              <button onClick={savePhone} disabled={savingPhone} className="bg-amber-400 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {savingPhone ? "..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Broadcast Toggle */}
        {activeOrders.length > 0 && (
          <button
            onClick={() => setIsBroadcasting(!isBroadcasting)}
            className={`mt-4 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              isBroadcasting ? "bg-red-600 text-white" : "bg-green-500 text-gray-900"
            }`}
          >
            {isBroadcasting ? <><Square className="h-5 w-5" /> Broadcasting GPS — Tap to End Shift</> : <><Navigation className="h-5 w-5" /> Start Delivery (Share GPS)</>}
          </button>
        )}
        {isBroadcasting && (
          <div className="mt-2 text-center text-xs text-green-300 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Live GPS sharing active
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-20 space-y-3">
        {activeOrders.length === 0 && (
          <div className="text-center py-16 text-[#8B7355]">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active deliveries assigned</p>
            <p className="text-xs text-[#C9B8A6] mt-1">New orders will appear here when assigned</p>
          </div>
        )}

        {activeOrders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#E8DED8] p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-[#5C4A3A]">{order.order_number}</span>
              <span className="text-sm font-medium text-purple-600">Rs. {order.total_amount}</span>
            </div>

            <div className="space-y-2 text-sm text-[#5C4A3A]">
              <div className="flex items-center gap-2"><Package className="h-4 w-4 text-[#8B7355]" />{order.customer_name}</div>
              <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-[#8B7355] mt-0.5" /><div><div>{order.delivery_address}</div>{order.delivery_notes && <div className="text-xs text-[#8B7355] mt-0.5">📝 {order.delivery_notes}</div>}</div></div>
              {order.customer_phone && (
                <a href={`tel:${order.customer_phone}`} className="flex items-center gap-2 text-blue-600"><Phone className="h-4 w-4" />{order.customer_phone}</a>
              )}
            </div>

            <div className="mt-3 bg-[#F5F1ED] rounded-lg p-2 text-xs text-[#5C4A3A]">
              {order.items?.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span>{item.quantity}× {item.product_name}</span>
                  <span>Rs. {item.unit_price * item.quantity}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleMarkDelivered(order.id)}
              className="mt-3 w-full bg-green-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700"
            >
              <Check className="h-5 w-5" /> Mark as Delivered
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}