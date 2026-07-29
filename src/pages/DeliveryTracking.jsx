import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Phone, MapPin, Loader2, ArrowLeft, Package } from "lucide-react";
import OrderProgressBar from "@/components/delivery/OrderProgressBar";
import TrackingMap from "@/components/delivery/TrackingMap";
import { Link } from "react-router-dom";

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DeliveryTracking() {
  const orderId = new URLSearchParams(window.location.search).get("order");
  const [showMap, setShowMap] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["deliveryOrder", orderId],
    queryFn: () => base44.entities.DeliveryOrder.get(orderId),
    enabled: !!orderId,
    refetchInterval: 10000,
  });

  const isTracking = order?.status === "out_for_delivery" && order?.rider_email;

  const { data: riderLoc } = useQuery({
    queryKey: ["riderLocation", order?.id],
    queryFn: async () => (await base44.entities.RiderLocation.filter({ order_id: order.id }))[0],
    enabled: !!isTracking,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1ED]">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F1ED] px-5">
        <Package className="h-12 w-12 text-[#C9B8A6] mb-3" />
        <p className="text-[#8B7355] mb-4">Order not found</p>
        <Link to="/Delivery" className="bg-[#5C4A3A] text-white px-5 py-2 rounded-xl text-sm">Back to Delivery</Link>
      </div>
    );
  }

  const customerPos = order.delivery_lat && order.delivery_lng ? [order.delivery_lat, order.delivery_lng] : null;
  const riderPos = riderLoc ? [riderLoc.latitude, riderLoc.longitude] : null;
  const distance = customerPos && riderPos ? haversine(...customerPos, ...riderPos) : null;
  const eta = distance != null ? Math.max(1, Math.round((distance / 20) * 60)) : null;

  return (
    <div className="min-h-screen bg-[#F5F1ED] pb-28">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white px-5 pt-8 pb-6">
        <Link to="/Delivery" className="inline-flex items-center gap-1 text-sm text-white/70 mb-3">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{order.order_number}</h1>
            <p className="text-white/70 text-sm mt-0.5">{order.customer_name}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">Rs. {order.total_amount}</div>
            <div className="text-white/70 text-xs">Cash on Delivery</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Progress Bar */}
        <OrderProgressBar status={order.status} />

        {/* ETA Banner */}
        {isTracking && eta != null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="text-3xl">🛵</div>
            <div>
              <div className="font-bold text-lg">{eta} min away</div>
              <div className="text-purple-100 text-sm">{distance.toFixed(1)} km remaining</div>
            </div>
          </motion.div>
        )}

        {/* Live Map */}
        {isTracking && (customerPos || riderPos) ? (
          <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden">
            <div className="h-64 w-full">
              <TrackingMap customerPos={customerPos} riderPos={riderPos} />
            </div>
          </div>
        ) : isTracking ? (
          <div className="bg-white rounded-2xl border border-[#E8DED8] p-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#8B7355] mx-auto mb-2" />
            <p className="text-sm text-[#8B7355]">Waiting for rider location...</p>
          </div>
        ) : null}

        {/* Rider Info */}
        {isTracking && order.rider_name && (
          <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-lg">🛵</div>
              <div>
                <div className="font-medium text-[#5C4A3A] text-sm">{order.rider_name}</div>
                <div className="text-xs text-[#8B7355]">Your delivery rider</div>
              </div>
            </div>
            {order.rider_phone && (
              <a href={`tel:${order.rider_phone}`} className="bg-green-600 text-white rounded-full p-3 hover:bg-green-700 active:scale-95 transition-all">
                <Phone className="h-5 w-5" />
              </a>
            )}
          </div>
        )}

        {/* Delivery Address */}
        <div className="bg-white rounded-2xl border border-[#E8DED8] p-4">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-[#8B7355] mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1">Delivery Address</div>
              <p className="text-sm text-[#5C4A3A]">{order.delivery_address}</p>
              {order.delivery_notes && <p className="text-xs text-[#8B7355] mt-1">📝 {order.delivery_notes}</p>}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-[#E8DED8] p-4">
          <h3 className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-2">Order Items</h3>
          <div className="space-y-2">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm text-[#5C4A3A]">
                <span>{item.quantity}× {item.product_name}</span>
                <span>Rs. {item.unit_price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#E8DED8] mt-2 pt-2 space-y-1 text-sm">
            <div className="flex justify-between text-[#8B7355]"><span>Subtotal</span><span>Rs. {order.subtotal}</span></div>
            <div className="flex justify-between text-[#8B7355]"><span>Delivery Fee</span><span>Rs. {order.delivery_fee}</span></div>
            <div className="flex justify-between font-bold text-[#5C4A3A]"><span>Total</span><span>Rs. {order.total_amount}</span></div>
          </div>
        </div>

        {order.status === "cancelled" && order.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
            <strong>Order cancelled:</strong> {order.rejection_reason}
          </div>
        )}
      </div>
    </div>
  );
}