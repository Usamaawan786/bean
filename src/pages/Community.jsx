import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Coffee, Star, Camera, Lightbulb, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PostCard from "@/components/community/PostCard";
import PostComposer from "@/components/community/PostComposer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Community() {
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
    };
    loadUser();
  }, []);

  const { data: allPosts = [], isLoading } = useQuery({
    queryKey: ["community-posts"],
    queryFn: () => {
      return base44.entities.CommunityPost.list("-created_date", 50);
    }
  });

  // Filter out hidden/removed posts for regular users
  const posts = allPosts.filter(post => 
    post.moderation_status !== "hidden" && post.moderation_status !== "removed"
  );

  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      // AI-powered content moderation
      const moderationResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this community post for inappropriate content including hate speech, spam, profanity, threats, or harassment. 

Post content: "${postData.content}"

Respond with JSON indicating if the content is safe or should be flagged.`,
        response_json_schema: {
          type: "object",
          properties: {
            is_safe: { type: "boolean" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            reason: { type: "string" }
          }
        }
      });

      const moderationStatus = moderationResult.is_safe ? "approved" : "flagged";
      const flaggedReason = moderationResult.is_safe ? null : moderationResult.reason;

      return base44.entities.CommunityPost.create({
        ...postData,
        author_email: user.email,
        author_name: user.full_name || user.email.split("@")[0],
        author_profile_picture: user.profile_picture || null,
        likes_count: 0,
        liked_by: [],
        moderation_status: moderationStatus,
        flagged_reason: flaggedReason,
        reported_by: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const likeMutation = useMutation({
    mutationFn: async (post) => {
      const isLiked = post.liked_by?.includes(user.email);
      const newLikedBy = isLiked
        ? post.liked_by.filter(e => e !== user.email)
        : [...(post.liked_by || []), user.email];
      
      return base44.entities.CommunityPost.update(post.id, {
        liked_by: newLikedBy,
        likes_count: newLikedBy.length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const reportPostMutation = useMutation({
    mutationFn: async (post) => {
      const hasReported = post.reported_by?.includes(user.email);
      const newReportedBy = hasReported
        ? post.reported_by.filter(e => e !== user.email)
        : [...(post.reported_by || []), user.email];
      
      // If 3+ reports, flag for review. If below 3, unflag
      const shouldFlag = newReportedBy.length >= 3;
      
      return base44.entities.CommunityPost.update(post.id, {
        reported_by: newReportedBy,
        moderation_status: shouldFlag ? "flagged" : (newReportedBy.length === 0 ? "approved" : post.moderation_status)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const reactionMutation = useMutation({
    mutationFn: async ({ post, emoji }) => {
      const currentReactions = post.reactions || {};
      const emojiReactions = currentReactions[emoji] || [];
      const hasReacted = emojiReactions.includes(user.email);
      
      const newEmojiReactions = hasReacted
        ? emojiReactions.filter(e => e !== user.email)
        : [...emojiReactions, user.email];
      
      return base44.entities.CommunityPost.update(post.id, {
        reactions: {
          ...currentReactions,
          [emoji]: newEmojiReactions
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const tabs = [
    { id: "all", label: "All", icon: TrendingUp },
    { id: "general", label: "General", icon: Coffee },
    { id: "review", label: "Reviews", icon: Star },
    { id: "photo", label: "Photos", icon: Camera },
    { id: "tip", label: "Tips", icon: Lightbulb }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF]">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-white to-[#F5F1ED] border-b border-[#E8DED8] sticky top-0 z-10 shadow-sm">
        <div className="absolute inset-0 opacity-5">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute top-5 right-10 w-32 h-32 bg-[#D4C4B0] rounded-full blur-3xl"
          />
        </div>
        <div className="relative max-w-lg mx-auto px-5 pt-6 pb-4">
          <Link 
            to={createPageUrl("Home")}
            className="inline-flex items-center gap-1 text-[#8B7355] text-sm mb-4 hover:text-[#5C4A3A] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="rounded-2xl bg-gradient-to-br from-[#EDE3DF] to-[#E0D5CE] p-3 shadow-md flex-shrink-0"
              >
                <Users className="h-6 w-6 text-[#8B7355]" />
              </motion.div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-[#5C4A3A]">Community</h1>
                <p className="text-sm text-[#8B7355] truncate">Share your coffee moments</p>
              </div>
            </div>
            
            {user?.role === "admin" && (
              <Link to={createPageUrl("Moderation")} className="flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-r from-[#EDE3DF] to-[#E0D5CE] hover:from-[#E8DED8] hover:to-[#DCCEC8] px-3 py-2 rounded-xl text-xs font-medium text-[#5C4A3A] transition-colors shadow-md whitespace-nowrap"
                >
                  Moderation
                </motion.button>
              </Link>
            )}
          </div>
        </div>
        

      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-5 py-6 pb-24 space-y-4">
        {/* Post Composer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <PostComposer 
            onPost={createPostMutation.mutate}
            userName={user?.full_name}
          />
        </motion.div>
        
        {/* Posts */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-3xl h-32 animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <Coffee className="h-12 w-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          <AnimatePresence>
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <PostCard
                  post={post}
                  currentUserEmail={user?.email}
                  currentUser={user}
                  onLike={likeMutation.mutate}
                  onReport={reportPostMutation.mutate}
                  onReaction={(post, emoji) => reactionMutation.mutate({ post, emoji })}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}