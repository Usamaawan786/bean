import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function CommentSection({ postId, currentUser }) {
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => base44.entities.Comment.filter({ post_id: postId }, "-created_date")
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content) => {
      const comment = await base44.entities.Comment.create({
        post_id: postId,
        author_email: currentUser.email,
        author_name: currentUser.full_name || currentUser.email.split("@")[0],
        content,
        likes_count: 0,
        liked_by: []
      });

      // Update post's comment count
      const post = await base44.entities.CommunityPost.filter({ id: postId });
      if (post[0]) {
        await base44.entities.CommunityPost.update(postId, {
          comments_count: (post[0].comments_count || 0) + 1
        });
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setNewComment("");
    }
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (comment) => {
      const isLiked = comment.liked_by?.includes(currentUser.email);
      const newLikedBy = isLiked
        ? comment.liked_by.filter(e => e !== currentUser.email)
        : [...(comment.liked_by || []), currentUser.email];
      
      return base44.entities.Comment.update(comment.id, {
        liked_by: newLikedBy,
        likes_count: newLikedBy.length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      createCommentMutation.mutate(newComment.trim());
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-[#E8DED8]">
      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 rounded-xl border-[#E8DED8] focus:border-[#8B7355] focus:ring-[#8B7355]"
        />
        <Button
          type="submit"
          disabled={!newComment.trim() || createCommentMutation.isPending}
          className="rounded-xl bg-[#8B7355] hover:bg-[#6B5744] px-4"
        >
          {createCommentMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Comments List */}
      <div className="space-y-3">
        <AnimatePresence>
          {comments.map((comment) => {
            const isLiked = comment.liked_by?.includes(currentUser.email);
            
            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex gap-2"
              >
                <div className="flex-1 bg-[#F5EBE8] rounded-2xl px-4 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[#5C4A3A] text-sm">
                      {comment.author_name}
                    </span>
                    <span className="text-xs text-[#C9B8A6]">
                      {format(new Date(comment.created_date), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className="text-[#6B5744] text-sm">{comment.content}</p>
                  
                  <button
                    onClick={() => likeCommentMutation.mutate(comment)}
                    className={`flex items-center gap-1 mt-2 text-xs transition-colors ${
                      isLiked ? "text-[#8B7355]" : "text-[#C9B8A6] hover:text-[#8B7355]"
                    }`}
                  >
                    <Heart className={`h-3 w-3 ${isLiked ? "fill-current" : ""}`} />
                    {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}