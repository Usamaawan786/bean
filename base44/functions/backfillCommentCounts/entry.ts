import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all posts
    const posts = await base44.asServiceRole.entities.CommunityPost.list();
    console.log(`[backfillCommentCounts] Found ${posts.length} posts to process`);

    let updated = 0;
    let skipped = 0;

    for (const post of posts) {
      // Count all comments (including replies) for this post
      const comments = await base44.asServiceRole.entities.Comment.filter({ post_id: post.id });
      const actualCount = comments.length;
      
      if (post.comments_count !== actualCount) {
        await base44.asServiceRole.entities.CommunityPost.update(post.id, { comments_count: actualCount });
        console.log(`[backfillCommentCounts] Post ${post.id}: ${post.comments_count ?? 'null'} → ${actualCount}`);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`[backfillCommentCounts] Done — updated: ${updated}, skipped (already correct): ${skipped}`);
    return Response.json({ success: true, total: posts.length, updated, skipped });

  } catch (error) {
    console.error('[backfillCommentCounts] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});