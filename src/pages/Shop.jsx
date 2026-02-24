import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Filter, Star, Coffee, Loader2 } from "lucide-react";
import ProductCard from "@/components/shop/ProductCard";
import CartDrawer from "@/components/shop/CartDrawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Shop() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
      } catch (error) {
        // Allow browsing without login
        setUser(null);
      }
    };
    loadUser();
    
    // Load cart from localStorage
    const savedCart = localStorage.getItem("bean_cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    // Save cart to localStorage
    localStorage.setItem("bean_cart", JSON.stringify(cart));
  }, [cart]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
    initialData: []
  });

  const categories = ["all", "Coffee Beans", "Matcha", "Equipment", "Merchandise", "Gift Sets"];

  const filteredProducts = selectedCategory === "all"
    ? (products || [])
    : (products || []).filter((p) => p.category === selectedCategory);

  const featuredProducts = (products || []).filter((p) => p.featured);

  const handleAddToCart = (product) => {
    // Require login for cart operations
    if (!user) {
      toast.error("Please sign in to add items to cart");
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(cart.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
      toast.success("Quantity updated in cart");
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
      toast.success("Added to cart!");
    }
  };

  const handleUpdateQuantity = (productId, quantity) => {
    if (quantity < 1) return;
    setCart(cart.map((item) =>
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const handleRemoveItem = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
    toast.success("Item removed from cart");
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Remove loading check - allow browsing without login

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF] pb-24">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white sticky top-0 z-20 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <motion.div
            animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-10 left-5 w-40 h-40 bg-[#D4C4B0]/40 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -40, 0], y: [0, -30, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-5 right-10 w-48 h-48 bg-[#C9B8A6]/30 rounded-full blur-3xl"
          />
        </div>
        <div className="relative max-w-6xl mx-auto px-5 pt-6 pb-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold">Bean Shop</h1>
              <p className="text-[#E8DED8] text-sm mt-1">Premium coffee & accessories</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCartOpen(true)}
              className="relative bg-white/10 backdrop-blur-lg rounded-full p-4 hover:bg-white/20 transition-colors border border-white/20"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg"
                >
                  {cartItemCount}
                </motion.span>
              )}
            </motion.button>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-8">
        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              </motion.div>
              <h2 className="text-xl font-bold text-[#5C4A3A]">Featured Products</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredProducts.slice(0, 4).map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                >
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                    onViewDetails={setSelectedProduct}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="overflow-x-auto -mx-5 px-5"
        >
          <div className="flex gap-2 min-w-max">
            {categories.map((cat) => (
              <motion.button
                key={cat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-gradient-to-r from-[#8B7355] to-[#6B5744] text-white shadow-lg"
                    : "bg-white text-[#5C4A3A] border border-[#E8DED8] hover:border-[#D4C4B0] hover:shadow-md"
                }`}
              >
                {cat === "all" ? "All Products" : cat}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-[3/4] bg-white rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Coffee className="h-16 w-16 text-[#D4C4B0] mx-auto mb-4" />
            <p className="text-[#8B7355]">No products found in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                    onViewDetails={setSelectedProduct}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
      />

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl rounded-3xl">
          {selectedProduct && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="aspect-square rounded-2xl overflow-hidden bg-[#F5EBE8]">
                {selectedProduct.image_url ? (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Coffee className="h-24 w-24 text-[#D4C4B0]" />
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#5C4A3A]">{selectedProduct.name}</h2>
                  <p className="text-3xl font-bold text-[#8B7355] mt-2">${selectedProduct.price}</p>
                </div>
                
                <p className="text-[#6B5744]">{selectedProduct.description}</p>
                
                <div className="space-y-2">
                  {selectedProduct.category && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#8B7355]">Category:</span>
                      <Badge className="bg-[#F5EBE8] text-[#5C4A3A]">{selectedProduct.category}</Badge>
                    </div>
                  )}
                  {selectedProduct.weight && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#8B7355]">Size:</span>
                      <Badge className="bg-[#F5EBE8] text-[#5C4A3A]">{selectedProduct.weight}</Badge>
                    </div>
                  )}
                  {selectedProduct.origin && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#8B7355]">Origin:</span>
                      <Badge className="bg-[#F5EBE8] text-[#5C4A3A]">{selectedProduct.origin}</Badge>
                    </div>
                  )}
                  {selectedProduct.roast_level && selectedProduct.roast_level !== "N/A" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#8B7355]">Roast:</span>
                      <Badge className="bg-[#F5EBE8] text-[#5C4A3A]">{selectedProduct.roast_level}</Badge>
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={() => {
                    handleAddToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  disabled={!selectedProduct.in_stock}
                  className="w-full rounded-xl bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:from-[#6B5744] hover:to-[#5C4A3A] text-white py-6"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {selectedProduct.in_stock ? "Add to Cart" : "Out of Stock"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}