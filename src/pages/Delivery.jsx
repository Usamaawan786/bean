import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ShoppingCart, X, MapPin, Phone, ArrowLeft, Check, Loader2, Package, Heart, Search, SlidersHorizontal, Coffee, ArrowUp } from "lucide-react";
import Motorbike from "@/components/icons/Motorbike";
import DeliveryProductCard from "@/components/delivery/DeliveryProductCard";
import LocationPicker from "@/components/delivery/LocationPicker";
import { distanceKm } from "@/components/delivery/DeliveryLocationPicker";
import { toast } from "sonner";

// "Most Liked" items — matched by name (same list as the Menu page)
const MOST_LIKED_QUERIES = [
  { query: "eggs bruschetta", likes: 12 },
  { query: "club sandwich", likes: 11 },
  { query: "mushroom cheese omelette", likes: 10 },
  { query: "lotus french toast", likes: 8 },
  { query: "spanish latte", likes: 6 },
];

const CATEGORY_ORDER = [
  "Breakfast",
  "Hot Coffee",
  "Cold Coffee",
  "Matcha",
  "Smoothies",
  "Fresher",
  "Teas & More",
  "Pastry",
  "Sweeter",
  "Add-Ons",
  "Other",
];

const CATEGORY_IMAGES = {
  "Breakfast": "https://images.unsplash.com/photo-1533089860892-a7c6f0a886de?w=800&q=80",
  "Hot Coffee": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80",
  "Cold Coffee": "https://images.unsplash.com/photo-1461023058943-07fcbe342818?w=800&q=80",
  "Matcha": "https://images.unsplash.com/photo-1515823668373-6c12b5b0389f?w=800&q=80",
  "Smoothies": "https://images.unsplash.com/photo-1505252585461-04db1eb5465f?w=800&q=80",
  "Fresher": "https://images.unsplash.com/photo-1610970881699-46a35a1a6f4f?w=800&q=80",
  "Teas & More": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80",
  "Pastry": "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=800&q=80",
  "Sweeter": "https://images.unsplash.com/photo-1551024601-bec78aea6be4?w=800&q=80",
  "Add-Ons": "https://images.unsplash.com/photo-1497935586351-b67f49ee9fee?w=800&q=80",
  "Other": "https://images.unsplash.com/photo-1495474472287-4d71bcdd6005?w=800&q=80",
};

const CATEGORY_DESCRIPTIONS = {
  "Breakfast": "Served with Bean's special sauce and your choice of a side salad or potatoes.",
  "Hot Coffee": "Single-origin beans, roasted locally and pulled to order.",
  "Cold Coffee": "Chilled, smooth and refreshing — perfect for Islamabad afternoons.",
  "Matcha": "Stone-ground ceremonial matcha, whisked the traditional way.",
  "Smoothies": "Blended fresh with seasonal fruit and no added sugar.",
  "Fresher": "Light, bright and citrusy — our cold-pressed refreshers.",
  "Teas & More": "Loose-leaf teas and house specialties.",
  "Pastry": "Baked fresh every morning in-house.",
  "Sweeter": "Indulgent treats for your sweet tooth.",
  "Add-Ons": "Extras to complete your order.",
  "Other": "A little something extra.",
};

