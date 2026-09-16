import { useState } from "react";
import { Heart, Clock, Coffee } from "lucide-react";

const fmtPKR = (n) => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;

// Menu item card — text on the left, square image on the right with a
// white border, prep-time pill, and a like badge for "Most Liked" items.
export default function MenuCard({ item, image, isMostLiked, likes }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex gap-2 bg-[#936548] rounded-2xl overflow-hidden shadow-md">
      {/* Text — left */}
      <div className="flex-1 py-3 pl-4 pr-2 flex flex-col justify-center min-w-0">
        <h3 className="font-bold text-white text-sm leading-snug">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-white/70 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="font-bold text-white text-sm">{fmtPKR(item.price)}</span>
          {item.preparation_time > 0 && (
            <span className="flex items-center gap-1 bg-white/15 rounded-full px-2 py-0.5 text-[11px] text-white">
              <Clock className="h-3 w-3" />
              {item.preparation_time} min
            </span>
          )}
        </div>
      </div>

      {/* Image — right */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 my-2 mr-2 rounded-xl overflow-hidden border-2 border-white/80">
        {imgError ? (
          <div className="w-full h-full bg-gradient-to-br from-[#6B4A3A] to-[#855F4B] flex items-center justify-center">
            <Coffee className="h-7 w-7 text-white/40" />
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
          <div className="absolute bottom-1 right-1 bg-black/55 backdrop-blur-sm rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
            <Heart className="h-2.5 w-2.5 text-white fill-white" />
            <span className="text-[10px] text-white font-medium">{likes}</span>
          </div>
        )}
      </div>
    </div>
  );
}