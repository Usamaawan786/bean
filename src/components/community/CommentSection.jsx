import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Send, Loader2, CornerDownRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function CommentSection({ postId, currentUser, postAuthorEmail }) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null); // { id, author_name }
  const queryClient = useQueryClient();

  const { data: allComments = [] } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => base44.entities.Comment.filter({ post_id: postId }, "created_date")
  });

  // Separate top-level comments and replies
  const comments = allComments.filter(c => !c.parent_comment_id);
  const getReplies = (commentId) => allComments.filter(c => c.parent_comment_id === commentId);

  const createCommentMutation = useMutation({
    mutationFn: async (content) => {
      const commentData = {
        post_id: postId,
        author_email: currentUser.email,
        author_name: currentUser.full_name || currentUser.email.split("@")[0],
        author_profile_picture: currentUser.profile_picture || null,
        content,
        likes_count: 0,
        liked_by: [],
        parent_comment_id: replyTo?.id || null,
        reply_to_author: replyTo?.author_name || null
      };
      const comment = await base44.entities.Comment.create(commentData);

      // Send notification for replies
      if (replyTo?.author_email && replyTo.author_email !== currentUser.email) {
        base44.entities.Notification.create({
          to_email: replyTo.author_email,
          from_email: currentUser.email,
          from_name: currentUser.full_name || currentUser.email.split('@')[0],
          from_picture: currentUser.profile_picture || null,
          type: 'reply',
          message: `${currentUser.full_name || currentUser.email.split('@')[0]} replied to your comment`,
          post_id: postId,
          is_read: false
        }).catch(() => {});
      }

      // Send mention notifications
      const mentions = [...(content.matchAll(/@(\w+)/g))].map(m => m[1]);
      if (mentions.length > 0 && postAuthorEmail && postAuthorEmail !== currentUser.email) {
        base44.entities.Notification.create({
          to_email: postAuthorEmail,
          from_email: currentUser.email,
          from_name: currentUser.full_name || currentUser.email.split('@')[0],
          from_picture: currentUser.profile_picture || null,
          type: 'mention',
          message: `${currentUser.full_name || currentUser.email.split('@')[0]} mentioned you in a comment`,
          post_id: postId,
          is_read: false
        }).catch(() => {});
      }

      // Update post's comment count
      const post = await base44.entities.CommunityPost.filter({ id: postId });
      if (post[0]) {
        await base44.entities.CommunityPost.update(postId, {
          comments_count: (post[0].comments_count || 0) + 1
        });
      }

      return comment;
    },
    onMutate: async (content) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      
      // Snapshot previous value
      const previousComments = queryClient.getQueryData(["comments", postId]);
      
      // Optimistically update
      const optimisticComment = {
        id: `temp-${Date.now()}`,
        post_id: postId,
        author_email: currentUser.email,
        author_name: currentUser.full_name || currentUser.email.split("@")[0],
        content,
        likes_count: 0,
        liked_by: [],
        created_date: new Date().toISOString()
      };
      
      queryClient.setQueryData(["comments", postId], old => [optimisticComment, ...(old || [])]);
      
      return { previousComments };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["comments", postId], context.previousComments);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setNewComment("");
      setReplyTo(null);
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
    onMutate: async (comment) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      
      const previousComments = queryClient.getQueryData(["comments", postId]);
      
      const isLiked = comment.liked_by?.includes(currentUser.email);
      const newLikedBy = isLiked
        ? comment.liked_by.filter(e => e !== currentUser.email)
        : [...(comment.liked_by || []), currentUser.email];
      
      queryClient.setQueryData(["comments", postId], old => 
        old?.map(c => c.id === comment.id ? { ...c, liked_by: newLikedBy, likes_count: newLikedBy.length } : c)
      );
      
      return { previousComments };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["comments", postId], context.previousComments);
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
      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2 text-xs">
          <span className="text-[#8B7355]">↩️ Replying to <strong>{replyTo.author_name}</strong></span>
          <button onClick={() => setReplyTo(null)} className="text-[#C9B8A6] hover:text-red-400 ml-2">✕</button>
        </div>
      )}
      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={replyTo ? `Reply to ${replyTo.author_name}...` : "Add a comment... use @name or #tag"}
          className="flex-1 rounded-xl border-[#E8DED8] focus:border-[#8B7355] focus:ring-[#8B7355]"
          autoFocus={!!replyTo}
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
            const replies = getReplies(comment.id);
            
            return (
              <motion.div key={comment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-[#F5EBE8] flex items-center justify-center mt-0.5">
                    {comment.author_profile_picture
                      ? <img src={comment.author_profile_picture} className="w-full h-full object-cover" />
                      : <span className="text-xs font-bold text-[#8B7355]">{(comment.author_name || "?")[0].toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 bg-[#F5EBE8] rounded-2xl px-4 py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[#5C4A3A] text-sm">{comment.author_name}</span>
                      <span className="text-xs text-[#C9B8A6]">{format(new Date(comment.created_date), "MMM d, h:mm a")}</span>
                    </div>
                    <p className="text-[#6B5744] text-sm">
                      {comment.content.split(/(#\w+|@\w+)/g).map((part, i) =>
                        part.startsWith('#') ? <span key={i} className="text-[#8B7355] font-medium">{part}</span>
                        : part.startsWith('@') ? <span key={i} className="text-blue-500 font-medium">{part}</span>
                        : part
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => likeCommentMutation.mutate(comment)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          isLiked ? "text-[#8B7355]" : "text-[#C9B8A6] hover:text-[#8B7355]"
                        }`}
                      >
                        <Heart className={`h-3 w-3 ${isLiked ? "fill-current" : ""}`} />
                        {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
                      </button>
                      <button
                        onClick={() => setReplyTo({ id: comment.id, author_name: comment.author_name, author_email: comment.author_email })}
                        className="flex items-center gap-1 text-xs text-[#C9B8A6] hover:text-[#8B7355] transition-colors"
                      >
                        <CornerDownRight className="h-3 w-3" /> Reply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Nested Replies */}
                {replies.length > 0 && (
                  <div className="ml-9 mt-2 space-y-2">
                    {replies.map(reply => {
                      const isReplyLiked = reply.liked_by?.includes(currentUser.email);
                      return (
                        <div key={reply.id} className="flex gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-[#EDE8E3] flex items-center justify-center mt-0.5">
                            {reply.author_profile_picture
                              ? <img src={reply.author_profile_picture} className="w-full h-full object-cover" />
                              : <span className="text-xs font-bold text-[#8B7355]">{(reply.author_name || "?")[0].toUpperCase()}</span>}
                          </div>
                          <div className="flex-1 bg-[#EDE8E3] rounded-2xl px-3 py-2">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-semibold text-[#5C4A3A] text-xs">{reply.author_name}</span>
                              {reply.reply_to_author && <span className="text-xs text-[#C9B8A6]">→ {reply.reply_to_author}</span>}
                              <span className="text-xs text-[#C9B8A6]">{format(new Date(reply.created_date), "MMM d, h:mm a")}</span>
                            </div>
                            <p className="text-[#6B5744] text-xs">{reply.content}</p>
                            <button
                              onClick={() => likeCommentMutation.mutate(reply)}
                              className={`flex items-center gap-1 mt-1 text-xs transition-colors ${
                                isReplyLiked ? "text-[#8B7355]" : "text-[#C9B8A6] hover:text-[#8B7355]"
                              }`}
                            >
                              <Heart className={`h-3 w-3 ${isReplyLiked ? "fill-current" : ""}`} />
                              {reply.likes_count > 0 && <span>{reply.likes_count}</span>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}