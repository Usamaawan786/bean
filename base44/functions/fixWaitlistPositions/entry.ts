import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const signups = await base44.asServiceRole.entities.WaitlistSignup.list('created_date', 10000);
        const allSignups = Array.isArray(signups) ? signups : [];

        console.log('Total signups fetched:', allSignups.length);
        if (allSignups.length === 0) {
            return Response.json({ success: false, message: 'No signups returned' });
        }

        let fixed = 0;
        for (let i = 0; i < allSignups.length; i++) {
            const signup = allSignups[i];
            const correctPosition = i + 1;
            if (signup.position !== correctPosition) {
                await base44.asServiceRole.entities.WaitlistSignup.update(signup.id, {
                    position: correctPosition
                });
                fixed++;
            }
        }

        return Response.json({ success: true, total: allSignups.length, fixed });
    } catch (error) {
        console.error('Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});