import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Coffee, Camera, Lightbulb, Star } from "lucide-react";
import { format } from "date-fns";

const postTypeConfig = {
  general: { icon: Coffee, color: "text-[#8B7355]", bg: "bg-[#F5EBE8]" },
  review: { icon: Star, color: "text-[#6B5744]", bg: "bg-[#EDE8E3]" },
  photo: { icon: Camera, color: "text-[#8B7355]", bg: "bg-[#F5EBE8]" },
  tip: { icon: Lightbulb, color: "text-[#6B5744]", bg: "bg-[#EDE3DF]" }
};

export default function PostCard({ post, currentUserEmail, onLike }) {
  const [isLiking, setIsLiking] = useState(false);
  const config = postTypeConfig[post.post_type] || postTypeConfig.general;
  const Icon = config.icon;
  const isLiked = post.liked_by?.includes(currentUserEmail);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    await onLike(post);
    setIsLiking(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-white border border-[#E8DED8] p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-full ${config.bg} p-2.5`}>
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#5C4A3A]">{post.author_name || "Coffee Lover"}</span>
            <span className="text-xs text-[#C9B8A6]">
              {post.created_date && format(new Date(post.created_date), "MMM d, h:mm a")}
            </span>
          </div>
          <p className="mt-2 text-[#6B5744] whitespace-pre-wrap">{post.content}</p>
          
          {post.image_url && (
            <div className="mt-3 rounded-2xl overflow-hidden">
              <img 
                src={post.image_url} 
                alt="Post attachment"
                className="w-full max-h-80 object-cover"
              />
            </div>
          )}
          
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                isLiked ? "text-[#8B7355]" : "text-[#C9B8A6] hover:text-[#8B7355]"
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              <span>{post.likes_count || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}