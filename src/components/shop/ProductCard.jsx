import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Coffee, ShoppingCart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProductCard({ product, onAddToCart, onViewDetails }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group rounded-3xl bg-white border border-[#E8DED8] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div 
        onClick={() => onViewDetails(product)}
        className="aspect-square relative bg-gradient-to-br from-[#F8F6F4] to-[#F5EBE8] overflow-hidden cursor-pointer"
      >
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Coffee className="h-16 w-16 text-[#D4C4B0]" />
          </div>
        )}
        
        {product.featured && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-[#8B7355] text-white">
              <Star className="h-3 w-3 mr-1 fill-white" />
              Featured
            </Badge>
          </div>
        )}
        
        {!product.in_stock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-[#5C4A3A] px-4 py-2 rounded-full font-semibold text-sm">
              Out of Stock
            </span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-[#5C4A3A] text-base line-clamp-1">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-[#8B7355] mt-1 line-clamp-2">{product.description}</p>
        )}
        
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {product.weight && (
            <Badge variant="outline" className="text-xs border-[#E8DED8] text-[#8B7355]">
              {product.weight}
            </Badge>
          )}
          {product.roast_level && product.roast_level !== "N/A" && (
            <Badge variant="outline" className="text-xs border-[#E8DED8] text-[#8B7355]">
              {product.roast_level} Roast
            </Badge>
          )}
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-[#5C4A3A]">${product.price}</span>
          </div>
          
          <Button
            size="sm"
            onClick={() => onAddToCart(product)}
            disabled={!product.in_stock}
            className={`rounded-xl ${
              product.in_stock
                ? "bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:from-[#6B5744] hover:to-[#5C4A3A] text-white"
                : "bg-[#F5EBE8] text-[#C9B8A6] cursor-not-allowed"
            }`}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </motion.div>
  );
}