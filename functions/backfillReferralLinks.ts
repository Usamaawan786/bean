import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get all waitlist signups
        const signups = await base44.asServiceRole.entities.WaitlistSignup.list();
        
        let updated = 0;
        let skipped = 0;

        for (const signup of signups) {
            // Only update if referral_link is missing
            if (!signup.referral_link && signup.referral_code) {
                const refLink = `https://bean.base44.app/waitlist?referred_by=${signup.referral_code}`;
                
                await base44.asServiceRole.entities.WaitlistSignup.update(signup.id, {
                    referral_link: refLink
                });
                
                updated++;
            } else {
                skipped++;
            }
        }

        return Response.json({
            success: true,
            total: signups.length,
            updated,
            skipped,
            message: `Backfilled ${updated} referral links, skipped ${skipped} already complete`
        });
    } catch (error) {
        console.error('Backfill error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});