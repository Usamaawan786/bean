import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Heart, MessageSquare, Image, FileText, Star } from "lucide-react";

const POST_TYPE_ICON = {
  general: FileText,
  review: Star,
  photo: Image,
  tip: Star,
  video: Image,
};

export default function CommunityTab({ email, posts }) {
  const { data: comments = [] } = useQuery({
    queryKey: ["user-comments", email],
    queryFn: () => base44.entities.Comment.filter({ author_email: email }, "-created_date", 50),
    enabled: !!email,
  });

  const totalLikes = posts.reduce((s, p) => s + (p.likes_count || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.comments_count || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 text-sm mb-3">Community Summary</h4>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-gray-50 rounded-xl p-2">
            <div className="text-lg font-bold text-gray-800">{posts.length}</div>
            <div className="text-xs text-gray-400">Posts</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-2">
            <div className="text-lg font-bold text-gray-800">{comments.length}</div>
            <div className="text-xs text-gray-400">Comments</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-2">
            <div className="text-lg font-bold text-rose-500">{totalLikes}</div>
            <div className="text-xs text-gray-400">Likes Recv</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-2">
            <div className="text-lg font-bold text-blue-500">{totalComments}</div>
            <div className="text-xs text-gray-400">Comments Recv</div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 text-sm mb-3">Posts ({posts.length})</h4>
        {posts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No posts yet</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {posts.map(post => {
              const Icon = POST_TYPE_ICON[post.post_type] || FileText;
              return (
                <div key={post.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-rose-500">
                          <Heart className="h-3 w-3" /> {post.likes_count || 0}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-blue-500">
                          <MessageSquare className="h-3 w-3" /> {post.comments_count || 0}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          post.moderation_status === "approved" ? "bg-green-100 text-green-600" :
                          post.moderation_status === "flagged" ? "bg-red-100 text-red-600" :
                          "bg-gray-100 text-gray-500"
                        }`}>{post.moderation_status}</span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {post.created_date ? format(new Date(post.created_date), "MMM d") : ""}
                        </span>
                      </div>
                    </div>
                    {post.image_url && (
                      <img src={post.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 text-sm mb-3">Comments ({comments.length})</h4>
        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {comments.map(c => (
              <div key={c.id} className="border-b border-gray-50 last:border-0 py-2">
                <p className="text-sm text-gray-700 line-clamp-2">{c.content}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-rose-400">
                    <Heart className="h-3 w-3" /> {c.likes_count || 0}
                  </span>
                  <span className="text-xs text-gray-400">
                    {c.created_date ? format(new Date(c.created_date), "MMM d, HH:mm") : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}