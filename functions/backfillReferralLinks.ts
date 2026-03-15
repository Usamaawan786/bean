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
        const BATCH_SIZE = 5;
        const DELAY_MS = 2000; // 2 second delay between batches

        // Process in batches
        for (let i = 0; i < signups.length; i += BATCH_SIZE) {
            const batch = signups.slice(i, i + BATCH_SIZE);
            
            // Process batch concurrently
            const promises = batch.map(async (signup) => {
                if (!signup.referral_link && signup.referral_code) {
                    const refLink = `https://bean.base44.app/waitlist?referred_by=${signup.referral_code}`;
                    
                    await base44.asServiceRole.entities.WaitlistSignup.update(signup.id, {
                        referral_link: refLink
                    });
                    
                    return 'updated';
                } else {
                    return 'skipped';
                }
            });

            const results = await Promise.all(promises);
            updated += results.filter(r => r === 'updated').length;
            skipped += results.filter(r => r === 'skipped').length;

            // Delay between batches (except for the last batch)
            if (i + BATCH_SIZE < signups.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
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