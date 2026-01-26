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
  const [activeTab, setActiveTab] = useState("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
    };
    loadUser();
  }, []);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["community-posts", activeTab],
    queryFn: () => {
      if (activeTab === "all") {
        return base44.entities.CommunityPost.list("-created_date", 50);
      }
      return base44.entities.CommunityPost.filter({ post_type: activeTab }, "-created_date", 50);
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      return base44.entities.CommunityPost.create({
        ...postData,
        author_email: user.email,
        likes_count: 0,
        liked_by: []
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

  const tabs = [
    { id: "all", label: "All", icon: TrendingUp },
    { id: "general", label: "General", icon: Coffee },
    { id: "review", label: "Reviews", icon: Star },
    { id: "photo", label: "Photos", icon: Camera },
    { id: "tip", label: "Tips", icon: Lightbulb }
  ];

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8DED8] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-5 pt-6 pb-4">
          <Link 
            to={createPageUrl("Home")}
            className="inline-flex items-center gap-1 text-[#8B7355] text-sm mb-4 hover:text-[#5C4A3A] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#EDE3DF] p-3">
              <Users className="h-6 w-6 text-[#8B7355]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#5C4A3A]">Community</h1>
              <p className="text-sm text-[#8B7355]">Share your coffee moments</p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="max-w-lg mx-auto px-5 pb-4 overflow-x-auto">
          <div className="flex gap-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? "bg-[#8B7355] text-white"
                      : "bg-[#F5EBE8] text-[#6B5744] hover:bg-[#EDE8E3]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-5 py-6 pb-24 space-y-4">
        {/* Post Composer */}
        <PostComposer 
          onPost={createPostMutation.mutate}
          userName={user?.full_name}
        />
        
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
                  onLike={likeMutation.mutate}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}