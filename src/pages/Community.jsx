import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Coffee, Star, Camera, Lightbulb, TrendingUp, Loader2 } from "lucide-react";
import NotificationBell from "@/components/community/NotificationBell";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PostCard from "@/components/community/PostCard";
import PostComposer from "@/components/community/PostComposer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import PullToRefresh from "@/components/shared/PullToRefresh";
import AppHeader from "@/components/shared/AppHeader";
import { getBadgesForCustomer } from "@/components/community/UserBadge";

export default function Community() {
  const [user, setUser] = useState(null);
  const [feedTab, setFeedTab] = useState("all");
  const [headerVisible, setHeaderVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const lastScrollY = useRef(0);
  const scrollRef = useRef(null);
  const headerRef = useRef(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const currentY = el.scrollTop;
      if (currentY < 60) {
        setHeaderVisible(true);
      } else if (currentY > lastScrollY.current + 8) {
        setHeaderVisible(false);
      } else if (currentY < lastScrollY.current - 8) {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentY;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver(() => {
      setHeaderHeight(headerRef.current?.offsetHeight || 0);
    });
    observer.observe(headerRef.current);
    setHeaderHeight(headerRef.current.offsetHeight);
    return () => observer.disconnect();
  }, [user]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          setUser(null);
          return;
        }
        const u = await base44.auth.me();
        if (!u || !u.email) {
          setUser(null);
          return;
        }
        setUser(u);
      } catch (error) {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const { data: allPosts = [], isLoading } = useQuery({
    queryKey: ["community-posts"],
    queryFn: () => base44.entities.CommunityPost.list("-created_date", 50),
    refetchInterval: 15000, // poll every 15s so all users see fresh like counts
  });

  // Real-time subscription so likes/comments from other users appear instantly
  useEffect(() => {
    const unsub = base44.entities.CommunityPost.subscribe((event) => {
      queryClient.setQueryData(["community-posts"], (prev = []) => {
        if (event.type === "create") return [event.data, ...prev.filter(p => p.id !== event.data.id)];
        if (event.type === "update") {
          // Merge update to preserve author_badges if not included in event payload
          return prev.map(p => {
            if (p.id !== event.id) return p;
            return { ...p, ...event.data, author_badges: event.data.author_badges ?? p.author_badges };
          });
        }
        if (event.type === "delete") return prev.filter(p => p.id !== event.id);
        return prev;
      });
    });
    return () => unsub();
  }, [queryClient]);

  const { data: customers = [] } = useQuery({
    queryKey: ["community-customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500),
  });

  // Map customer by email for badge lookups
  const customerByEmail = {};
  customers.forEach(c => { if (c.created_by) customerByEmail[c.created_by] = c; });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["community-posts"] });
  };

  // Filter out hidden/removed posts and posts from blocked users
  const blockedUsers = user?.blocked_users || [];
  const allFilteredPosts = allPosts.filter(post =>
    post.moderation_status !== "hidden" &&
    post.moderation_status !== "removed" &&
    !blockedUsers.includes(post.author_email)
  );

  const following = user?.following || [];
  const savedPostIds = user?.saved_posts || [];
  const feedFiltered = feedTab === "following"
    ? allFilteredPosts.filter(p => following.includes(p.author_email))
    : feedTab === "saved"
    ? allFilteredPosts.filter(p => savedPostIds.includes(p.id))
    : allFilteredPosts;

  // Pinned posts first
  const pinnedPosts = feedFiltered.filter(p => p.is_pinned);
  const otherPosts = feedFiltered.filter(p => !p.is_pinned);
  const posts = [...pinnedPosts, ...otherPosts];

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

      // Compute badges for this user from the customers cache
      const myCustomer = customers.find(c => c.created_by === user.email || c.user_email === user.email);
      const myBadges = getBadgesForCustomer(myCustomer);

      return base44.entities.CommunityPost.create({
        ...postData,
        author_email: user.email,
        author_name: user.display_name || user.full_name || user.email.split("@")[0],
        author_profile_picture: user.profile_picture || null,
        author_badges: myBadges,
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
      const currentLikedBy = post.liked_by || [];
      const isLiked = currentLikedBy.includes(user.email);
      const newLikedBy = isLiked
        ? currentLikedBy.filter(e => e !== user.email)
        : [...currentLikedBy, user.email];

      await base44.entities.CommunityPost.update(post.id, {
        liked_by: newLikedBy,
        likes_count: newLikedBy.length
      });

      if (!isLiked && post.author_email && post.author_email !== user.email) {
        base44.functions.invoke("notifyCommunityActivity", {
          type: "like",
          toEmail: post.author_email,
          fromEmail: user.email,
          fromName: user.display_name || user.full_name || user.email.split("@")[0],
          fromPicture: user.profile_picture || null,
          postId: post.id,
          postLikesCount: newLikedBy.length,
        }).catch(() => {});
      }
    },
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey: ["community-posts"] });
      const previous = queryClient.getQueryData(["community-posts"]);
      const currentLikedBy = post.liked_by || [];
      const isLiked = currentLikedBy.includes(user.email);
      const newLikedBy = isLiked
        ? currentLikedBy.filter(e => e !== user.email)
        : [...currentLikedBy, user.email];
      queryClient.setQueryData(["community-posts"], old =>
        old?.map(p => p.id === post.id ? { ...p, liked_by: newLikedBy, likes_count: newLikedBy.length } : p)
      );
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["community-posts"], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async (post) => {
      await base44.entities.CommunityPost.delete(post.id);
      // Also delete all comments for this post
      const comments = await base44.entities.Comment.filter({ post_id: post.id });
      await Promise.all(comments.map(c => base44.entities.Comment.delete(c.id)));
    },
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey: ["community-posts"] });
      const previous = queryClient.getQueryData(["community-posts"]);
      queryClient.setQueryData(["community-posts"], old => old?.filter(p => p.id !== post.id));
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["community-posts"], context.previous);
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

  const handleBlockUser = async (userEmailToBlock) => {
    const currentBlockedUsers = user.blocked_users || [];
    await base44.auth.updateMe({
      blocked_users: [...currentBlockedUsers, userEmailToBlock]
    });
    const updatedUser = await base44.auth.me();
    setUser(updatedUser);
    await queryClient.invalidateQueries({ queryKey: ["community-posts"] });
  };

  const handleFollow = async (targetEmail) => {
    if (!user) return;
    const isFollowing = (user.following || []).includes(targetEmail);
    await base44.functions.invoke("followUser", { targetEmail, action: isFollowing ? "unfollow" : "follow" });
    const updatedUser = await base44.auth.me();
    setUser(updatedUser);
  };

  const handleSavePost = async (postId) => {
    if (!user) return;
    const saved = user.saved_posts || [];
    const isSaved = saved.includes(postId);
    await base44.auth.updateMe({ saved_posts: isSaved ? saved.filter(id => id !== postId) : [...saved, postId] });
    const updatedUser = await base44.auth.me();
    setUser(updatedUser);
  };

  const editPostMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommunityPost.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["community-posts"] })
  });



  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div ref={scrollRef} className="h-screen overflow-y-auto bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-secondary)]">
        {/* Header */}
        <div
          ref={headerRef}
          className="bg-gradient-to-br from-white dark:from-[var(--bg-card)] to-[#F5F1ED] dark:to-[var(--bg-elevated)] border-b border-[#E8DED8] dark:border-[var(--border-light)] fixed top-0 left-0 right-0 z-10 shadow-sm select-none transition-transform duration-200"
          style={{ transform: headerVisible ? 'translateY(0)' : `translateY(-${headerHeight}px)` }}
        >
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
                <div className="rounded-2xl bg-gradient-to-br from-[#EDE3DF] to-[#E0D5CE] p-3 shadow-md flex-shrink-0">
                  <Users className="h-6 w-6 text-[#8B7355]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-[#5C4A3A]">Community</h1>
                  <p className="text-sm text-[#8B7355] truncate">Share your coffee moments</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {user && <NotificationBell userEmail={user.email} />}
                {user?.role === "admin" && (
                  <div className="flex gap-2">
                    <Link to="/AdminCommunity">
                      <button className="bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 px-3 py-2 rounded-xl text-xs font-medium text-amber-900 transition-colors shadow-md whitespace-nowrap">
                        📌 Manage
                      </button>
                    </Link>
                    <Link to={createPageUrl("Moderation")}>
                      <button className="bg-gradient-to-r from-[#EDE3DF] to-[#E0D5CE] hover:from-[#E8DED8] hover:to-[#DCCEC8] px-3 py-2 rounded-xl text-xs font-medium text-[#5C4A3A] transition-colors shadow-md whitespace-nowrap">
                        Moderation
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
            {user && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setFeedTab("all")}
                  className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    feedTab === "all" ? "bg-[#8B7355] text-white" : "bg-[#F5EBE8] text-[#8B7355] hover:bg-[#EDE8E3]"
                  }`}
                >All</button>
                <button
                  onClick={() => setFeedTab("following")}
                  className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    feedTab === "following" ? "bg-[#8B7355] text-white" : "bg-[#F5EBE8] text-[#8B7355] hover:bg-[#EDE8E3]"
                  }`}
                >Following</button>
                <button
                  onClick={() => setFeedTab("saved")}
                  className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    feedTab === "saved" ? "bg-[#8B7355] text-white" : "bg-[#F5EBE8] text-[#8B7355] hover:bg-[#EDE8E3]"
                  }`}
                >Saved</button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-lg mx-auto px-5 pb-24 space-y-4" style={{ paddingTop: headerHeight }}>
          {user ? (
            <PostComposer 
              onPost={createPostMutation.mutate}
              userName={user?.display_name || user?.full_name}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 text-center">
              <Users className="h-10 w-10 text-[#8B7355] mx-auto mb-3" />
              <h3 className="font-bold text-[#5C4A3A] mb-2">Join the Conversation</h3>
              <p className="text-sm text-[#8B7355] mb-4">Sign in to share your coffee moments with the community</p>
              <Button 
                onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
                className="bg-[#8B7355] hover:bg-[#6B5744] text-white"
              >
                Sign In to Post
              </Button>
            </div>
          )}
          
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
                    currentUserFollowing={user?.following || []}
                    currentUserSavedPosts={user?.saved_posts || []}
                    authorBadges={getBadgesForCustomer(customerByEmail[post.author_email])}
                    onLike={likeMutation.mutate}
                    onReport={reportPostMutation.mutate}
                    onReaction={(post, emoji) => reactionMutation.mutate({ post, emoji })}
                    onBlock={handleBlockUser}
                    onFollow={handleFollow}
                    onSave={handleSavePost}
                    onEdit={(id, data) => editPostMutation.mutate({ id, data })}
                    onDelete={deletePostMutation.mutate}
                    />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}