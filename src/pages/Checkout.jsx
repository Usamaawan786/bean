import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Package, CreditCard, MapPin, Phone, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function Checkout() {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [successDialog, setSuccessDialog] = useState({ open: false, orderNumber: "" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    postal_code: "",
    country: "UAE"
  });

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
      setFormData(prev => ({ ...prev, name: u.full_name || "" }));
      
      const customers = await base44.entities.Customer.filter({ created_by: u.email });
      if (customers.length > 0) setCustomer(customers[0]);
    };
    loadUser();

    const savedCart = localStorage.getItem("bean_cart");
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      if (parsedCart.length === 0) {
        navigate(createPageUrl("Shop"));
      }
      setCart(parsedCart);
    } else {
      navigate(createPageUrl("Shop"));
    }
  }, [navigate]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const pointsToEarn = Math.floor(total * 10); // 10 points per dollar spent

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const orderNumber = "BN" + Date.now().toString().slice(-8);
      
      const order = await base44.entities.Order.create({
        customer_email: user.email,
        customer_name: formData.name,
        items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total_amount: total,
        shipping_address: {
          street: formData.street,
          city: formData.city,
          postal_code: formData.postal_code,
          country: formData.country
        },
        phone: formData.phone,
        order_number: orderNumber,
        points_earned: pointsToEarn,
        status: "pending"
      });

      // Award loyalty points
      if (customer) {
        await base44.entities.Customer.update(customer.id, {
          points_balance: customer.points_balance + pointsToEarn,
          total_points_earned: customer.total_points_earned + pointsToEarn
        });
      }

      return orderNumber;
    },
    onSuccess: (orderNumber) => {
      localStorage.removeItem("bean_cart");
      setSuccessDialog({ open: true, orderNumber });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    placeOrderMutation.mutate();
  };

  const handleSuccessClose = () => {
    setSuccessDialog({ open: false, orderNumber: "" });
    navigate(createPageUrl("Orders"));
  };

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-3xl mx-auto px-5 pt-6 pb-8">
          <Link
            to={createPageUrl("Shop")}
            className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop
          </Link>

          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="text-[#E8DED8] text-sm mt-1">Complete your order</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8 pb-24">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-[#E8DED8] p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-[#8B7355]" />
              <h2 className="font-semibold text-[#5C4A3A] text-lg">Order Summary</h2>
            </div>

            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-[#F5EBE8] last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-[#5C4A3A] text-sm">{item.name}</p>
                    <p className="text-xs text-[#8B7355]">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-semibold text-[#5C4A3A]">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              
              <div className="flex items-center justify-between pt-4 border-t-2 border-[#E8DED8]">
                <span className="font-bold text-[#5C4A3A] text-lg">Total</span>
                <span className="font-bold text-2xl text-[#5C4A3A]">${total.toFixed(2)}</span>
              </div>
              
              <div className="bg-[#F5EBE8] rounded-xl p-3 text-center">
                <p className="text-sm text-[#8B7355]">
                  You'll earn <span className="font-bold text-[#5C4A3A]">{pointsToEarn} points</span> with this order! 🎉
                </p>
              </div>
            </div>
          </motion.div>

          {/* Shipping Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-[#E8DED8] p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-[#8B7355]" />
              <h2 className="font-semibold text-[#5C4A3A] text-lg">Shipping Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-[#5C4A3A]">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1 border-[#E8DED8] focus:ring-[#8B7355] focus:border-[#8B7355]"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-[#5C4A3A]">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="mt-1 border-[#E8DED8] focus:ring-[#8B7355] focus:border-[#8B7355]"
                />
              </div>

              <div>
                <Label htmlFor="street" className="text-[#5C4A3A]">Street Address</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  required
                  className="mt-1 border-[#E8DED8] focus:ring-[#8B7355] focus:border-[#8B7355]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-[#5C4A3A]">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    className="mt-1 border-[#E8DED8] focus:ring-[#8B7355] focus:border-[#8B7355]"
                  />
                </div>

                <div>
                  <Label htmlFor="postal_code" className="text-[#5C4A3A]">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    required
                    className="mt-1 border-[#E8DED8] focus:ring-[#8B7355] focus:border-[#8B7355]"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country" className="text-[#5C4A3A]">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                  className="mt-1 border-[#E8DED8] focus:ring-[#8B7355] focus:border-[#8B7355]"
                />
              </div>
            </div>
          </motion.div>

          {/* Place Order Button */}
          <Button
            type="submit"
            disabled={placeOrderMutation.isPending}
            className="w-full rounded-xl bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:from-[#6B5744] hover:to-[#5C4A3A] text-white py-6 text-lg font-semibold"
          >
            {placeOrderMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Place Order - ${total.toFixed(2)}
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Success Dialog */}
      <Dialog open={successDialog.open} onOpenChange={handleSuccessClose}>
        <DialogContent className="max-w-sm rounded-3xl">
          <div className="text-center py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="w-20 h-20 rounded-full bg-[#EDE8E3] flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="h-10 w-10 text-[#8B7355]" />
            </motion.div>
            <h3 className="text-xl font-bold text-[#5C4A3A]">Order Placed!</h3>
            <p className="text-[#8B7355] mt-2">
              Your order has been successfully placed
            </p>

            <div className="mt-6 bg-[#F5EBE8] rounded-2xl p-4">
              <p className="text-xs text-[#8B7355] mb-1">Order Number</p>
              <code className="text-xl font-bold text-[#5C4A3A] tracking-wider">
                {successDialog.orderNumber}
              </code>
            </div>

            <p className="text-xs text-[#8B7355] mt-4">
              You've earned {pointsToEarn} loyalty points! 🎉
            </p>

            <Button
              onClick={handleSuccessClose}
              className="w-full mt-6 rounded-xl bg-[#8B7355] hover:bg-[#6B5744]"
            >
              View My Orders
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}