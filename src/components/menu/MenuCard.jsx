import { useState } from "react";
import { Heart, Clock, Coffee } from "lucide-react";

const fmtPKR = (n) => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;

export default function MenuCard({ item, image, isMostLiked, likes }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex gap-3 bg-[#926A54] rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <div className="relative w-28 h-28 sm:w-36 sm:h-36 shrink-0">
        {imgError ? (
          <div className="w-full h-full bg-gradient-to-br from-[#6B4A3A] to-[#855F4B] flex items-center justify-center">
            <Coffee className="h-8 w-8 text-white/30" />
          </div>
        ) : (
          <img
            src={image}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
        {isMostLiked && (
          <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
            <Heart className="h-3 w-3 text-white fill-white" />
            <span className="text-xs text-white font-medium">{likes}</span>
          </div>
        )}
      </div>
      <div className="flex-1 py-2.5 pr-3 flex flex-col justify-center min-w-0">
        <h3 className="font-bold text-white text-sm leading-snug">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-white/60 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-bold text-[#F0E0D0] text-sm">{fmtPKR(item.price)}</span>
          {item.preparation_time > 0 && (
            <span className="text-xs text-white/50 flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {item.preparation_time} min
            </span>
          )}
        </div>
      </div>
    </div>
  );
}