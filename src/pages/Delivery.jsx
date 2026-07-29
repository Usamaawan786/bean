import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Plus, Minus, ShoppingCart, X, MapPin, Phone, ArrowLeft, Check, Loader2, Package } from "lucide-react";
import DeliveryProductCard from "@/components/delivery/DeliveryProductCard";
import { toast } from "sonner";

export default function Delivery() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [view, setView] = useState("menu");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [checkout, setCheckout] = useState({ address: "", notes: "", phone: "" });
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u) { base44.auth.redirectToLogin("/Delivery"); return; }
      setUser(u);
    }).catch(() => base44.auth.redirectToLogin("/Delivery"));
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ["deliveryProducts"],
    queryFn: () => base44.entities.DeliveryProduct.filter({ is_available: true }, "sort_order", 200),
  });

  const { data: settings } = useQuery({
    queryKey: ["deliverySettings"],
    queryFn: async () => (await base44.entities.DeliverySettings.list())[0],
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ["myDeliveryOrders", user?.email],
    queryFn: () => base44.entities.DeliveryOrder.filter({ customer_email: user.email }),
    enabled: !!user?.email,
    refetchInterval: 15000,
  });

  const myActive = activeOrders.filter((o) => !["delivered", "cancelled"].includes(o.status));

  const categories = ["All", ...new Set(products.map((p) => p.category))];
  const filtered = selectedCategory === "All" ? products : products.filter((p) => p.category === selectedCategory);

  const cartItems = cart
    .map((item) => ({ ...item, product: products.find((p) => p.id === item.product_id) }))
    .filter((i) => i.product);
  const subtotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const deliveryFee = settings?.flat_delivery_fee || 150;
  const total = subtotal + deliveryFee;
  const isDeliveryOpen = settings?.is_delivery_open !== false;

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) return prev.map((i) => (i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { product_id: product.id, quantity: 1 }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product_id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handlePlaceOrder = async () => {
    if (!user) { toast.error("Please log in to place an order"); return; }
    if (!checkout.address.trim()) { toast.error("Please enter your delivery address"); return; }
    if (!checkout.phone.trim()) { toast.error("Please enter your phone number"); return; }
    if (!isDeliveryOpen) { toast.error("Delivery is currently closed"); return; }
    setPlacing(true);
    try {
      const res = await base44.functions.invoke("createDeliveryOrder", {
        items: cart,
        delivery_address: checkout.address,
        delivery_notes: checkout.notes,
        customer_phone: checkout.phone,
      });
      queryClient.invalidateQueries({ queryKey: ["myDeliveryOrders"] });
      toast.success("Order placed successfully!");
      setCart([]);
      setView("menu");
      navigate(`/DeliveryTracking?order=${res.data.order.id}`);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1ED] pb-28">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white px-5 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Truck className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Delivery</h1>
        </div>
        <p className="text-white/70 text-sm">Order your favorite coffee for delivery</p>
        <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isDeliveryOpen ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-200"}`}>
          <span className={`w-2 h-2 rounded-full ${isDeliveryOpen ? "bg-green-400" : "bg-red-400"}`} />
          {isDeliveryOpen ? "Open for orders" : "Currently closed"}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">
        {/* Active Orders */}
        {myActive.length > 0 && view === "menu" && (
          <div className="mt-4 space-y-2">
            <h2 className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide">Your Active Orders</h2>
            {myActive.map((order) => (
              <button
                key={order.id}
                onClick={() => navigate(`/DeliveryTracking?order=${order.id}`)}
                className="w-full bg-white rounded-xl border border-[#E8DED8] p-3 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-[#8B7355]" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-[#5C4A3A]">{order.order_number}</div>
                    <div className="text-xs text-[#8B7355] capitalize">{order.status.replace(/_/g, " ")}</div>
                  </div>
                </div>
                <span className="text-xs text-[#8B7355] font-medium">Track →</span>
              </button>
            ))}
          </div>
        )}

        {view === "menu" && (
          <>
            {/* Category Chips */}
            <div className="flex gap-2 overflow-x-auto py-4 -mx-4 px-4 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? "bg-[#5C4A3A] text-white"
                      : "bg-white text-[#8B7355] border border-[#E8DED8]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products */}
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((product) => (
                <DeliveryProductCard key={product.id} product={product} onAdd={addToCart} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-[#8B7355]">
                <Truck className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No products available</p>
              </div>
            )}
          </>
        )}

        {view === "checkout" && (
          <div className="py-4 space-y-4">
            <button onClick={() => setView("menu")} className="flex items-center gap-1 text-sm text-[#8B7355]">
              <ArrowLeft className="h-4 w-4" /> Back to menu
            </button>

            {/* Cart Items */}
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 space-y-3">
              <h2 className="font-semibold text-[#5C4A3A]">Order Summary</h2>
              {cartItems.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={item.product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-[#F5EBE8]" />
                    <div>
                      <div className="text-sm text-[#5C4A3A]">{item.product.name}</div>
                      <div className="text-xs text-[#8B7355]">Rs. {item.product.price} × {item.quantity}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.product_id, -1)} className="w-7 h-7 rounded-full bg-[#F5F1ED] flex items-center justify-center text-[#5C4A3A]"><Minus className="h-3 w-3" /></button>
                    <span className="text-sm w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product_id, 1)} className="w-7 h-7 rounded-full bg-[#F5F1ED] flex items-center justify-center text-[#5C4A3A]"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
              <div className="border-t border-[#E8DED8] pt-2 space-y-1 text-sm">
                <div className="flex justify-between text-[#8B7355]"><span>Subtotal</span><span>Rs. {subtotal}</span></div>
                <div className="flex justify-between text-[#8B7355]"><span>Delivery Fee</span><span>Rs. {deliveryFee}</span></div>
                <div className="flex justify-between font-bold text-[#5C4A3A]"><span>Total</span><span>Rs. {total}</span></div>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 space-y-3">
              <h2 className="font-semibold text-[#5C4A3A]">Delivery Details</h2>
              <div>
                <label className="text-xs text-[#8B7355] flex items-center gap-1 mb-1"><MapPin className="h-3 w-3" /> Address</label>
                <textarea
                  value={checkout.address}
                  onChange={(e) => setCheckout({ ...checkout, address: e.target.value })}
                  placeholder="House #, Street, Area, City"
                  rows={2}
                  className="w-full border border-[#D4C4B0] rounded-lg p-2 text-sm text-[#5C4A3A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8B7355] flex items-center gap-1 mb-1"><Phone className="h-3 w-3" /> Phone Number</label>
                <input
                  value={checkout.phone}
                  onChange={(e) => setCheckout({ ...checkout, phone: e.target.value })}
                  placeholder="03XX-XXXXXXX"
                  className="w-full border border-[#D4C4B0] rounded-lg p-2 text-sm text-[#5C4A3A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8B7355] mb-1 block">Delivery Notes (optional)</label>
                <input
                  value={checkout.notes}
                  onChange={(e) => setCheckout({ ...checkout, notes: e.target.value })}
                  placeholder="e.g. Ring the doorbell"
                  className="w-full border border-[#D4C4B0] rounded-lg p-2 text-sm text-[#5C4A3A]"
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center gap-2">
              <span>💵</span> Cash on Delivery — Pay Rs. {total} when your order arrives
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placing || !isDeliveryOpen}
              className="w-full bg-[#5C4A3A] text-white font-semibold py-3.5 rounded-xl hover:bg-[#6B5744] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {placing ? <><Loader2 className="h-4 w-4 animate-spin" /> Placing Order...</> : <><Check className="h-4 w-4" /> Place Order — Rs. {total}</>}
            </button>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cart.length > 0 && view === "menu" && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-16 left-0 right-0 z-40 px-4"
          >
            <button
              onClick={() => setView("checkout")}
              className="w-full max-w-lg mx-auto bg-[#5C4A3A] text-white rounded-2xl py-3 px-5 flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span className="font-medium">{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
              </div>
              <span className="font-bold">Rs. {total}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}