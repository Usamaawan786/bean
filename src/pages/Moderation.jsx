import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Moderation() {
  const [user, setUser] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
      
      // Redirect if not admin
      if (u.role !== "admin") {
        window.location.href = createPageUrl("Community");
      }
    };
    loadUser();
  }, []);

  const { data: flaggedPosts = [] } = useQuery({
    queryKey: ["flagged-posts"],
    queryFn: () => base44.entities.CommunityPost.filter(
      { moderation_status: "flagged" },
      "-created_date"
    ),
    enabled: !!user
  });

  const { data: pendingPosts = [] } = useQuery({
    queryKey: ["pending-posts"],
    queryFn: () => base44.entities.CommunityPost.filter(
      { moderation_status: "pending" },
      "-created_date"
    ),
    enabled: !!user
  });

  const moderatePostMutation = useMutation({
    mutationFn: async ({ postId, action, moderationNotes }) => {
      return base44.entities.CommunityPost.update(postId, {
        moderation_status: action,
        moderation_notes: moderationNotes
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["flagged-posts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-posts"] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setSelectedPost(null);
      setNotes("");
      
      const actionText = variables.action === "approved" ? "approved" : 
                        variables.action === "hidden" ? "hidden" : "removed";
      toast.success(`Post ${actionText} successfully`);
    }
  });

  const handleModerate = (action) => {
    if (!selectedPost) return;
    moderatePostMutation.mutate({
      postId: selectedPost.id,
      action,
      moderationNotes: notes
    });
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  const allReviewPosts = [...flaggedPosts, ...pendingPosts];

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-5xl mx-auto px-5 pt-6 pb-8">
          <Link
            to={createPageUrl("Community")}
            className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Community
          </Link>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/20 p-3">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Content Moderation</h1>
              <p className="text-[#E8DED8] text-sm">Review flagged and reported posts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8 pb-24">
        <Tabs defaultValue="review" className="space-y-6">
          <TabsList className="bg-white border border-[#E8DED8]">
            <TabsTrigger value="review" className="data-[state=active]:bg-[#8B7355] data-[state=active]:text-white">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Needs Review ({allReviewPosts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="space-y-4">
            {allReviewPosts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-[#E8DED8]">
                <CheckCircle className="h-16 w-16 text-[#8B7355] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#5C4A3A]">All clear!</h3>
                <p className="text-[#8B7355] text-sm mt-2">No posts need moderation</p>
              </div>
            ) : (
              <AnimatePresence>
                {allReviewPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="bg-white rounded-3xl border border-[#E8DED8] p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-[#5C4A3A]">
                            {post.author_name || "User"}
                          </span>
                          <span className="text-xs text-[#C9B8A6]">
                            {post.author_email}
                          </span>
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                            {post.moderation_status}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#8B7355]">
                          {format(new Date(post.created_date), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>

                    {post.flagged_reason && (
                      <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-900">AI Flag Reason</span>
                        </div>
                        <p className="text-sm text-orange-800">{post.flagged_reason}</p>
                      </div>
                    )}

                    {post.reported_by && post.reported_by.length > 0 && (
                      <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="text-sm text-red-800">
                          <strong>User Reports:</strong> {post.reported_by.length} user(s) reported this post
                        </p>
                      </div>
                    )}

                    <div className="mb-4">
                      <p className="text-[#5C4A3A] whitespace-pre-wrap">{post.content}</p>
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt="Post content"
                          className="mt-3 rounded-2xl max-h-64 object-cover"
                        />
                      )}
                    </div>

                    {selectedPost?.id === post.id ? (
                      <div className="space-y-3 border-t border-[#F5EBE8] pt-4">
                        <Textarea
                          placeholder="Add moderation notes (optional)..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="border-[#E8DED8]"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleModerate("approved")}
                            disabled={moderatePostMutation.isPending}
                            className="flex-1 bg-[#8B7355] hover:bg-[#6B5744]"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleModerate("hidden")}
                            disabled={moderatePostMutation.isPending}
                            variant="outline"
                            className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                          >
                            <EyeOff className="h-4 w-4 mr-2" />
                            Hide
                          </Button>
                          <Button
                            onClick={() => handleModerate("removed")}
                            disabled={moderatePostMutation.isPending}
                            variant="outline"
                            className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedPost(null);
                              setNotes("");
                            }}
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setSelectedPost(post)}
                        className="w-full bg-[#8B7355] hover:bg-[#6B5744]"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review Post
                      </Button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}