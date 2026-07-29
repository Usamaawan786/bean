import { useState } from "react";
import { Clock, MapPin, Phone, User, ChevronDown, Check, X } from "lucide-react";

export const STATUS_CONFIG = {
  pending: { label: "Pending", cls: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  accepted: { label: "Accepted", cls: "bg-blue-100 text-blue-700 border-blue-300" },
  preparing: { label: "Preparing", cls: "bg-orange-100 text-orange-700 border-orange-300" },
  out_for_delivery: { label: "Out for Delivery", cls: "bg-purple-100 text-purple-700 border-purple-300" },
  delivered: { label: "Delivered", cls: "bg-green-100 text-green-700 border-green-300" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700 border-red-300" },
};

export default function AdminOrderCard({ order, riders, onAction, isNew }) {
  const [showRiders, setShowRiders] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const elapsed = order.placed_at ? Math.round((Date.now() - new Date(order.placed_at).getTime()) / 60000) : 0;

  const handleReject = () => {
    if (!reason.trim()) return;
    onAction(order.id, "reject", reason.trim());
    setRejecting(false);
    setReason("");
  };

  return (
    <div className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${isNew ? "border-yellow-400 ring-2 ring-yellow-200 animate-pulse" : "border-[#E8DED8]"}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-bold text-sm text-[#5C4A3A]">{order.order_number}</span>
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium border ${status.cls}`}>{status.label}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-[#8B7355]">
          <Clock className="h-3 w-3" />{elapsed}m ago
        </div>
      </div>

      <div className="space-y-1 text-sm text-[#5C4A3A]">
        <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-[#8B7355]" />{order.customer_name}</div>
        <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#8B7355]" />{order.customer_phone || "N/A"}</div>
        <div className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#8B7355] mt-0.5" /><span className="flex-1">{order.delivery_address}</span></div>
      </div>

      <div className="mt-2 bg-[#F5F1ED] rounded-lg p-2 text-xs text-[#5C4A3A]">
        {order.items?.map((item, i) => (
          <div key={i} className="flex justify-between">
            <span>{item.quantity}× {item.product_name}</span>
            <span>Rs. {item.unit_price * item.quantity}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold mt-1 pt-1 border-t border-[#E8DED8]">
          <span>Total</span>
          <span>Rs. {order.total_amount}</span>
        </div>
      </div>

      {order.rider_name && order.status === "out_for_delivery" && (
        <div className="mt-2 text-xs text-purple-700 bg-purple-50 rounded-lg p-2">
          🛵 Rider: {order.rider_name}
        </div>
      )}

      {rejecting ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="w-full text-sm border border-[#D4C4B0] rounded-lg p-2 text-[#5C4A3A]"
            rows={2}
          />
          <div className="flex gap-2">
            <button onClick={handleReject} className="flex-1 bg-red-600 text-white text-xs font-medium rounded-lg py-2">Confirm Reject</button>
            <button onClick={() => setRejecting(false)} className="px-3 bg-gray-100 text-gray-600 text-xs rounded-lg py-2">Cancel</button>
          </div>
        </div>
      ) : showRiders ? (
        <div className="mt-2 space-y-1">
          <div className="text-xs font-medium text-[#5C4A3A] mb-1">Select a rider:</div>
          {riders.length === 0 && <div className="text-xs text-gray-400">No riders available</div>}
          {riders.map((rider) => (
            <button
              key={rider.id}
              onClick={() => { onAction(order.id, "assign", rider); setShowRiders(false); }}
              className="w-full flex items-center justify-between bg-[#F5F1ED] hover:bg-[#EBE5DF] rounded-lg p-2 text-xs text-[#5C4A3A] transition-colors"
            >
              <span>{rider.full_name || rider.email}</span>
              <span className="text-[#8B7355]">{rider.phone || "No phone"}</span>
            </button>
          ))}
          <button onClick={() => setShowRiders(false)} className="w-full text-xs text-gray-400 py-1">Close</button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          {order.status === "pending" && (
            <>
              <button onClick={() => onAction(order.id, "accept")} className="flex-1 bg-green-600 text-white text-xs font-medium rounded-lg py-2 hover:bg-green-700">Accept</button>
              <button onClick={() => setRejecting(true)} className="flex-1 bg-red-100 text-red-600 text-xs font-medium rounded-lg py-2 hover:bg-red-200">Reject</button>
            </>
          )}
          {order.status === "accepted" && (
            <button onClick={() => onAction(order.id, "prepare")} className="flex-1 bg-orange-600 text-white text-xs font-medium rounded-lg py-2 hover:bg-orange-700">Start Preparing</button>
          )}
          {order.status === "preparing" && (
            <button onClick={() => setShowRiders(true)} className="flex-1 bg-purple-600 text-white text-xs font-medium rounded-lg py-2 hover:bg-purple-700 flex items-center justify-center gap-1">
              Assign Rider <ChevronDown className="h-3 w-3" />
            </button>
          )}
          {order.status === "out_for_delivery" && (
            <button onClick={() => onAction(order.id, "deliver")} className="flex-1 bg-green-600 text-white text-xs font-medium rounded-lg py-2 hover:bg-green-700">Mark Delivered</button>
          )}
          {(order.status === "delivered" || order.status === "cancelled") && (
            <div className="flex-1 text-center text-xs text-gray-400 py-2">No actions</div>
          )}
        </div>
      )}
    </div>
  );
}