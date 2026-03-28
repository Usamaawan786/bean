import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        let totalCount = 0;
        const batchSize = 100;
        while (true) {
            const batch = await base44.asServiceRole.entities.WaitlistSignup.list('created_date', batchSize, totalCount);
            const batchArr = Array.isArray(batch) ? batch : [];
            totalCount += batchArr.length;
            if (batchArr.length < batchSize) break;
        }
        return Response.json({ count: totalCount });
    } catch (error) {
        console.error('Failed to get waitlist count:', error);
        return Response.json({ count: 0 });
    }
});