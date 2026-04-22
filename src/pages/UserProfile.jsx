import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, User, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PostCard from "@/components/community/PostCard";
import { getBadgesForCustomer } from "@/components/community/UserBadge";
import UserBadge from "@/components/community/UserBadge";

export default function UserProfile() {
  const params = new URLSearchParams(window.location.search);
  const targetEmail = params.get("email");

  const [currentUser, setCurrentUser] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [targetEmail]);

  const loadUsers = async () => {
    setIsLoadingUser(true);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const me = await base44.auth.me();
        setCurrentUser(me);
        setIsFollowing((me.following || []).includes(targetEmail));
      }
      // Find target user from community posts to get their info
      const posts = await base44.entities.CommunityPost.filter({ author_email: targetEmail }, "-created_date", 1);
      if (posts.length > 0) {
        setTargetUser({
          email: targetEmail,
          full_name: posts[0].author_name,
          profile_picture: posts[0].author_profile_picture
        });
      } else {
        setTargetUser({ email: targetEmail, full_name: targetEmail.split("@")[0] });
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoadingUser(false);
  };

  const { data: userPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["user-posts", targetEmail],
    queryFn: () => base44.entities.CommunityPost.filter({ author_email: targetEmail }, "-created_date", 50),
    enabled: !!targetEmail
  });

  const { data: userInfo } = useQuery({
    queryKey: ["user-info", targetEmail],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: targetEmail });
      return users[0] || null;
    },
    enabled: !!targetEmail
  });

  const { data: targetCustomer } = useQuery({
    queryKey: ["target-customer", targetEmail],
    queryFn: async () => {
      const customers = await base44.entities.Customer.filter({ created_by: targetEmail });
      return customers[0] || null;
    },
    enabled: !!targetEmail
  });

  const handleFollow = async () => {
    if (!currentUser) {
      base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      return;
    }
    setFollowLoading(true);
    try {
      const action = isFollowing ? "unfollow" : "follow";
      await base44.functions.invoke("followUser", { targetEmail, action });
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? "Unfollowed" : "Following!");
      const me = await base44.auth.me();
      setCurrentUser(me);
    } catch (e) {
      toast.error("Something went wrong");
    }
    setFollowLoading(false);
  };

  const approvedPosts = userPosts.filter(p => p.moderation_status !== "hidden" && p.moderation_status !== "removed");
  const followersCount = userInfo?.followers?.length || 0;
  const followingCount = userInfo?.following?.length || 0;

  if (isLoadingUser) {
    return <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" /></div>;
  }

  return (
    <div className="h-screen overflow-y-auto bg-[#F5F1ED]">
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-lg mx-auto px-5 pt-6 pb-20">
          <Link to={createPageUrl("Community")} className="inline-flex items-center gap-1 text-[#E8DED8] text-sm mb-6 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-xl font-bold">Profile</h1>
        </div>
      </div>

      <div className="relative z-10 flex justify-center -mt-16">
        <div className="w-28 h-28 rounded-full bg-white p-2 shadow-lg">
          {targetUser?.profile_picture ? (
            <img src={targetUser.profile_picture} alt="Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#C9B8A6] flex items-center justify-center">
              <User className="h-10 w-10 text-white" />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-4 pb-24">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-[#5C4A3A]">{targetUser?.full_name || targetEmail?.split("@")[0]}</h2>
          {targetCustomer && getBadgesForCustomer(targetCustomer).length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              {getBadgesForCustomer(targetCustomer).map(badgeKey => (
                <UserBadge key={badgeKey} badgeKey={badgeKey} size="sm" />
              ))}
            </div>
          )}
          {userInfo?.bio && <p className="text-sm text-[#8B7355] mt-1">{userInfo.bio}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
            <div className="text-2xl font-bold text-[#8B7355]">{approvedPosts.length}</div>
            <div className="text-xs text-[#C9B8A6] mt-1">Posts</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
            <div className="text-2xl font-bold text-[#8B7355]">{followersCount}</div>
            <div className="text-xs text-[#C9B8A6] mt-1">Followers</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
            <div className="text-2xl font-bold text-[#8B7355]">{followingCount}</div>
            <div className="text-xs text-[#C9B8A6] mt-1">Following</div>
          </div>
        </div>

        {currentUser && currentUser.email !== targetEmail && (
          <Button
            onClick={handleFollow}
            disabled={followLoading}
            className={`w-full mb-6 rounded-2xl h-12 text-base font-semibold ${
              isFollowing
                ? "bg-white text-[#8B7355] border-2 border-[#8B7355] hover:bg-[#F5EBE8]"
                : "bg-gradient-to-r from-[#8B7355] to-[#6B5744] text-white hover:from-[#6B5744] hover:to-[#5C4A3A]"
            }`}
          >
            {followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isFollowing ? "Following ✓" : "Follow"}
          </Button>
        )}

        <h3 className="font-bold text-[#5C4A3A] mb-4">Posts ({approvedPosts.length})</h3>

        {postsLoading ? (
          <div className="space-y-4">{[1,2].map(i => <div key={i} className="bg-white rounded-3xl h-32 animate-pulse" />)}</div>
        ) : approvedPosts.length === 0 ? (
          <div className="text-center py-12 text-[#C9B8A6]">No posts yet</div>
        ) : (
          <div className="space-y-4">
            {approvedPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserEmail={currentUser?.email}
                currentUser={currentUser}
                currentUserFollowing={currentUser?.following || []}
                currentUserSavedPosts={currentUser?.saved_posts || []}
                authorBadges={getBadgesForCustomer(targetCustomer)}
                onLike={async (p) => {
                  const isLiked = p.liked_by?.includes(currentUser?.email);
                  const newLikedBy = isLiked ? p.liked_by.filter(e => e !== currentUser.email) : [...(p.liked_by || []), currentUser.email];
                  await base44.entities.CommunityPost.update(p.id, { liked_by: newLikedBy, likes_count: newLikedBy.length });
                }}
                onReport={() => {}}
                onReaction={() => {}}
                onBlock={() => {}}
                onFollow={() => {}}
                onSave={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}