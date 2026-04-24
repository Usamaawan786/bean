import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, emoji } = await req.json();
    if (!postId || !emoji) {
      return Response.json({ error: 'postId and emoji required' }, { status: 400 });
    }

    const posts = await base44.asServiceRole.entities.CommunityPost.filter({ id: postId });
    const post = posts[0];
    if (!post) {
      return Response.json({ error: 'Post not found' }, { status: 404 });
    }

    const currentReactions = post.reactions || {};
    const emojiReactions = currentReactions[emoji] || [];
    const hasReacted = emojiReactions.includes(user.email);

    const newEmojiReactions = hasReacted
      ? emojiReactions.filter(e => e !== user.email)
      : [...emojiReactions, user.email];

    await base44.asServiceRole.entities.CommunityPost.update(postId, {
      reactions: {
        ...currentReactions,
        [emoji]: newEmojiReactions,
      },
    });

    return Response.json({ reacted: !hasReacted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});