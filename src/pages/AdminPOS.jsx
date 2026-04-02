import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Receipt, Settings, CreditCard, Banknote, Package, TrendingDown, BarChart3, ListTodo, Users, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProductManager from "@/components/admin/ProductManager";
import BillGenerator from "@/components/admin/BillGenerator";

export default function AdminPOS() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "" });
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [showBill, setShowBill] = useState(false);
  const [generatedBill, setGeneratedBill] = useState(null);
  const [completing, setCompleting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      if (!["admin", "super_admin", "manager", "cashier"].includes(u?.role)) {
        window.location.href = "/StaffPortal";
        return;
      }
      setUser(u);
    };
    loadUser();
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ["store-products-admin"],
    queryFn: () => base44.entities.StoreProduct.list(),
    enabled: !!user
  });

  const filteredProducts = products.filter(p => 
    p.is_available && p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId, change) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + change;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = paymentMethod === "Card" ? 0.05 : 0.17; // 5% for Card, 17% for Cash
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const completeSale = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      const billNumber = "INV-" + Date.now().toString().slice(-8);
      const qrCodeId = "QR-" + Date.now().toString() + "-" + Math.random().toString(36).substring(2, 9).toUpperCase();

      // Fetch reward settings for dynamic points calculation
      let pkrPerPoint = 100; // default fallback
      try {
        const settings = await base44.entities.RewardSettings.list("-created_date", 1);
        if (settings.length > 0 && settings[0].pkr_per_point) {
          pkrPerPoint = settings[0].pkr_per_point;
        }
      } catch (e) { /* use default */ }

      const pointsToAward = Math.floor(subtotal / pkrPerPoint);
      const qrExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      try {
        await base44.entities.StoreSale.create({
          bill_number: billNumber,
          customer_name: customerInfo.name || null,
          customer_phone: customerInfo.phone || null,
          items: cart.map(item => ({
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          subtotal,
          tax,
          total_amount: total,
          payment_method: paymentMethod,
          qr_code_id: qrCodeId,
          is_scanned: false,
          points_awarded: pointsToAward,
          qr_expires_at: qrExpiresAt
        });
      } catch (saveErr) {
        console.warn("Sale save failed (bill will still print):", saveErr?.message);
      }

      const bill = {
        items: cart,
        customerInfo,
        subtotal,
        tax,
        total,
        paymentMethod,
        billNumber,
        qrCodeId,
        pointsToAward,
        date: new Date().toISOString()
      };
      setGeneratedBill(bill);
      setShowBill(true);
    } catch (err) {
      toast.error("Failed to complete sale: " + (err?.message || "Unknown error"));
    } finally {
      setCompleting(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setCustomerInfo({ name: "", phone: "" });
    setPaymentMethod("Cash");
    setShowBill(false);
    setGeneratedBill(null);
  };

  const canManageProducts = ["admin", "super_admin", "manager"].includes(user?.role);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-5 pt-6 pb-4">
          <Link 
            to={createPageUrl("Home")}
            className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin POS</h1>
              <p className="text-[#E8DED8] text-sm">In-Store Point of Sale</p>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl("AdminDashboard")}>
                <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
              </Link>
              <Link to={createPageUrl("AdminInventory")}>
                <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  <Package className="h-4 w-4 mr-2" />
                  Inventory
                </Button>
              </Link>
              <Link to={createPageUrl("AdminExpenses")}>
                <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Expenses
                </Button>
              </Link>
              <Link to={createPageUrl("AdminTasks")}>
                <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  <ListTodo className="h-4 w-4 mr-2" />
                  Tasks
                </Button>
              </Link>
              <Link to={createPageUrl("AdminReferrals")}>
                <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  <Users className="h-4 w-4 mr-2" />
                  Referrals
                </Button>
              </Link>
              <Link to={createPageUrl("AdminRedemptions")}>
                <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  <Gift className="h-4 w-4 mr-2" />
                  Redemptions
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-6 pb-24">
        <Tabs defaultValue="pos" className="space-y-6">
          <TabsList className="bg-white border border-[#E8DED8]">
            <TabsTrigger value="pos">POS</TabsTrigger>
            {canManageProducts && <TabsTrigger value="products">Product Management</TabsTrigger>}
          </TabsList>

          <TabsContent value="pos" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Products Section */}
              <div className="lg:col-span-2 space-y-4">
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-[#E8DED8]"
                />

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredProducts.map(product => (
                    <motion.button
                      key={product.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => addToCart(product)}
                      className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-left hover:border-[#8B7355] transition-colors"
                    >
                      {product.image_url && (
                        <img src={product.image_url} alt={product.name} className="w-full h-32 object-cover rounded-xl mb-3" />
                      )}
                      <h3 className="font-semibold text-[#5C4A3A] text-sm">{product.name}</h3>
                      <p className="text-[#8B7355] text-xs mt-1">{product.category}</p>
                      <p className="font-bold text-[#5C4A3A] mt-2">PKR {product.price.toFixed(2)}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Cart Section */}
              <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 h-fit sticky top-24">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="h-5 w-5 text-[#8B7355]" />
                  <h2 className="font-semibold text-[#5C4A3A]">Current Sale</h2>
                </div>

                {/* Customer Info */}
                <div className="space-y-2 mb-4">
                  <Input
                    placeholder="Customer Name (Optional)"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="text-sm border-[#E8DED8]"
                  />
                  <Input
                    placeholder="Phone Number (Optional)"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className="text-sm border-[#E8DED8]"
                  />
                </div>

                {/* Payment Method */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("Cash")}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                        paymentMethod === "Cash"
                          ? "border-[#8B7355] bg-[#F5EBE8] text-[#5C4A3A]"
                          : "border-[#E8DED8] bg-white text-[#8B7355]"
                      }`}
                    >
                      <Banknote className="h-4 w-4" />
                      <span className="text-sm font-medium">Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("Card")}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                        paymentMethod === "Card"
                          ? "border-[#8B7355] bg-[#F5EBE8] text-[#5C4A3A]"
                          : "border-[#E8DED8] bg-white text-[#8B7355]"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span className="text-sm font-medium">Card</span>
                    </button>
                  </div>
                  <p className="text-xs text-[#8B7355] mt-1">
                    GST: {paymentMethod === "Card" ? "5%" : "17%"}
                  </p>
                </div>

                {/* Cart Items */}
                <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                  {cart.length === 0 ? (
                    <p className="text-[#8B7355] text-sm text-center py-8">No items in cart</p>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex items-center gap-2 bg-[#F5EBE8] rounded-xl p-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#5C4A3A] text-sm truncate">{item.name}</p>
                          <p className="text-xs text-[#8B7355]">PKR {item.price}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-6 h-6 rounded-full bg-white flex items-center justify-center"
                          >
                            <Minus className="h-3 w-3 text-[#8B7355]" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-[#5C4A3A]">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-6 h-6 rounded-full bg-white flex items-center justify-center"
                          >
                            <Plus className="h-3 w-3 text-[#8B7355]" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Totals */}
                {cart.length > 0 && (
                  <>
                    <div className="space-y-2 border-t border-[#E8DED8] pt-4 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8B7355]">Subtotal</span>
                        <span className="text-[#5C4A3A] font-medium">PKR {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8B7355]">GST ({paymentMethod === "Card" ? "5%" : "17%"})</span>
                        <span className="text-[#5C4A3A] font-medium">PKR {tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-[#E8DED8] pt-2">
                        <span className="text-[#5C4A3A]">Total</span>
                        <span className="text-[#5C4A3A]">PKR {total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button
                        onClick={completeSale}
                        disabled={completing}
                        className="w-full bg-[#8B7355] hover:bg-[#6B5744] rounded-xl"
                      >
                        {completing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
                        {completing ? "Processing..." : "Complete Sale & Print Bill"}
                      </Button>
                      <Button
                        onClick={clearCart}
                        variant="outline"
                        className="w-full rounded-xl border-[#E8DED8]"
                      >
                        Clear Cart
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {canManageProducts && (
            <TabsContent value="products">
              <ProductManager isStoreProducts={true} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Bill Generator Dialog */}
      {showBill && generatedBill && (
        <BillGenerator
          bill={generatedBill}
          onClose={clearCart}
          autoDownload={true}
        />
      )}
    </div>
  );
}