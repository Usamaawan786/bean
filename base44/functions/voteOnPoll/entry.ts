import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { postId, optionId } = await req.json();
    if (!postId || !optionId) return Response.json({ error: 'Missing postId or optionId' }, { status: 400 });

    // Fetch post as service role to bypass RLS
    const post = await base44.asServiceRole.entities.CommunityPost.get(postId);
    if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });

    const options = post.poll_options || [];
    const voterData = {
      email: user.email,
      name: user.display_name || user.full_name || user.email.split('@')[0],
      picture: user.profile_picture || null
    };

    const updatedOptions = options.map(o => {
      // Remove user's vote from all options first
      const filteredVoters = (o.voted_by || []).filter(v => v.email !== user.email);

      if (o.id === optionId) {
        // If the user already voted for this option, it's a toggle-off
        const alreadyVotedHere = (o.voted_by || []).some(v => v.email === user.email);
        if (alreadyVotedHere) {
          return { ...o, voted_by: filteredVoters };
        }
        return { ...o, voted_by: [...filteredVoters, voterData] };
      }
      return { ...o, voted_by: filteredVoters };
    });

    await base44.asServiceRole.entities.CommunityPost.update(postId, { poll_options: updatedOptions });

    return Response.json({ success: true, poll_options: updatedOptions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});