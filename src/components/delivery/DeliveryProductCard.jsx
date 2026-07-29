import { Plus } from "lucide-react";

export default function DeliveryProductCard({ product, onAdd }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E8DED8] flex flex-col">
      <div className="w-full h-28 bg-[#F5EBE8] overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">☕</div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-sm text-[#5C4A3A] leading-tight">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-[#8B7355] line-clamp-2 mt-0.5 flex-1">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-[#5C4A3A] text-sm">Rs. {product.price}</span>
          <button
            onClick={() => onAdd(product)}
            className="bg-[#8B7355] text-white rounded-full p-1.5 hover:bg-[#6B5744] active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}