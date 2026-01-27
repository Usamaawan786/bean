import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { redemptionId } = await req.json();

    if (!redemptionId) {
      return Response.json({ error: 'redemptionId is required' }, { status: 400 });
    }

    // Get redemption details
    const redemption = await base44.asServiceRole.entities.Redemption.get(redemptionId);
    
    if (!redemption) {
      return Response.json({ error: 'Redemption not found' }, { status: 404 });
    }

    const emailBody = `
Congratulations! 🎉

You've successfully redeemed: ${redemption.reward_name}

Your Redemption Code:
━━━━━━━━━━━━━━━━━
   ${redemption.redemption_code}
━━━━━━━━━━━━━━━━━

How to Use:
1. Visit any Bean location
2. Show this code to the barista
3. Enjoy your reward!

Points Used: ${redemption.points_spent}
Status: ${redemption.status}

This code is valid until redeemed. Don't forget to use it!

— The Bean Team
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: "Bean Rewards",
      to: redemption.customer_email,
      subject: `Your Reward Code: ${redemption.reward_name}`,
      body: emailBody
    });

    return Response.json({ 
      success: true,
      redemptionCode: redemption.redemption_code
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});