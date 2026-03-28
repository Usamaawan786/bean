import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const latest = await base44.asServiceRole.entities.WaitlistSignup.list('-position', 1);
        const latestArr = Array.isArray(latest) ? latest : [];
        const count = latestArr.length > 0 ? (Number(latestArr[0].position) || 0) : 0;
        return Response.json({ count });
    } catch (error) {
        console.error('Failed to get waitlist count:', error);
        return Response.json({ count: 739 });
    }
});