import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Receipt, Settings, CreditCard, Banknote, Package, TrendingDown, BarChart3, ListTodo, Users, Gift, Loader2, Shield, Percent, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProductManager from "@/components/admin/ProductManager";
import BillGenerator from "@/components/admin/BillGenerator";
import LaunchDiscountPanel from "@/components/shared/LaunchDiscountPanel";
import OpenTicketsPanel from "@/components/admin/pos/OpenTicketsPanel";
import ReceiptLookup from "@/components/admin/pos/ReceiptLookup";
import SalesHistoryTab from "@/components/admin/pos/SalesHistoryTab";
import ScreenShareGate from "@/components/admin/pos/ScreenShareGate";
import ModifierPickerSheet from "@/components/admin/pos/ModifierPickerSheet";
import POSCategoryNav from "@/components/admin/pos/POSCategoryNav";
import { SlidersHorizontal } from "lucide-react";
import { buildKitchenOrder, syncTicketKitchenOrder } from "@/lib/kitchenOrderUtils";
import { PKR_PER_POINT } from "@/lib/loyaltyConfig";
import { generateTicketNumber, aggregateItemsToCart, diffCartAgainstBaseline } from "@/lib/openTicketUtils";

export default function AdminPOS() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "" });
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [showBill, setShowBill] = useState(false);
  const [generatedBill, setGeneratedBill] = useState(null);
  const [completing, setCompleting] = useState(false);
  const completingRef = useRef(false);
  const [orderType, setOrderType] = useState("dine_in"); // "dine_in" | "takeaway"
  const [counter, setCounter] = useState("counter_1");
  const [tableNumber, setTableNumber] = useState(null); // dine-in table 1-15
  const [discountPct, setDiscountPct] = useState(0); // percentage discount 0-100
  const [discountInput, setDiscountInput] = useState(""); // local string for the custom input field
  const [activeTab, setActiveTab] = useState("pos");
  const [activeTicket, setActiveTicket] = useState(null); // OpenTicket being resumed, if any
  const [ticketBaseline, setTicketBaseline] = useState([]); // cart snapshot at last save/load
  const [ticketKitchenOrder, setTicketKitchenOrder] = useState(null); // linked KDS record
  const [savingTicket, setSavingTicket] = useState(false);
  const [modifierPickerItem, setModifierPickerItem] = useState(null);
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

  const updateItemModifiers = (productId, modifierIds) => {
    setCart(cart.map(item => item.id === productId ? { ...item, selected_modifiers: modifierIds } : item));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = subtotal * (discountPct / 100);
  const discountedSubtotal = subtotal - discountAmount;
  const taxRate = paymentMethod === "Card" ? 0.05 : 0.17; // 5% for Card, 17% for Cash
  const tax = discountedSubtotal * taxRate;
  const total = discountedSubtotal + tax;

  const completeSale = async () => {
    // Ref guard blocks a second tap that lands before the state re-render
    // propagates (< 16ms) — state-only guards let both taps through.
    if (completingRef.current) return;
    completingRef.current = true;
    setCompleting(true);
    try {
      // Short, dynamic reward code: compact base36 timestamp + random suffix (~10 chars),
      // still unique per millisecond + disambiguator for same-ms sales.
      const qrCodeId = "B" + Date.now().toString(36).slice(-6).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();

      // Fetch reward settings for dynamic points calculation
      let pkrPerPoint = PKR_PER_POINT; // default fallback (RewardSettings overrides)
      try {
        const settings = await base44.entities.RewardSettings.list("-created_date", 1);
        if (settings.length > 0 && settings[0].pkr_per_point) {
          pkrPerPoint = settings[0].pkr_per_point;
        }
      } catch (e) { /* use default */ }

      const pointsToAward = Math.floor(discountedSubtotal / pkrPerPoint);
      const qrExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      // Use backend function (service role) to guarantee save
      const saveResp = await base44.functions.invoke('saveSale', {
        saleData: {
          customer_name: customerInfo.name || null,
          customer_phone: customerInfo.phone || null,
          items: cart.map(item => ({
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            price: item.price,
            selected_modifiers: item.selected_modifiers || []
          })),
          subtotal: discountedSubtotal,
          original_subtotal: subtotal,
          discount_pct: discountPct,
          discount_amount: discountAmount,
          tax,
          total_amount: total,
          payment_method: paymentMethod,
          qr_code_id: qrCodeId,
          is_scanned: false,
          points_awarded: pointsToAward,
          qr_expires_at: qrExpiresAt,
          order_type: orderType,
          counter,
          table_number: tableNumber || null
        }
      });
      if (!saveResp.data?.success) {
        throw new Error(saveResp.data?.error || 'Failed to save sale');
      }

      // Backend auto-generates sequential bill number (A1, A2, ...)
      const billNumber = saveResp.data.sale.bill_number;

      // Track analytics regardless of what happens next
      try {
        base44.analytics.track({
          eventName: 'pos_sale_completed',
          properties: {
            total_amount: Math.round(total),
            subtotal: Math.round(subtotal),
            tax: Math.round(tax),
            items_count: cart.reduce((s, i) => s + i.quantity, 0),
            payment_method: paymentMethod,
            points_awarded: pointsToAward,
          }
        });
      } catch (e) { /* analytics failure should not block sale */ }

      // Send order to kitchen display system (skip if already sent progressively via open ticket)
      if (!activeTicket) {
        try {
          const kitchenOrder = buildKitchenOrder({
            cart,
            customerInfo,
            billNumber,
            orderType,
            counter,
            total,
            paymentMethod
          });
          await base44.entities.KitchenOrder.create(kitchenOrder);
        } catch (e) { /* kitchen order failure should not block sale */ }
      } else if (ticketKitchenOrder) {
        try {
          await base44.entities.KitchenOrder.update(ticketKitchenOrder.id, { bill_number: billNumber, payment_method: paymentMethod });
        } catch (e) { /* kitchen order link failure should not block sale */ }
      }

      // Resolve the open ticket into this sale
      if (activeTicket) {
        try {
          await base44.entities.OpenTicket.update(activeTicket.id, { status: "Paid", sale_bill_number: billNumber });
        } catch (e) { /* ticket resolution failure should not block sale */ }
      }

      const bill = {
        items: cart,
        customerInfo,
        subtotal: discountedSubtotal,
        originalSubtotal: subtotal,
        discountPct,
        discountAmount,
        tax,
        total,
        paymentMethod,
        billNumber,
        qrCodeId,
        pointsToAward,
        date: new Date().toISOString(),
        tableNumber
      };
      setGeneratedBill(bill);
      setShowBill(true);
    } catch (err) {
      toast.error("Failed to complete sale: " + (err?.message || "Unknown error"));
    } finally {
      completingRef.current = false;
      setCompleting(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setCustomerInfo({ name: "", phone: "" });
    setPaymentMethod("Cash");
    setOrderType("dine_in");
    setTableNumber(null);
    setDiscountPct(0);
    setDiscountInput("");
    setShowBill(false);
    setGeneratedBill(null);
    setActiveTicket(null);
    setTicketBaseline([]);
    setTicketKitchenOrder(null);
  };

  const handleResumeTicket = async (ticket) => {
    try {
      const items = await base44.entities.OpenTicketItem.filter({ ticket_id: ticket.id });
      const aggregated = aggregateItemsToCart(items, products);
      setCart(aggregated);
      setTicketBaseline(aggregated);
      setCustomerInfo({ name: ticket.customer_name || "", phone: ticket.customer_phone || "" });
      setOrderType(ticket.order_type || "dine_in");
      setCounter(ticket.counter || "counter_1");
      setTableNumber(ticket.table_number || null);
      setActiveTicket(ticket);
      const kOrders = await base44.entities.KitchenOrder.filter({ bill_number: ticket.ticket_number });
      setTicketKitchenOrder(kOrders?.[0] || null);
      setActiveTab("pos");
    } catch (err) {
      toast.error("Failed to load ticket: " + (err?.message || "Unknown error"));
    }
  };

  const handleSaveOpenTicket = async () => {
    if (cart.length === 0) {
      toast.error("Add items to the cart first");
      return;
    }
    if (savingTicket) return;
    setSavingTicket(true);
    try {
      if (!activeTicket) {
        const ticketNumber = generateTicketNumber();
        const ticket = await base44.entities.OpenTicket.create({
          ticket_number: ticketNumber,
          customer_name: customerInfo.name || "",
          customer_phone: customerInfo.phone || "",
          order_type: orderType,
          counter,
          table_number: tableNumber || null,
          status: "Open",
          opened_by: user.email,
          opened_by_name: user.full_name || "",
          total_estimate: total
        });
        await base44.entities.OpenTicketItem.bulkCreate(cart.map(item => ({
          ticket_id: ticket.id,
          product_id: item.id,
          product_name: item.name,
          price: item.price,
          quantity: item.quantity,
          status: "Pending",
          added_by: user.email,
          added_by_name: user.full_name || ""
        })));
        try {
          await syncTicketKitchenOrder({
            base44, ticketNumber, deltaItems: cart, products,
            orderType, counter, customerName: customerInfo.name, existingOrder: null
          });
        } catch (e) { /* KDS failure should not block ticket save */ }
        toast.success(`Ticket ${ticketNumber} saved`);
      } else {
        const { increases, decreases } = diffCartAgainstBaseline(cart, ticketBaseline);
        if (increases.length > 0) {
          await base44.entities.OpenTicketItem.bulkCreate(increases.map(item => ({
            ticket_id: activeTicket.id,
            product_id: item.id,
            product_name: item.name,
            price: item.price,
            quantity: item.quantity,
            status: "Pending",
            added_by: user.email,
            added_by_name: user.full_name || ""
          })));
        }
        for (const dec of decreases) {
          const rows = await base44.entities.OpenTicketItem.filter({ ticket_id: activeTicket.id, product_id: dec.id });
          let remaining = dec.quantity;
          for (const row of rows.filter(r => r.status !== "Voided")) {
            if (remaining <= 0) break;
            await base44.entities.OpenTicketItem.update(row.id, { status: "Voided" });
            remaining -= row.quantity;
          }
        }
        await base44.entities.OpenTicket.update(activeTicket.id, {
          customer_name: customerInfo.name || "",
          customer_phone: customerInfo.phone || "",
          order_type: orderType,
          counter,
          table_number: tableNumber || null,
          total_estimate: total
        });
        if (increases.length > 0) {
          try {
            const updated = await syncTicketKitchenOrder({
              base44, ticketNumber: activeTicket.ticket_number, deltaItems: increases, products,
              orderType, counter, customerName: customerInfo.name, existingOrder: ticketKitchenOrder
            });
            setTicketKitchenOrder(updated);
          } catch (e) { /* KDS failure should not block ticket save */ }
        }
        toast.success(`Ticket ${activeTicket.ticket_number} updated`);
      }
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["open-tickets"] });
    } catch (err) {
      toast.error("Failed to save ticket: " + (err?.message || "Unknown error"));
    } finally {
      setSavingTicket(false);
    }
  };

  const canManageProducts = ["admin", "super_admin", "manager"].includes(user?.role);

  if (!user) return null;

  return (
    <ScreenShareGate user={user}>
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
              {["admin", "super_admin"].includes(user?.role) && (
                <Link to="/AdminStaffScrutiny">
                  <Button variant="outline" className="bg-red-500/20 text-red-200 border-red-400/30 hover:bg-red-500/30">
                    <Shield className="h-4 w-4 mr-2" />
                    Scrutiny
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-6 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-[#E8DED8]">
            <TabsTrigger value="pos">POS</TabsTrigger>
            <TabsTrigger value="open-tickets">Open Tickets</TabsTrigger>
            <TabsTrigger value="receipts">Receipt Lookup</TabsTrigger>
            <TabsTrigger value="launch-discount">Soft-Launch 10%</TabsTrigger>
            <TabsTrigger value="sales-history">Sales History</TabsTrigger>
            {canManageProducts && <TabsTrigger value="products">Product Management</TabsTrigger>}
          </TabsList>

          <TabsContent value="pos" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <POSCategoryNav onAddToCart={addToCart} />

              {/* Cart Section */}
              <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 h-fit sticky top-24">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="h-5 w-5 text-[#8B7355]" />
                  <h2 className="font-semibold text-[#5C4A3A]">Current Sale</h2>
                </div>

                {activeTicket && (
                  <div className="mb-4 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-medium flex items-center justify-between">
                    <span>Editing Ticket {activeTicket.ticket_number}</span>
                    <button onClick={clearCart} className="underline">Cancel</button>
                  </div>
                )}

                {/* Order Type */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Order Type</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button type="button" onClick={() => setOrderType("dine_in")}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${orderType === "dine_in" ? "border-[#8B7355] bg-[#F5EBE8] text-[#5C4A3A]" : "border-[#E8DED8] bg-white text-[#8B7355]"}`}>
                      🪑 Dine In
                    </button>
                    <button type="button" onClick={() => { setOrderType("takeaway"); setTableNumber(null); }}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${orderType === "takeaway" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-[#E8DED8] bg-white text-[#8B7355]"}`}>
                      🛍 Takeaway
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setCounter("counter_1")}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${counter === "counter_1" ? "border-[#8B7355] bg-[#F5EBE8] text-[#5C4A3A]" : "border-[#E8DED8] bg-white text-[#8B7355]"}`}>
                      Counter 1
                    </button>
                    <button type="button" onClick={() => setCounter("counter_2")}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${counter === "counter_2" ? "border-[#8B7355] bg-[#F5EBE8] text-[#5C4A3A]" : "border-[#E8DED8] bg-white text-[#8B7355]"}`}>
                      Counter 2
                    </button>
                  </div>

                  {/* Table Number (dine-in only) */}
                  {orderType === "dine_in" && (
                    <div className="mt-3">
                      <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Table Number</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {Array.from({ length: 15 }, (_, i) => i + 1).map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setTableNumber(tableNumber === n ? null : n)}
                            className={`py-2 rounded-lg border text-xs font-semibold transition-all ${tableNumber === n ? "border-[#8B7355] bg-[#8B7355] text-white" : "border-[#E8DED8] bg-white text-[#8B7355] hover:border-[#C9B8A6]"}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                      <div key={item.id} className="bg-[#F5EBE8] rounded-xl p-3">
                        <div className="flex items-center gap-2">
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
                        <button
                          onClick={() => setModifierPickerItem(item)}
                          className="mt-2 flex items-center gap-1 text-xs text-[#8B7355] hover:text-[#5C4A3A]"
                        >
                          <SlidersHorizontal className="h-3 w-3" />
                          {item.selected_modifiers?.length ? `${item.selected_modifiers.length} modifier(s)` : "Add modifiers"}
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Totals */}
                {cart.length > 0 && (
                  <>
                    {/* Discount */}
                    <div className="mb-3">
                      <label className="text-sm font-medium text-[#5C4A3A] mb-2 block flex items-center gap-1">
                        <TrendingDown className="h-4 w-4 text-red-500" /> Discount %
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {[0, 5, 10, 15, 20, 50].map(pct => (
                          <button key={pct} type="button" onClick={() => setDiscountPct(pct)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${discountPct === pct ? "border-red-400 bg-red-50 text-red-700" : "border-[#E8DED8] bg-white text-[#8B7355]"}`}>
                            {pct === 0 ? "None" : `${pct}%`}
                          </button>
                        ))}
                        <input type="number" min="0" max="100" value={discountInput}
                          onChange={e => setDiscountInput(e.target.value)}
                          onBlur={() => {
                            const n = Math.min(100, Math.max(0, Number(discountInput)));
                            setDiscountPct(Number.isFinite(n) ? n : 0);
                            setDiscountInput("");
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              const n = Math.min(100, Math.max(0, Number(discountInput)));
                              setDiscountPct(Number.isFinite(n) ? n : 0);
                              setDiscountInput("");
                              e.target.blur();
                            }
                          }}
                          placeholder="Custom"
                          className="w-20 border border-[#E8DED8] rounded-xl px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30" />
                      </div>
                    </div>

                  <div className="space-y-2 border-t border-[#E8DED8] pt-4 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8B7355]">Subtotal</span>
                        <span className="text-[#5C4A3A] font-medium">PKR {subtotal.toFixed(2)}</span>
                      </div>
                      {discountPct > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-red-500">Discount ({discountPct}%)</span>
                          <span className="text-red-500 font-medium">- PKR {discountAmount.toFixed(2)}</span>
                        </div>
                      )}
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
                        onClick={handleSaveOpenTicket}
                        disabled={savingTicket}
                        variant="outline"
                        className="w-full rounded-xl border-[#8B7355] text-[#8B7355]"
                      >
                        {savingTicket ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-2" />}
                        {activeTicket ? `Update Ticket ${activeTicket.ticket_number}` : "Save as Open Ticket"}
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

          <TabsContent value="open-tickets">
            <OpenTicketsPanel user={user} onResume={handleResumeTicket} />
          </TabsContent>

          <TabsContent value="receipts">
            <ReceiptLookup />
          </TabsContent>

          <TabsContent value="launch-discount">
            <LaunchDiscountPanel />
          </TabsContent>

          <TabsContent value="sales-history">
            <SalesHistoryTab />
          </TabsContent>

          {canManageProducts && (
            <TabsContent value="products">
              <div className="bg-white rounded-2xl border border-[#E8DED8] p-8 text-center">
                <Package className="h-12 w-12 text-[#C9B8A6] mx-auto mb-3" />
                <h3 className="font-semibold text-[#5C4A3A] mb-2">Catalog Management</h3>
                <p className="text-sm text-[#8B7355] mb-4">Manage your menu categories, items, recipes, and modifiers in the Inventory Engine</p>
                <Link to={createPageUrl("AdminInventory")}>
                  <Button className="bg-[#8B7355] hover:bg-[#6B5744]"><Package className="h-4 w-4 mr-2" /> Open Catalog Manager</Button>
                </Link>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Modifier Picker */}
      <ModifierPickerSheet
        open={!!modifierPickerItem}
        onOpenChange={(open) => { if (!open) setModifierPickerItem(null); }}
        product={modifierPickerItem}
        selectedIds={modifierPickerItem?.selected_modifiers || []}
        onChange={(ids) => {
          updateItemModifiers(modifierPickerItem.id, ids);
          setModifierPickerItem(item => item ? { ...item, selected_modifiers: ids } : item);
        }}
      />

      {/* Bill Generator Dialog */}
      {showBill && generatedBill && (
        <BillGenerator
          bill={generatedBill}
          onClose={clearCart}
        />
      )}
    </div>
    </ScreenShareGate>
  );
}