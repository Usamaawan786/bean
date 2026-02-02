import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Coffee, Camera, Lightbulb, Star, AlertTriangle, Video } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import CommentSection from "./CommentSection";

const postTypeConfig = {
  general: { icon: Coffee, color: "text-[#8B7355]", bg: "bg-[#F5EBE8]" },
  review: { icon: Star, color: "text-[#6B5744]", bg: "bg-[#EDE8E3]" },
  photo: { icon: Camera, color: "text-[#8B7355]", bg: "bg-[#F5EBE8]" },
  video: { icon: Video, color: "text-[#8B7355]", bg: "bg-[#F5EBE8]" },
  tip: { icon: Lightbulb, color: "text-[#6B5744]", bg: "bg-[#EDE3DF]" }
};

const reactionEmojis = ["☕", "❤️", "😍", "👍", "🔥"];

export default function PostCard({ post, currentUserEmail, currentUser, onLike, onReport, onReaction }) {
  const [isLiking, setIsLiking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const config = postTypeConfig[post.post_type] || postTypeConfig.general;
  const Icon = config.icon;
  const isLiked = post.liked_by?.includes(currentUserEmail);
  const hasReported = post.reported_by?.includes(currentUserEmail);
  const isFlagged = post.moderation_status === "flagged" || post.moderation_status === "pending";

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    await onLike(post);
    setIsLiking(false);
  };

  const handleReport = async () => {
    if (isReporting) return;
    setIsReporting(true);
    try {
      await onReport(post);
      // Wait a bit to ensure the state updates
      setTimeout(() => setIsReporting(false), 500);
    } catch (error) {
      console.error("Error reporting post:", error);
      setIsReporting(false);
    }
  };

  const handleReaction = (emoji) => {
    onReaction(post, emoji);
    setShowReactions(false);
  };

  const getTotalReactions = () => {
    if (!post.reactions) return 0;
    return Object.values(post.reactions).reduce((sum, users) => sum + (users?.length || 0), 0);
  };

  const hasUserReacted = (emoji) => {
    return post.reactions?.[emoji]?.includes(currentUserEmail);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl bg-white border p-5 shadow-sm ${
        isFlagged ? "border-orange-300 bg-orange-50/30" : "border-[#E8DED8]"
      }`}
    >
      {isFlagged && (
        <div className="flex items-center gap-2 mb-3 text-orange-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">Under review</span>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {post.author_profile_picture ? (
            <img 
              src={post.author_profile_picture} 
              alt={post.author_name} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className={`rounded-full ${config.bg} p-2.5`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
          )}
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

          {post.video_url && (
            <div className="mt-3 rounded-2xl overflow-hidden">
              <video 
                src={post.video_url} 
                controls
                className="w-full max-h-80"
              />
            </div>
          )}
          
          {/* Reactions Preview */}
          {getTotalReactions() > 0 && (
            <div className="mt-3 flex items-center gap-1 flex-wrap">
              {Object.entries(post.reactions || {}).map(([emoji, users]) => 
                users?.length > 0 && (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.1 }}
                    onClick={() => handleReaction(emoji)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      hasUserReacted(emoji) 
                        ? "bg-[#8B7355] text-white" 
                        : "bg-[#F5EBE8] text-[#6B5744] hover:bg-[#EDE8E3]"
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{users.length}</span>
                  </motion.button>
                )
              )}
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

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-sm text-[#C9B8A6] hover:text-[#8B7355] transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.comments_count || 0}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="flex items-center gap-1.5 text-sm text-[#C9B8A6] hover:text-[#8B7355] transition-colors"
              >
                <span className="text-base">😊</span>
                <span className="text-xs">React</span>
              </button>

              <AnimatePresence>
                {showReactions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-lg border border-[#E8DED8] p-2 flex gap-1"
                  >
                    {reactionEmojis.map(emoji => (
                      <motion.button
                        key={emoji}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReaction(emoji)}
                        className={`p-2 rounded-xl hover:bg-[#F5EBE8] transition-colors ${
                          hasUserReacted(emoji) ? "bg-[#EDE8E3]" : ""
                        }`}
                      >
                        <span className="text-xl">{emoji}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleReport}
              disabled={isReporting}
              className={`flex items-center gap-1.5 text-sm transition-colors ml-auto ${
                hasReported ? "text-[#D9534F]" : "text-[#C9B8A6] hover:text-[#8B7355]"
              }`}
              title={hasReported ? "Click to remove report" : "Report post"}
            >
              <Flag className={`h-4 w-4 ${hasReported ? "fill-current" : ""}`} />
            </button>
          </div>

          {/* Comments Section */}
          <AnimatePresence>
            {showComments && currentUser && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <CommentSection postId={post.id} currentUser={currentUser} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}