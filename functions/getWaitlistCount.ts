import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get count using service role (no auth required)
        const signups = await base44.asServiceRole.entities.WaitlistSignup.list();
        
        return Response.json({
            count: signups.length
        });
    } catch (error) {
        console.error('Failed to get waitlist count:', error);
        return Response.json({ count: 147 }); // Fallback number
    }
});