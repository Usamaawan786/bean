import { useState, useEffect } from "react";
import { Plus, Clock, Coffee, Heart } from "lucide-react";

const fmtPKR = (n) => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;

// Delivery menu card — identical layout to the Menu page card (text left,
// square white-bordered photo right), plus an add-to-cart button.
export default function DeliveryProductCard({ product, image, onAdd, isMostLiked, likes }) {
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [image]);

  return (
    <div className="flex gap-2 bg-[#936548] rounded-2xl overflow-hidden shadow-md">
      {/* Text — left */}
      <div className="flex-1 py-3 pl-4 pr-2 flex flex-col justify-center min-w-0">
        <h3 className="font-bold text-white text-sm leading-snug">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-white/70 mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="font-bold text-white text-sm">{fmtPKR(product.price)}</span>
          {product.preparation_time > 0 && (
            <span className="flex items-center gap-1 bg-white/15 rounded-full px-2 py-0.5 text-[11px] text-white">
              <Clock className="h-3 w-3" />
              {product.preparation_time} min
            </span>
          )}
        </div>
      </div>

      {/* Image — right, with add button */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 my-2 mr-2 rounded-xl overflow-hidden border-2 border-white/80">
        {imgError ? (
          <div className="w-full h-full bg-gradient-to-br from-[#6B4A3A] to-[#855F4B] flex items-center justify-center">
            <Coffee className="h-7 w-7 text-white/40" />
          </div>
        ) : (
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
        {isMostLiked && (
          <div className="absolute bottom-1 left-1 bg-black/55 backdrop-blur-sm rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
            <Heart className="h-2.5 w-2.5 text-white fill-white" />
            <span className="text-[10px] text-white font-medium">{likes}</span>
          </div>
        )}
        <button
          onClick={() => onAdd(product)}
          aria-label={`Add ${product.name} to cart`}
          className="absolute bottom-1 right-1 bg-white text-[#936548] rounded-full p-1.5 shadow-md active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
