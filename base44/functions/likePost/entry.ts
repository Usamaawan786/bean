import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await req.json();
    if (!postId) {
      return Response.json({ error: 'postId required' }, { status: 400 });
    }

    // Use service role to bypass RLS so any user can like any post
    const posts = await base44.asServiceRole.entities.CommunityPost.filter({ id: postId });
    const post = posts[0];
    if (!post) {
      return Response.json({ error: 'Post not found' }, { status: 404 });
    }

    const likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];
    const isLiked = likedBy.includes(user.email);
    const newLikedBy = isLiked
      ? likedBy.filter(e => e !== user.email)
      : [...likedBy, user.email];

    await base44.asServiceRole.entities.CommunityPost.update(postId, {
      liked_by: newLikedBy,
      likes_count: newLikedBy.length,
    });

    return Response.json({ liked: !isLiked, likes_count: newLikedBy.length, liked_by: newLikedBy });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});