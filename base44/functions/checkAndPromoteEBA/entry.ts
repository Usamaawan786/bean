import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { referral_code } = await req.json();

        if (!referral_code) {
            return Response.json({ error: 'Referral code required' }, { status: 400 });
        }

        // Get all signups
        const allSignups = await base44.asServiceRole.entities.WaitlistSignup.list();

        // Find the referrer
        const referrer = allSignups.find(s => s.referral_code === referral_code);
        if (!referrer) {
            return Response.json({ error: 'Referrer not found' }, { status: 404 });
        }

        // Count unique referrals (by email)
        const uniqueReferrals = allSignups.filter(s => s.referred_by === referral_code);
        const uniqueEmails = [...new Set(uniqueReferrals.map(r => r.email))];
        const uniqueCount = uniqueEmails.length;

        // Check if already EBA
        if (referrer.eba_status === 'EBA') {
            return Response.json({ 
                message: 'Already an EBA',
                unique_referrals: uniqueCount
            });
        }

        // Promote to EBA if 5+ unique referrals
        if (uniqueCount >= 5) {
            await base44.asServiceRole.entities.WaitlistSignup.update(referrer.id, {
                eba_status: 'EBA',
                eba_promoted_at: new Date().toISOString()
            });

            // Send EBA welcome email
            try {
                await base44.asServiceRole.functions.invoke('sendEBAEmail', {
                    full_name: referrer.full_name,
                    email: referrer.email,
                    referral_code: referrer.referral_code
                });
            } catch (emailError) {
                console.error('Failed to send EBA email:', emailError);
            }

            return Response.json({
                success: true,
                message: 'Promoted to EBA',
                referrer: referrer.full_name,
                unique_referrals: uniqueCount
            });
        }

        return Response.json({
            message: 'Not enough referrals yet',
            unique_referrals: uniqueCount,
            needed: 5 - uniqueCount
        });
    } catch (error) {
        console.error('EBA check error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});