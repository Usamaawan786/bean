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

    const posts = await base44.asServiceRole.entities.CommunityPost.filter({ id: postId });
    const post = posts[0];
    if (!post) {
      return Response.json({ error: 'Post not found' }, { status: 404 });
    }

    const reportedBy = post.reported_by || [];
    const hasReported = reportedBy.includes(user.email);
    const newReportedBy = hasReported
      ? reportedBy.filter(e => e !== user.email)
      : [...reportedBy, user.email];

    const shouldFlag = newReportedBy.length >= 3;
    const newStatus = shouldFlag
      ? "flagged"
      : (newReportedBy.length === 0 ? "approved" : post.moderation_status);

    await base44.asServiceRole.entities.CommunityPost.update(postId, {
      reported_by: newReportedBy,
      moderation_status: newStatus,
    });

    return Response.json({ reported: !hasReported });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});