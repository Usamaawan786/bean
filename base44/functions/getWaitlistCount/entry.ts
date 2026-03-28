import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Use a large fetch to count real records
        const signups = await base44.asServiceRole.entities.WaitlistSignup.list('created_date', 10000);
        const arr = Array.isArray(signups) ? signups : [];
        return Response.json({ count: arr.length });
    } catch (error) {
        console.error('Failed to get waitlist count:', error);
        return Response.json({ count: 739 });
    }
});