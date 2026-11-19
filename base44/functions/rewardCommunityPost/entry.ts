import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const POINTS = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { postId } = await req.json().catch(() => ({}));

    // Only the author's own approved post can earn points (flagged/spam posts earn nothing)
    if (postId) {
      const post = await base44.asServiceRole.entities.CommunityPost
        .get(postId)
        .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!post || post.author_email !== user.email || post.moderation_status !== 'approved') {
        return Response.json({ awarded: false, reason: 'post_not_eligible' });
      }
    }

    const byEmail = await base44.entities.Customer.filter({ user_email: user.email }, { limit: 1 });
    let customer = byEmail?.items?.[0];
    if (!customer) {
      const byCreator = await base44.entities.Customer.filter({ created_by_id: user.id }, { limit: 1 });
      customer = byCreator?.items?.[0];
    }
    if (!customer) return Response.json({ awarded: false, reason: 'no_customer_record' });

    const now = Date.now();
    const last = customer.last_post_reward_at ? new Date(customer.last_post_reward_at).getTime() : 0;
    if (last && now - last < WINDOW_MS) {
      return Response.json({ awarded: false, next_eligible_at: new Date(last + WINDOW_MS).toISOString() });
    }

    const balance = (Number(customer.points_balance) || 0) + POINTS;
    await base44.entities.Customer.update(customer.id, {
      points_balance: balance,
      total_points_earned: (Number(customer.total_points_earned) || 0) + POINTS,
      last_post_reward_at: new Date(now).toISOString(),
    });

    await base44.entities.Activity.create({
      user_email: user.email,
      action_type: 'points_earned',
      description: 'Earned 5 points for sharing a community post',
      points_amount: POINTS,
      metadata: { source: 'community_post', post_id: postId || null },
    });

    return Response.json({ awarded: true, points: POINTS, balance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}