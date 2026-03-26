import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { targetEmail, action } = await req.json();
        if (!targetEmail || !action) return Response.json({ error: 'Missing params' }, { status: 400 });
        if (targetEmail === user.email) return Response.json({ error: 'Cannot follow yourself' }, { status: 400 });

        // Get current user data
        const currentFollowing = user.following || [];

        if (action === 'follow') {
            if (currentFollowing.includes(targetEmail)) {
                return Response.json({ success: true, action: 'already_following' });
            }
            // Update current user's following list
            await base44.auth.updateMe({ following: [...currentFollowing, targetEmail] });

            // Update target user's followers list
            const targetUsers = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
            if (targetUsers.length > 0) {
                const targetUser = targetUsers[0];
                const targetFollowers = targetUser.followers || [];
                if (!targetFollowers.includes(user.email)) {
                    await base44.asServiceRole.entities.User.update(targetUser.id, {
                        followers: [...targetFollowers, user.email]
                    });
                }
            }

            // Create notification
            await base44.asServiceRole.entities.Notification.create({
                to_email: targetEmail,
                from_email: user.email,
                from_name: user.full_name || user.email.split('@')[0],
                from_picture: user.profile_picture || null,
                type: 'follow',
                message: `${user.full_name || user.email.split('@')[0]} started following you`,
                is_read: false
            });

            return Response.json({ success: true, action: 'followed' });
        } else if (action === 'unfollow') {
            await base44.auth.updateMe({ following: currentFollowing.filter(e => e !== targetEmail) });

            const targetUsers = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
            if (targetUsers.length > 0) {
                const targetUser = targetUsers[0];
                const targetFollowers = targetUser.followers || [];
                await base44.asServiceRole.entities.User.update(targetUser.id, {
                    followers: targetFollowers.filter(e => e !== user.email)
                });
            }

            return Response.json({ success: true, action: 'unfollowed' });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('followUser error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});