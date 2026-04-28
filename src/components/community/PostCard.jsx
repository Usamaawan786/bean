import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import UserBadge from "./UserBadge";
import { Pin } from "lucide-react";
import { Heart, MessageCircle, Coffee, Camera, Lightbulb, Star, AlertTriangle, Video, Flag, Ban, Bookmark, UserPlus, UserCheck, Edit2, Check, X, Trash2, BarChart2 } from "lucide-react";
import { formatDateTime } from "@/utils/timeUtils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import CommentSection from "./CommentSection";
import PollDisplay from "./PollDisplay";
import { base44 } from "@/api/base44Client";

const postTypeConfig = {
  general: { icon: Coffee, color: "text-[#8B7355]", bg: "bg-[#F5EBE8]" },
  review: { icon: Star, color: "text-[#6B5744]", bg: "bg-[#EDE8E3]" },
  photo: { icon: Camera, color: "text-[#8B7355]", bg: "bg-[#F5EBE8]" },
  video: { icon: Video, color: "text-[#8B7355]", bg: "bg-[#F5EBE8]" },
  tip: { icon: Lightbulb, color: "text-[#6B5744]", bg: "bg-[#EDE3DF]" },
  poll: { icon: BarChart2, color: "text-[#8B7355]", bg: "bg-[#F5EBE8]" }
};

const reactionEmojis = ["☕", "❤️", "😍", "👍", "🔥"];

function renderContent(content) {
  if (!content) return null;
  // Parse hashtags and mentions
  const parts = content.split(/(#\w+|@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) return <span key={i} className="text-[#8B7355] font-medium">{part}</span>;
    if (part.startsWith('@')) return <span key={i} className="text-blue-500 font-medium">{part}</span>;
    return part;
  });
}

