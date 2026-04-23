import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all posts and all comments
    const [posts, allComments] = await Promise.all([
      base44.asServiceRole.entities.CommunityPost.list('-created_date', 500),
      base44.asServiceRole.entities.Comment.list('-created_date', 5000),
    ]);

    // Build comment count map per post_id
    const commentCountMap = {};
    for (const comment of allComments) {
      if (comment.post_id) {
        commentCountMap[comment.post_id] = (commentCountMap[comment.post_id] || 0) + 1;
      }
    }

    let updatedPosts = 0;
    const updates = [];

    for (const post of posts) {
      const likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];
      const correctLikesCount = likedBy.length;
      const correctCommentsCount = commentCountMap[post.id] || 0;

      const needsUpdate =
        post.likes_count !== correctLikesCount ||
        post.comments_count !== correctCommentsCount;

      if (needsUpdate) {
        updates.push(
          base44.asServiceRole.entities.CommunityPost.update(post.id, {
            likes_count: correctLikesCount,
            comments_count: correctCommentsCount,
          })
        );
        updatedPosts++;
        console.log(`Post ${post.id}: likes ${post.likes_count}→${correctLikesCount}, comments ${post.comments_count}→${correctCommentsCount}`);
      }
    }

    // Run all updates in parallel
    await Promise.all(updates);

    return Response.json({
      success: true,
      total_posts: posts.length,
      updated_posts: updatedPosts,
      message: `Backfilled ${updatedPosts} of ${posts.length} posts`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});