import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const posts = await base44.asServiceRole.entities.CommunityPost.list("-created_date", 200);
    const beanPosts = posts.filter(p => p.author_email === "usamaameer309@gmail.com");
    let updated = 0;
    for (const post of beanPosts) {
      if (post.author_name !== "Bean") {
        await base44.asServiceRole.entities.CommunityPost.update(post.id, { author_name: "Bean" });
        updated++;
      }
    }

    return Response.json({ success: true, updated, total: beanPosts.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});