import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import AppHeader from "@/components/shared/AppHeader";

const statusConfig = {
  pending: { icon: Clock, label: "Pending", color: "bg-[#F5EBE8] text-[#8B7355] border-[#E8DED8]" },
  confirmed: { icon: CheckCircle, label: "Confirmed", color: "bg-[#EDE8E3] text-[#6B5744] border-[#D4C4B0]" },
  processing: { icon: Package, label: "Processing", color: "bg-[#F5EBE8] text-[#8B7355] border-[#E8DED8]" },
  shipped: { icon: Truck, label: "Shipped", color: "bg-[#EDE8E3] text-[#6B5744] border-[#D4C4B0]" },
  delivered: { icon: CheckCircle, label: "Delivered", color: "bg-[#E3E8ED] text-[#5C7A55] border-[#C4D4B0]" },
  cancelled: { icon: XCircle, label: "Cancelled", color: "bg-[#F5E8E8] text-[#8B5555] border-[#E8D8D8]" }
};

export default function Orders() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        window.location.href = createPageUrl("Login") + "?next=" + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      }
      const u = await base44.auth.me();
      setUser(u);
    };
    loadUser();
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.email],
    queryFn: () => base44.entities.Order.filter({ customer_email: user?.email }, "-created_date"),
    enabled: !!user?.email
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <AppHeader 
        title="My Orders" 
        subtitle="Track your purchases" 
        icon={Package}
        backTo="Shop"
      />

      {/* Orders List */}
      <div className="max-w-3xl mx-auto px-5 py-6 pb-24 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl h-40 animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-[#D4C4B0] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#5C4A3A]">No orders yet</h3>
            <p className="text-[#8B7355] text-sm mt-2">Start shopping to see your orders here</p>
            <Link to={createPageUrl("Shop")}>
              <button className="mt-4 px-6 py-2 rounded-xl bg-[#8B7355] text-white hover:bg-[#6B5744]">
                Browse Shop
              </button>
            </Link>
          </div>
        ) : (
          <AnimatePresence>
            {orders.map((order, i) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-3xl border border-[#E8DED8] p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs text-[#8B7355]">Order #{order.order_number}</p>
                      <p className="text-sm text-[#8B7355] mt-1">
                        {order.created_date && format(new Date(order.created_date), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <Badge className={`${status.color} border flex items-center gap-1`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-[#5C4A3A]">
                          {item.product_name} <span className="text-[#8B7355]">x{item.quantity}</span>
                        </span>
                        <span className="font-medium text-[#5C4A3A]">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-[#F5EBE8] flex items-center justify-between">
                    <span className="font-semibold text-[#5C4A3A]">Total</span>
                    <span className="text-xl font-bold text-[#5C4A3A]">${order.total_amount?.toFixed(2)}</span>
                  </div>

                  {order.points_earned > 0 && (
                    <div className="mt-3 bg-[#F5EBE8] rounded-xl px-3 py-2 text-xs text-center text-[#8B7355]">
                      ✨ Earned {order.points_earned} loyalty points
                    </div>
                  )}

                  {order.shipping_address && (
                    <div className="mt-4 pt-4 border-t border-[#F5EBE8] text-xs text-[#8B7355]">
                      <p className="font-medium text-[#5C4A3A] mb-1">Shipping to:</p>
                      <p>{order.shipping_address.street}</p>
                      <p>{order.shipping_address.city}, {order.shipping_address.postal_code}</p>
                      <p>{order.shipping_address.country}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}