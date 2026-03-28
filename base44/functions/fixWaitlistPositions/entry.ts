import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const signups = await base44.asServiceRole.entities.WaitlistSignup.filter({}, 'created_date', 10000);
        
        if (!signups || signups.length === 0) {
            return Response.json({ success: true, total: 0, fixed: 0 });
        }

        console.log('Total signups:', signups.length);
        console.log('First item:', JSON.stringify(signups[0]));

        let fixed = 0;
        for (let i = 0; i < signups.length; i++) {
            const signup = signups[i];
            const correctPosition = i + 1;
            if (signup.position !== correctPosition) {
                await base44.asServiceRole.entities.WaitlistSignup.update(signup.id, {
                    position: correctPosition
                });
                fixed++;
            }
        }

        return Response.json({ success: true, total: signups.length, fixed });
    } catch (error) {
        console.error('Error:', error.message, error.stack);
        return Response.json({ error: error.message }, { status: 500 });
    }
});