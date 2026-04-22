import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all community posts
    const allPosts = await base44.asServiceRole.entities.CommunityPost.list('-created_date', 1000);
    
    if (allPosts.length === 0) {
      return Response.json({ success: true, updated: 0, message: 'No posts found' });
    }

    let updated = 0;
    const results = [];
    const karachiTz = 'Asia/Karachi';

    for (const post of allPosts) {
      if (!post.created_date) continue;

      try {
        // Parse the UTC timestamp
        const utcDate = new Date(post.created_date);
        
        // Convert to Pakistan local time (offset: +5:00)
        const karachiDate = new Date(utcDate.toLocaleString('en-US', { timeZone: karachiTz }));
        
        // Calculate the actual offset difference
        const utcTime = utcDate.getTime();
        const karachiTime = karachiDate.getTime();
        const offset = karachiTime - utcTime;
        
        // Create corrected timestamp in ISO format
        const correctedDate = new Date(utcTime + offset);
        const correctedISO = correctedDate.toISOString();
        
        // Update post with corrected created_date
        await base44.asServiceRole.entities.CommunityPost.update(post.id, {
          created_date: correctedISO
        });
        
        updated++;
        results.push({
          id: post.id,
          author: post.author_name,
          original: post.created_date,
          corrected: correctedISO,
          status: 'updated'
        });
      } catch (err) {
        console.error(`Error fixing post ${post.id}:`, err.message);
        results.push({
          id: post.id,
          author: post.author_name,
          status: 'error',
          error: err.message
        });
      }
    }

    console.log(`[fixCommunityPostTimestamps] Updated ${updated}/${allPosts.length} posts to Asia/Karachi timezone`);
    return Response.json({ success: true, updated, total: allPosts.length, results });

  } catch (error) {
    console.error('[fixCommunityPostTimestamps] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});