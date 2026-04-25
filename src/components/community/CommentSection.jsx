import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Send, Loader2, X, Trash2 } from "lucide-react";
import { timeAgo } from "@/utils/timeUtils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function Avatar({ src, name, size = "md" }) {
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm";
  return (
    <div className={`${dim} rounded-full overflow-hidden flex-shrink-0 bg-[#F5EBE8] flex items-center justify-center`}>
      {src
        ? <img src={src} className="w-full h-full object-cover" alt={name} />
        : <span className="font-bold text-[#8B7355]">{(name || "?")[0].toUpperCase()}</span>}
    </div>
  );
}

function CommentBubble({ comment, currentUser, onLike, onReply, onDelete, isReply = false }) {
  const isLiked = comment.liked_by?.includes(currentUser?.email);
  const isOwn = comment.author_email === currentUser?.email;
  const timeAgoStr = timeAgo(comment.created_date);
  const profileUrl = `/UserProfile?email=${encodeURIComponent(comment.author_email || "")}`;

  return (
    <div className="flex gap-2 min-w-0">
      <Link to={profileUrl} className="flex-shrink-0 mt-0.5">
        <Avatar src={comment.author_profile_picture} name={comment.author_name} size={isReply ? "sm" : "md"} />
      </Link>
      <div className="flex-1 min-w-0">
        <div className={`${isReply ? "bg-[#EDE8E3]" : "bg-[#F5EBE8]"} rounded-2xl px-3 py-2`}>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <Link to={profileUrl} className="font-semibold text-[#5C4A3A] text-sm leading-tight hover:underline">
              {comment.author_name}
            </Link>
            {comment.reply_to_author && (
              <span className="text-xs text-[#8B7355] font-medium">@{comment.reply_to_author}</span>
            )}
          </div>
          <p className="text-[#5C4A3A] text-sm mt-0.5 break-words leading-snug">
            {comment.content.split(/(#\w+|@\w+)/g).map((part, i) =>
              part.startsWith('#') ? <span key={i} className="text-[#8B7355] font-medium">{part}</span>
              : part.startsWith('@') ? <span key={i} className="text-blue-500 font-medium">{part}</span>
              : part
            )}
          </p>
        </div>
        {/* Actions row */}
        <div className="flex items-center gap-4 mt-1 px-1">
          <span className="text-[10px] text-[#C9B8A6]">{timeAgoStr}</span>
          {currentUser && (
            <>
              <button
                onClick={() => onLike(comment)}
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                  isLiked ? "text-red-400" : "text-[#C9B8A6] hover:text-[#8B7355]"
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} />
                {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
              </button>
              {!isReply && (
                <button
                  onClick={() => onReply({ id: comment.id, author_name: comment.author_name, author_email: comment.author_email })}
                  className="text-xs font-medium text-[#C9B8A6] hover:text-[#8B7355] transition-colors"
                >
                  Reply
                </button>
              )}
              {isOwn && (
                <button
                  onClick={() => onDelete(comment)}
                  className="text-xs font-medium text-[#C9B8A6] hover:text-red-400 transition-colors flex items-center gap-0.5"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommentSection({ postId, currentUser, postAuthorEmail, onCountChange }) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: allComments = [] } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => base44.entities.Comment.filter({ post_id: postId }, "created_date"),
    // No staleTime — always fresh, but no polling to avoid duplicates
  });

  // Deduplicate by id in case of race conditions
  const uniqueComments = allComments.filter((c, idx, arr) => arr.findIndex(x => x.id === c.id) === idx);

  // Report live count up to parent
  useEffect(() => {
    if (onCountChange) onCountChange(uniqueComments.length);
  }, [uniqueComments.length]);
  const topComments = uniqueComments.filter(c => !c.parent_comment_id);
  const getReplies = (commentId) => uniqueComments.filter(c => c.parent_comment_id === commentId);

  const handleSetReply = (data) => {
    setReplyTo(data);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const createCommentMutation = useMutation({
    mutationFn: async (content) => {
      const commentData = {
        post_id: postId,
        author_email: currentUser.email,
        author_name: currentUser.display_name || currentUser.full_name || currentUser.email.split("@")[0],
        author_profile_picture: currentUser.profile_picture || null,
        content,
        likes_count: 0,
        liked_by: [],
        parent_comment_id: replyTo?.id || null,
        reply_to_author: replyTo?.author_name || null
      };
      const comment = await base44.entities.Comment.create(commentData);

      const fromName = currentUser.display_name || currentUser.full_name || currentUser.email.split('@')[0];

      if (replyTo?.author_email && replyTo.author_email !== currentUser.email) {
        base44.functions.invoke("notifyCommunityActivity", {
          type: "reply",
          toEmail: replyTo.author_email,
          fromEmail: currentUser.email,
          fromName,
          fromPicture: currentUser.profile_picture || null,
          postId,
          message: `${fromName} replied to your comment 💬`,
        }).catch(() => {});
      }

      if (postAuthorEmail && postAuthorEmail !== currentUser.email && postAuthorEmail !== replyTo?.author_email) {
        base44.functions.invoke("notifyCommunityActivity", {
          type: "comment",
          toEmail: postAuthorEmail,
          fromEmail: currentUser.email,
          fromName,
          fromPicture: currentUser.profile_picture || null,
          postId,
          message: `${fromName} commented on your post ☕`,
        }).catch(() => {});
      }

      // Recount actual comments from DB for accuracy (not arithmetic which drifts)
      const [existingComments] = await Promise.all([
        base44.entities.Comment.filter({ post_id: postId })
      ]);
      await base44.entities.CommunityPost.update(postId, {
        comments_count: existingComments.length,
      });

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (comment) => {
      const isLiked = comment.liked_by?.includes(currentUser.email);
      const newLikedBy = isLiked
        ? comment.liked_by.filter(e => e !== currentUser.email)
        : [...(comment.liked_by || []), currentUser.email];
      return base44.entities.Comment.update(comment.id, { liked_by: newLikedBy, likes_count: newLikedBy.length });
    },
    onMutate: async (comment) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previous = queryClient.getQueryData(["comments", postId]);
      const isLiked = comment.liked_by?.includes(currentUser.email);
      const newLikedBy = isLiked
        ? comment.liked_by.filter(e => e !== currentUser.email)
        : [...(comment.liked_by || []), currentUser.email];
      queryClient.setQueryData(["comments", postId], old =>
        old?.map(c => c.id === comment.id ? { ...c, liked_by: newLikedBy, likes_count: newLikedBy.length } : c)
      );
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["comments", postId], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (comment) => {
      await base44.entities.Comment.delete(comment.id);
      // Recount after deletion for accuracy
      const remainingComments = await base44.entities.Comment.filter({ post_id: postId });
      await base44.entities.CommunityPost.update(postId, {
        comments_count: remainingComments.length,
      });
    },
    onMutate: async (comment) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previous = queryClient.getQueryData(["comments", postId]);
      queryClient.setQueryData(["comments", postId], old => old?.filter(c => c.id !== comment.id && c.parent_comment_id !== comment.id));
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["comments", postId], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text || createCommentMutation.isPending) return;
    setNewComment("");
    setReplyTo(null);
    createCommentMutation.mutate(text);
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#E8DED8]">
      <div className="space-y-4 mb-3">
        <AnimatePresence>
          {topComments.map((comment) => {
            const replies = getReplies(comment.id);
            return (
              <motion.div key={comment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <CommentBubble
                  comment={comment}
                  currentUser={currentUser}
                  onLike={likeCommentMutation.mutate}
                  onReply={handleSetReply}
                  onDelete={deleteCommentMutation.mutate}
                />
                {replies.length > 0 && (
                  <div className="ml-10 mt-2 space-y-2">
                    {replies.map(reply => (
                      <CommentBubble
                        key={reply.id}
                        comment={reply}
                        currentUser={currentUser}
                        onLike={likeCommentMutation.mutate}
                        onReply={handleSetReply}
                        onDelete={deleteCommentMutation.mutate}
                        isReply
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {currentUser && (
        <div className="border-t border-[#E8DED8] pt-3">
          {replyTo && (
            <div className="flex items-center justify-between bg-[#F5EBE8] rounded-xl px-3 py-1.5 mb-2">
              <span className="text-xs text-[#8B7355]">Replying to <strong>{replyTo.author_name}</strong></span>
              <button onClick={() => setReplyTo(null)} className="text-[#C9B8A6] hover:text-red-400 ml-2">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Avatar src={currentUser.profile_picture} name={currentUser.display_name || currentUser.full_name} size="sm" />
            <input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyTo ? `Reply to ${replyTo.author_name}...` : "Add a comment..."}
              style={{ fontSize: '16px' }}
              className="flex-1 min-w-0 bg-[#F5EBE8] rounded-full px-4 py-2 text-sm text-[#5C4A3A] placeholder-[#C9B8A6] outline-none border-none focus:ring-0"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || createCommentMutation.isPending}
              className="flex-shrink-0 text-[#8B7355] disabled:text-[#C9B8A6] transition-colors"
            >
              {createCommentMutation.isPending
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <Send className="h-5 w-5" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}