export default function PostCard({ post, currentUserEmail, currentUser, currentUserFollowing = [], currentUserSavedPosts = [], authorBadges = [], onLike, onReaction, onBlock, onReport, onFollow, onSave, onEdit, onDelete }) {
  // Use denormalized badges from the post itself; fall back to prop
  const badges = (post.author_badges && post.author_badges.length > 0) ? post.author_badges : authorBadges;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [liveCommentCount, setLiveCommentCount] = useState(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [savingEdit, setSavingEdit] = useState(false);
  const isOwnPost = post.author_email === currentUserEmail;
  const isFollowingAuthor = currentUserFollowing.includes(post.author_email);
  const isSaved = currentUserSavedPosts.includes(post.id);
  const config = postTypeConfig[post.post_type] || postTypeConfig.general;
  const Icon = config.icon;

  // Always derive liked state and count from liked_by array — single source of truth
  const likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];
  const isLiked = likedBy.includes(currentUserEmail);
  const displayLikesCount = likedBy.length;

  // Comment count: use live count when available, fallback to stored
  const commentCount = liveCommentCount !== null ? liveCommentCount : (post.comments_count || 0);

  const isFlagged = post.moderation_status === "flagged" || post.moderation_status === "pending";
  const hasReported = post.reported_by?.includes(currentUserEmail);

  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);

  const handleLikeTouchStart = useCallback((e) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      if (currentUserEmail) setShowReactions(true);
    }, 400);
  }, [currentUserEmail]);

  const handleLikeTouchEnd = useCallback((e) => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleLikeTouchMove = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleLikeClick = useCallback(() => {
    if (!currentUserEmail) return;
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onLike(post);
  }, [currentUserEmail, onLike, post]);

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
        post.is_pinned ? "border-amber-300 bg-amber-50/20" : isFlagged ? "border-orange-300 bg-orange-50/30" : "border-[#E8DED8]"
      }`}
    >
      {post.is_pinned && (
        <div className="flex items-center gap-1.5 mb-2 text-amber-600 text-xs font-bold">
          <Pin className="h-3 w-3" /> PINNED {post.admin_label && `· ${post.admin_label}`}
        </div>
      )}
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
          <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/UserProfile?email=${encodeURIComponent(post.author_email)}`} className="font-semibold text-[#5C4A3A] hover:text-[#8B7355] transition-colors">
              {post.author_name || "Coffee Lover"}
            </Link>
            {badges.map(b => <UserBadge key={b} badgeKey={b} />)}
            {currentUserEmail && post.author_email !== currentUserEmail && onFollow && (
              <button
                onClick={() => onFollow(post.author_email)}
                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${
                  isFollowingAuthor ? "bg-[#F5EBE8] text-[#8B7355]" : "bg-[#8B7355] text-white hover:bg-[#6B5744]"
                }`}
              >
                {isFollowingAuthor ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                {isFollowingAuthor ? "Following" : "Follow"}
              </button>
            )}
            <span className="text-xs text-[#C9B8A6]">
              {formatDateTime(post.created_date)}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 self-start">
              {isOwnPost && (
                <>
                  {onEdit && (
                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => setIsEditing(true)}
                      className="p-1.5 rounded-lg text-[#C9B8A6] hover:bg-[#F5EBE8] hover:text-[#8B7355] transition-colors" title="Edit post">
                      <Edit2 className="h-3.5 w-3.5" />
                    </motion.button>
                  )}
                  {onDelete && (
                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => setShowDeleteConfirm(true)}
                      className="p-1.5 rounded-lg text-[#C9B8A6] hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete post">
                      <Trash2 className="h-3.5 w-3.5" />
                    </motion.button>
                  )}
                </>
              )}
              {!isOwnPost && (
                <>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setShowReportConfirm(true)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      hasReported ? "bg-orange-100 text-orange-600" : "text-[#C9B8A6] hover:bg-[#F5EBE8] hover:text-orange-500"
                    }`} title="Flag post">
                    <Flag className="h-3.5 w-3.5" />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setShowBlockConfirm(true)}
                    className="p-1.5 rounded-lg text-[#C9B8A6] hover:bg-red-50 hover:text-red-500 transition-colors" title="Block user">
                    <Ban className="h-3.5 w-3.5" />
                  </motion.button>
                </>
              )}
            </div>
          </div>
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full border border-[#E8DED8] rounded-2xl p-3 text-sm text-[#6B5744] resize-none h-24 focus:outline-none focus:border-[#8B7355]"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={async () => {
                  setSavingEdit(true);
                  await onEdit(post.id, { content: editContent });
                  setSavingEdit(false);
                  setIsEditing(false);
                }} disabled={savingEdit || !editContent.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#8B7355] text-white text-xs font-medium hover:bg-[#6B5744]">
                  <Check className="h-3 w-3" /> Save
                </button>
                <button onClick={() => { setIsEditing(false); setEditContent(post.content); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F5EBE8] text-[#8B7355] text-xs font-medium">
                  <X className="h-3 w-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[#6B5744] whitespace-pre-wrap leading-relaxed">{renderContent(post.content)}</p>
          )}
          
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

          {/* Poll */}
          {post.post_type === "poll" && post.poll_options?.length > 0 && (
            <PollDisplay
              post={post}
              currentUser={currentUser}
            />
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
            <div className="relative">
              <button
                onClick={handleLikeClick}
                onTouchStart={handleLikeTouchStart}
                onTouchEnd={handleLikeTouchEnd}
                onTouchMove={handleLikeTouchMove}
                onMouseEnter={() => currentUserEmail && setShowReactions(true)}
                onMouseLeave={() => setShowReactions(false)}
                className={`flex items-center gap-1.5 text-sm transition-colors select-none ${
                  isLiked ? "text-rose-500" : "text-[#C9B8A6] hover:text-rose-400"
                }`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                <span>{displayLikesCount}</span>
              </button>

              <AnimatePresence>
                {showReactions && currentUserEmail && (
                  <>
                    {/* Backdrop to close on outside tap */}
                    <div className="fixed inset-0 z-[9]" onClick={() => setShowReactions(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      onMouseEnter={() => setShowReactions(true)}
                      onMouseLeave={() => setShowReactions(false)}
                      className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-[#E8DED8] p-2 flex gap-1 z-10"
                    >
                      {reactionEmojis.map(emoji => (
                        <motion.button
                          key={emoji}
                          whileHover={{ scale: 1.3, y: -4 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => { handleReaction(emoji); setShowReactions(false); }}
                          className={`p-2 rounded-xl hover:bg-[#F5EBE8] transition-colors ${hasUserReacted(emoji) ? "bg-[#EDE8E3]" : ""}`}
                        >
                          <span className="text-xl">{emoji}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-sm text-[#C9B8A6] hover:text-[#8B7355] transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{commentCount}</span>
            </button>


            {currentUserEmail && onSave && (
              <button
                onClick={() => onSave(post.id)}
                className={`flex items-center gap-1 text-sm ml-auto transition-colors ${
                  isSaved ? "text-[#8B7355]" : "text-[#C9B8A6] hover:text-[#8B7355]"
                }`}
                title={isSaved ? "Unsave" : "Save post"}
              >
                <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
              </button>
            )}
          </div>

          {/* Report Confirmation Dialog */}
          {showReportConfirm && post.author_email !== currentUserEmail && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Flag className="h-5 w-5 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-bold text-[#5C4A3A]">{hasReported ? "Unreport Post" : "Report Post"}</h3>
                </div>
                <p className="text-sm text-[#8B7355] mb-6">
                  {hasReported
                    ? "Remove your report on this post."
                    : "This will flag the post for review. If enough users report it, it will be reviewed by our team."}
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => setShowReportConfirm(false)} variant="outline" className="flex-1 rounded-xl">Cancel</Button>
                  <Button
                    onClick={() => { onReport(post); setShowReportConfirm(false); }}
                    className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {hasReported ? "Unreport" : "Report"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Block Confirmation Dialog */}
          {showBlockConfirm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl"
              >
                <h3 className="text-lg font-bold text-[#5C4A3A] mb-2">Block {post.author_name}?</h3>
                <p className="text-sm text-[#8B7355] mb-6">
                  You won't see posts from this user anymore. This action will also notify the developer.
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => setShowBlockConfirm(false)} variant="outline" className="flex-1 rounded-xl">Cancel</Button>
                  <Button onClick={() => { onBlock(post.author_email); setShowBlockConfirm(false); }} className="flex-1 rounded-xl bg-red-500 hover:bg-red-600">Block</Button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-[#5C4A3A]">Delete Post?</h3>
                </div>
                <p className="text-sm text-[#8B7355] mb-6">This will permanently delete your post and all its comments. This cannot be undone.</p>
                <div className="flex gap-3">
                  <Button onClick={() => setShowDeleteConfirm(false)} variant="outline" className="flex-1 rounded-xl">Cancel</Button>
                  <Button onClick={() => { onDelete(post); setShowDeleteConfirm(false); }} className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white">Delete</Button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Comments Section */}
          <AnimatePresence>
            {showComments && currentUser && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <CommentSection postId={post.id} currentUser={currentUser} postAuthorEmail={post.author_email} onCountChange={setLiveCommentCount} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}