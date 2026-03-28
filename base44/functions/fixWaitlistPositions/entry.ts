import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Fetch all records ordered by created_date to get correct sequence
        let allSignups = [];
        const batchSize = 100;
        while (true) {
            const batch = await base44.asServiceRole.entities.WaitlistSignup.list('created_date', batchSize, allSignups.length);
            const batchArr = Array.isArray(batch) ? batch : [];
            allSignups = allSignups.concat(batchArr);
            if (batchArr.length < batchSize) break;
        }

        console.log('Total signups:', allSignups.length);

        // Only fix records where position doesn't match sequential order
        // Process in small batches to avoid rate limits
        const toFix = [];
        for (let i = 0; i < allSignups.length; i++) {
            if (allSignups[i].position !== i + 1) {
                toFix.push({ id: allSignups[i].id, email: allSignups[i].email, wrong: allSignups[i].position, correct: i + 1 });
            }
        }

        console.log('Records to fix:', toFix.length);

        // Update only the bad ones
        for (const rec of toFix) {
            await base44.asServiceRole.entities.WaitlistSignup.update(rec.id, { position: rec.correct });
            console.log(`Fixed ${rec.email}: ${rec.wrong} -> ${rec.correct}`);
        }

        return Response.json({ success: true, total: allSignups.length, fixed: toFix.length, details: toFix });
    } catch (error) {
        console.error('Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});