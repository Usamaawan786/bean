import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { full_name, email, referred_by } = await req.json();

        // Validate input
        if (!full_name || !email) {
            return Response.json({ error: 'Name and email are required' }, { status: 400 });
        }

        // Generate unique referral code
        const refCode = full_name.split(" ")[0].toUpperCase() + 
            Math.random().toString(36).substring(2, 6).toUpperCase();

        // Get current position using service role
        const signups = await base44.asServiceRole.entities.WaitlistSignup.list();
        const newPosition = signups.length + 1;

        // Create signup using service role (bypasses auth)
        await base44.asServiceRole.entities.WaitlistSignup.create({
            full_name,
            email,
            referral_code: refCode,
            referred_by: referred_by || null,
            position: newPosition
        });

        return Response.json({
            success: true,
            position: newPosition,
            referralCode: refCode
        });
    } catch (error) {
        console.error('Waitlist signup error:', error);
        return Response.json({ error: 'Failed to join waitlist' }, { status: 500 });
    }
});