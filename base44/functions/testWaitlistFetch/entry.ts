import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const r50 = await base44.asServiceRole.entities.WaitlistSignup.list('created_date', 50);
        const r100 = await base44.asServiceRole.entities.WaitlistSignup.list('created_date', 100);
        const r20 = await base44.asServiceRole.entities.WaitlistSignup.list('created_date', 20);
        
        return Response.json({ 
            limit50: Array.isArray(r50) ? r50.length : 'not array / string len: ' + String(r50).length,
            limit100: Array.isArray(r100) ? r100.length : 'not array / string len: ' + String(r100).length,
            limit20: Array.isArray(r20) ? r20.length : 'not array / string len: ' + String(r20).length,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});