export default function Delivery() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [view, setView] = useState("menu");
  const [activeCat, setActiveCat] = useState("most-liked");
  const [search, setSearch] = useState("");
  const [showFab, setShowFab] = useState(false);
  const sectionRefs = useRef({});
  const pillRefs = useRef({});
  const navRef = useRef(null);
  const pendingScroll = useRef(false);
  const [checkout, setCheckout] = useState({ address: "", notes: "", phone: "" });
  const [pin, setPin] = useState(null); // { lat, lng } chosen on the map
  const [payMethod, setPayMethod] = useState("cash_on_delivery"); // or "card_on_delivery"
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

  // Pull the same category cover photos / descriptions the Menu page uses
  const { data: menuCategories = [] } = useQuery({
    queryKey: ["menuCategories"],
    queryFn: () => base44.entities.MenuCategory.list("sort_order", 100),
  });

  // Menu page's own items, sorted exactly like the Menu page, so category photos
  // (e.g. Breakfast = Lotus French Toast) and Most Liked photos come out identical.
  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuItemsForDelivery"],
    queryFn: async () => ((await base44.entities.StoreProduct.list("-created_date", 200)) || []).filter((i) => i.is_available !== false),
  });

  const { data: menuSettings } = useQuery({
    queryKey: ["menuSettings"],
    queryFn: async () => (await base44.entities.MenuSettings.list())[0] || null,
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

  useEffect(() => {
    const onScroll = () => setShowFab(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Order the delivery items exactly like the Menu page orders its items
  // (newest first, by matching name against the Menu list), so grouping,
  // Most Liked and first-photo-per-category are identical.
  const orderedProducts = useMemo(() => {
    if (!menuItems.length) return products;
    const rank = new Map(menuItems.map((m, i) => [m.name, i]));
    return [...products].sort((a, b) => (rank.get(a.name) ?? 9999) - (rank.get(b.name) ?? 9999));
  }, [products, menuItems]);

  // Most Liked: matched by name, then removed from the category lists (same as Menu page)
  const { mostLikedItems, grouped } = useMemo(() => {
    const liked = [];
    const used = new Set();
    MOST_LIKED_QUERIES.forEach(({ query, likes }) => {
      const match = orderedProducts.find((p) => !used.has(p.id) && p.name.toLowerCase().includes(query));
      if (match) {
        liked.push({ ...match, _likes: likes });
        used.add(match.id);
      }
    });
    const g = {};
    orderedProducts.filter((p) => !used.has(p.id)).forEach((p) => {
      const c = p.category || "Other";
      (g[c] = g[c] || []).push(p);
    });
    return { mostLikedItems: liked, grouped: g };
  }, [orderedProducts]);

  const sections = useMemo(() => {
    const ordered = CATEGORY_ORDER.filter((c) => grouped[c]?.length);
    const extra = Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    return [
      { id: "most-liked", label: "Most Liked", items: mostLikedItems, isMostLiked: true },
      ...[...ordered, ...extra].map((c) => ({ id: c, label: c, items: grouped[c] || [], isMostLiked: false })),
    ].filter((s) => s.items.length > 0);
  }, [grouped, mostLikedItems]);

  const searching = search.trim().length > 0;
  const searchResults = searching
    ? orderedProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : [];
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const categoryImages = useMemo(() => {
    const map = {};
    (menuItems.length ? menuItems : orderedProducts).forEach((p) => {
      const c = p.category || "Other";
      if (!map[c] && p.image_url && !p.image_url.includes("images.unsplash.com")) map[c] = p.image_url;
    });
    return map;
  }, [menuItems, orderedProducts]);
  const catMeta = (cat) => menuCategories.find((c) => c.name === cat);
  const catImg = (cat) =>
    categoryImages[cat] || catMeta(cat)?.image_url || CATEGORY_IMAGES[cat] || CATEGORY_IMAGES["Other"];
  const catDesc = (cat) => catMeta(cat)?.description || CATEGORY_DESCRIPTIONS[cat] || "";

  useEffect(() => {
    if (sections.length && !sections.find((s) => s.id === activeCat)) setActiveCat(sections[0].id);
  }, [sections, activeCat]);

  useEffect(() => {
    if (sections.length === 0 || view !== "menu") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (pendingScroll.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.dataset.catId;
          if (id) setActiveCat(id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [sections.length, view, searching]);

  useEffect(() => {
    const pill = pillRefs.current[activeCat];
    if (pill && navRef.current) {
      pill.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeCat]);

  const scrollToCat = useCallback((catId) => {
    const el = sectionRefs.current[catId];
    if (!el) return;
    setActiveCat(catId);
    pendingScroll.current = true;
    const top = el.getBoundingClientRect().top + window.scrollY - 150;
    window.scrollTo({ top, behavior: "smooth" });
    setTimeout(() => { pendingScroll.current = false; }, 700);
  }, []);

  const cartItems = cart
    .map((item) => ({ ...item, product: products.find((p) => p.id === item.product_id) }))
    .filter((i) => i.product);
  const subtotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const deliveryFee = settings?.flat_delivery_fee || 297;
  const gstPercent = payMethod === "card_on_delivery" ? (settings?.card_gst_percent ?? 8) : (settings?.cash_gst_percent ?? 17);
  const gstAmount = Math.round((subtotal * gstPercent) / 100);
  const total = subtotal + gstAmount + deliveryFee;
  const isDeliveryOpen = settings?.is_delivery_open !== false;
  const storeLat = settings?.store_lat ?? 33.5306669;
  const storeLng = settings?.store_lng ?? 73.0997785;
  const radiusKm = settings?.delivery_radius_km ?? 4;
  const pinInRange = !!pin && distanceKm(storeLat, storeLng, pin.lat, pin.lng) <= radiusKm;

  const addToCart = (product) => {
    if (!isDeliveryOpen) { toast.info("Delivery is coming soon — we're not taking orders yet"); return; }
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
    if (!pin) { toast.error("Please pin your delivery location on the map"); return; }
    if (!pinInRange) { toast.error(`Sorry, we only deliver within ${radiusKm} km of Bean`); return; }
    if (!checkout.address.trim()) { toast.error("Please enter your delivery address"); return; }
    if (!checkout.phone.trim()) { toast.error("Please enter your phone number"); return; }
    if (!isDeliveryOpen) { toast.error("Delivery is currently closed"); return; }
    setPlacing(true);
    try {
      const res = await base44.functions.invoke("createDeliveryOrder", {
        items: cart,
        delivery_address: checkout.address,
        delivery_lat: pin.lat,
        delivery_lng: pin.lng,
        delivery_notes: checkout.notes,
        payment_method: payMethod,
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
    <div className={`min-h-screen pb-44 ${view === "menu" ? "bg-[#A87555]" : "bg-[#F5F1ED]"}`}>
      {/* Coming soon notice — shown whenever delivery is switched off in admin settings */}
      {!isDeliveryOpen && (
        <div className="bg-[#5C4A3A] text-white text-center px-4 py-3">
          <div className="text-sm font-bold tracking-widest">🛵 DELIVERY — COMING SOON</div>
          <div className="text-xs text-white/80 mt-0.5">We're not taking delivery orders just yet. Have a look at the menu — we'll let you know when we launch!</div>
        </div>
      )}

      {/* Cream header strip — same as Menu page */}
      <div className="bg-[#E8DEC8]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Motorbike className="h-6 w-6 text-[#7D5A46]" />
          {menuSettings?.logo_url ? (
            <img src={menuSettings.logo_url} alt={menuSettings?.brand_name || "Bean"} className="h-8 w-auto max-w-[140px] object-contain" />
          ) : (
            <div className="text-lg font-bold text-[#7D5A46] tracking-wide">{menuSettings?.brand_name || "Bean"}</div>
          )}
          <div className="w-6" />
        </div>
      </div>

      {/* Heading */}
      <div className="bg-[#A87555]">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-4 text-center">
          <h1 className="text-3xl font-bold text-white">Delivery Menu</h1>
          <p className="text-sm text-white/70 mt-1">{isDeliveryOpen ? "Order your favorite coffee for delivery" : "Our delivery menu — launching soon"}</p>
          <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isDeliveryOpen ? "bg-green-500/20 text-green-100" : "bg-red-500/20 text-red-100"}`}>
            <span className={`w-2 h-2 rounded-full ${isDeliveryOpen ? "bg-green-400" : "bg-red-400"}`} />
            {isDeliveryOpen ? "Open for orders" : "Coming soon — not taking orders yet"}
          </div>
        </div>
      </div>

      <div className={view === "menu" ? "" : "max-w-2xl mx-auto px-4"}>
        {view === "checkout" && (
          <div className="bg-amber-100 border border-amber-300 text-amber-900 text-center text-xs font-semibold py-2 px-4 rounded-xl mt-4 tracking-wide">
            BETA VERSION — Bean Delivery is in early launch. Thanks for helping us test it!
          </div>
        )}
        {/* Active Orders */}
        {myActive.length > 0 && view === "menu" && (
          <div className="max-w-2xl mx-auto px-4 pt-4 space-y-2">
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
            {/* Search + sticky category nav — identical to Menu page */}
            {sections.length > 0 && (
              <div className="sticky top-0 z-50 bg-[#A87555]/95 backdrop-blur-md shadow-md">
                <div className="max-w-2xl mx-auto px-4 pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search"
                        className="w-full bg-white/10 border border-[#C4A484] rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                      />
                    </div>
                    <button
                      onClick={() => setSearch("")}
                      className="p-2.5 rounded-full bg-white/10 border border-white/20 text-white active:scale-95 transition-transform"
                      aria-label="Clear search"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  {!searching && (
                    <div ref={navRef} className="mt-3 overflow-x-auto scrollbar-hide">
                      <div className="flex gap-3 min-w-max">
                        {sections.map((s) => {
                          const isActive = activeCat === s.id;
                          const img = s.isMostLiked ? (s.items[0]?.image_url || null) : catImg(s.label);
                          return (
                            <button
                              key={s.id}
                              ref={(el) => (pillRefs.current[s.id] = el)}
                              onClick={() => scrollToCat(s.id)}
                              className="flex flex-col items-center gap-1 shrink-0 active:scale-95 transition-transform"
                            >
                              <div className={`w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center ${isActive ? "ring-2 ring-white" : "ring-1 ring-white/20"}`}>
                                {s.isMostLiked && !img ? (
                                  <div className="w-full h-full bg-[#936548] flex items-center justify-center">
                                    <Heart className={`h-6 w-6 ${isActive ? "text-white fill-white" : "text-white/70"}`} />
                                  </div>
                                ) : (
                                  <div className="relative w-full h-full">
                                    <img src={img} alt={s.label} className="w-full h-full object-cover" loading="lazy" />
                                    {s.isMostLiked && (
                                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                        <Heart className="h-6 w-6 text-white fill-white drop-shadow" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <span className={`text-[11px] max-w-[64px] truncate ${isActive ? "text-white font-medium" : "text-white/60"}`}>
                                {s.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 py-6">
              {searching ? (
                <div>
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{search}"
                  </h2>
                  {searchResults.length === 0 ? (
                    <div className="text-center py-20 text-white/60">
                      <Coffee className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No items found. Try a different search.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {searchResults.map((item) => (
                        <DeliveryProductCard
                          key={item.id}
                          product={item}
                          image={item.image_url || CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES["Other"]}
                          onAdd={addToCart}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : sections.length === 0 ? (
                <div className="text-center py-20 text-white/60">
                  <Coffee className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Menu is being updated. Please check back soon.</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {sections.map((section) => (
                    <section
                      key={section.id}
                      data-cat-id={section.id}
                      ref={(el) => (sectionRefs.current[section.id] = el)}
                      className="scroll-mt-40"
                    >
                      {section.isMostLiked ? (
                        <div className="mb-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Heart className="h-4 w-4 text-white fill-white" />
                            <h2 className="text-xl font-bold text-white">Most Liked</h2>
                            <Heart className="h-4 w-4 text-white fill-white" />
                          </div>
                          <p className="text-sm text-white/60 mt-0.5">According to real guest likes</p>
                        </div>
                      ) : (
                        <div className="mb-5">
                          <div className="rounded-2xl overflow-hidden h-32 sm:h-40 mb-3 shadow-md">
                            <img src={catImg(section.label)} alt={section.label} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <h2 className="text-xl font-bold text-white">{catMeta(section.label)?.display_name || section.label}</h2>
                          {catDesc(section.label) && (
                            <p className="text-sm text-white/70 mt-1 leading-relaxed">{catDesc(section.label)}</p>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3">
                        {section.items.map((product) => (
                          <DeliveryProductCard
                            key={product.id}
                            product={product}
                            isMostLiked={section.isMostLiked}
                            likes={product._likes}
                            image={product.image_url || CATEGORY_IMAGES[product.category] || CATEGORY_IMAGES["Other"]}
                            onAdd={addToCart}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>

            {showFab && (
              <button
                onClick={scrollTop}
                className="fixed bottom-24 right-6 z-40 w-11 h-11 rounded-full bg-[#D9C3B0] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                aria-label="Scroll to top"
              >
                <ArrowUp className="h-5 w-5 text-[#8A6044]" />
              </button>
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
              <div className="grid grid-cols-2 gap-1 bg-[#F5F1ED] rounded-xl p-1">
                {[
                  { id: "cash_on_delivery", icon: "💵", label: "Cash", pct: settings?.cash_gst_percent ?? 17 },
                  { id: "card_on_delivery", icon: "💳", label: "Card", pct: settings?.card_gst_percent ?? 8 },
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setPayMethod(opt.id)}
                    className={`rounded-lg py-2 text-sm font-semibold transition-colors ${payMethod === opt.id ? "bg-[#5C4A3A] text-white shadow" : "text-[#8B7355]"}`}
                  >
                    {opt.icon} {opt.label} <span className="text-[11px] font-normal opacity-80">· {opt.pct}% GST</span>
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-[#8B7355] -mt-1">
                Pay at the door. {payMethod === "card_on_delivery" ? "Our rider brings a card machine." : "Please keep cash ready."}
              </div>
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
                <div className="flex justify-between text-[#8B7355]"><span>GST ({gstPercent}% — {payMethod === "card_on_delivery" ? "card" : "cash"})</span><span>Rs. {gstAmount}</span></div>
                <div className="flex justify-between text-[#8B7355]"><span>Delivery Fee</span><span>Rs. {deliveryFee}</span></div>
                <div className="flex justify-between font-bold text-[#5C4A3A]"><span>Total</span><span>Rs. {total}</span></div>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 space-y-3">
              <h2 className="font-semibold text-[#5C4A3A]">Delivery Details</h2>
              <div>
                <label className="text-xs text-[#8B7355] flex items-center gap-1 mb-1"><MapPin className="h-3 w-3" /> Delivery location</label>
                <LocationPicker
                  apiKey={settings?.google_maps_key}
                  storeLat={storeLat}
                  storeLng={storeLng}
                  radiusKm={radiusKm}
                  value={pin}
                  onChange={setPin}
                  onAddressFound={(addr) => setCheckout((c) => (c.address.trim() ? c : { ...c, address: addr }))}
                />
              </div>
              <div>
                <label className="text-xs text-[#8B7355] flex items-center gap-1 mb-1"><MapPin className="h-3 w-3" /> Full address (house / street / area)</label>
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

            <button
              onClick={handlePlaceOrder}
              disabled={placing || !isDeliveryOpen || !pinInRange}
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
            className="fixed left-0 right-0 z-[60] px-4"
            style={{ bottom: "calc(max(env(safe-area-inset-bottom), 16px) + 80px)" }}
          >
            <button
              onClick={() => setView("checkout")}
              className="w-full max-w-2xl mx-auto bg-[#5C4A3A] text-white rounded-2xl py-3 px-5 flex items-center justify-between shadow-xl"
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