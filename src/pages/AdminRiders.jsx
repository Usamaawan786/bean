import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Bike, Phone, MapPin, Package, Loader2 } from "lucide-react";

export default function AdminRiders() {
  const { data: riders = [], isLoading } = useQuery({
    queryKey: ["riders"],
    queryFn: () => base44.entities.User.filter({ role: "rider" }),
  });

  const { data: riderLocations = [] } = useQuery({
    queryKey: ["allRiderLocations"],
    queryFn: () => base44.entities.RiderLocation.list("-updated_at", 100),
    refetchInterval: 15000,
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ["activeDeliveryOrders"],
    queryFn: () => base44.entities.DeliveryOrder.filter({ status: "out_for_delivery" }),
    refetchInterval: 15000,
  });

  const getRiderLocation = (email) => riderLocations.find((l) => l.rider_email === email);
  const getRiderOrders = (email) => activeOrders.filter((o) => o.rider_email === email);
  const isOnline = (loc) => loc && Date.now() - new Date(loc.updated_at).getTime() < 60000;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white px-5 py-6">
        <div className="flex items-center gap-2">
          <Bike className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Riders</h1>
        </div>
        <p className="text-white/70 text-sm mt-1">{riders.length} riders · {riders.filter((r) => isOnline(getRiderLocation(r.email))).length} online</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {riders.map((rider) => {
          const loc = getRiderLocation(rider.email);
          const orders = getRiderOrders(rider.email);
          const online = isOnline(loc);
          return (
            <div key={rider.id} className="bg-white rounded-2xl border border-[#E8DED8] p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[#8B7355] text-white flex items-center justify-center text-lg font-bold">
                    {(rider.full_name || rider.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${online ? "bg-green-500" : "bg-gray-400"}`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#5C4A3A]">{rider.full_name || rider.email}</div>
                  <div className="text-xs text-[#8B7355] flex items-center gap-1">
                    <Phone className="h-3 w-3" />{rider.phone || "No phone"}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${online ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {online ? "Online" : "Offline"}
                </span>
              </div>

              {orders.length > 0 && (
                <div className="bg-[#F5F1ED] rounded-lg p-2 space-y-1">
                  {orders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between text-xs text-[#5C4A3A]">
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" />{o.order_number}</span>
                      <span>{o.customer_name}</span>
                    </div>
                  ))}
                </div>
              )}

              {loc && (
                <div className="mt-2 text-xs text-[#8B7355] flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Last seen: {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  <span className="text-[#C9B8A6]">· {new Date(loc.updated_at).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          );
        })}

        {riders.length === 0 && (
          <div className="text-center py-12 text-[#8B7355]">
            <Bike className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No riders yet. Invite users with the 'rider' role from Staff Management.</p>
          </div>
        )}
      </div>
    </div>
  );
}