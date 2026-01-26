import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CartDrawer({ isOpen, onClose, cart, onUpdateQuantity, onRemoveItem }) {
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#F5F1ED] z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-6 w-6" />
                  <div>
                    <h2 className="text-xl font-bold">Your Cart</h2>
                    <p className="text-sm text-[#E8DED8]">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-16 w-16 text-[#D4C4B0] mx-auto mb-4" />
                  <p className="text-[#8B7355]">Your cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="bg-white rounded-2xl p-4 border border-[#E8DED8]"
                  >
                    <div className="flex gap-4">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-20 h-20 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-[#F5EBE8] flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-[#D4C4B0]" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#5C4A3A] text-sm line-clamp-2">
                          {item.name}
                        </h3>
                        {item.weight && (
                          <p className="text-xs text-[#8B7355] mt-1">{item.weight}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-[#5C4A3A]">${item.price}</span>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              className="w-7 h-7 rounded-full bg-[#F5EBE8] text-[#8B7355] flex items-center justify-center hover:bg-[#EDE8E3]"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center font-semibold text-[#5C4A3A]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-full bg-[#F5EBE8] text-[#8B7355] flex items-center justify-center hover:bg-[#EDE8E3]"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => onRemoveItem(item.id)}
                              className="ml-2 text-[#C9B8A6] hover:text-[#8B7355]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="bg-white border-t border-[#E8DED8] p-6 space-y-4">
                <div className="flex items-center justify-between text-lg">
                  <span className="font-semibold text-[#5C4A3A]">Total</span>
                  <span className="font-bold text-2xl text-[#5C4A3A]">${total.toFixed(2)}</span>
                </div>
                
                <Link to={createPageUrl("Checkout")} onClick={onClose}>
                  <Button className="w-full rounded-xl bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:from-[#6B5744] hover:to-[#5C4A3A] text-white py-6 text-base font-semibold">
                    Proceed to Checkout
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}