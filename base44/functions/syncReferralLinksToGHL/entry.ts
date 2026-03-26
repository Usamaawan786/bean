import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
        const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

        if (!GHL_API_KEY || !GHL_LOCATION_ID) {
            return Response.json({ error: 'GHL credentials not configured' }, { status: 500 });
        }

        // Get all waitlist signups with referral codes
        const signups = await base44.asServiceRole.entities.WaitlistSignup.list();
        
        let updated = 0;
        let failed = 0;
        let notFound = 0;
        const errors = [];
        const BATCH_SIZE = 5;
        const DELAY_MS = 1000;

        // Process in batches
        for (let i = 0; i < signups.length; i += BATCH_SIZE) {
            const batch = signups.slice(i, i + BATCH_SIZE);
            
            const promises = batch.map(async (signup) => {
                try {
                    if (!signup.referral_code || !signup.email) {
                        return { status: 'skipped', email: signup.email };
                    }

                    const referralLink = `https://bean.base44.app/waitlist?referred_by=${signup.referral_code}`;

                    // Search for contact by email in GHL
                    const searchResponse = await fetch(
                        `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(signup.email)}`,
                        {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${GHL_API_KEY}`,
                                'Version': '2021-07-28',
                                'Accept': 'application/json'
                            }
                        }
                    );

                    if (!searchResponse.ok) {
                        throw new Error(`Search failed: ${searchResponse.status}`);
                    }

                    const searchData = await searchResponse.json();
                    
                    if (!searchData.contacts || searchData.contacts.length === 0) {
                        return { status: 'not_found', email: signup.email };
                    }

                    const contact = searchData.contacts[0];

                    // Update contact with referral link in custom field
                    const updateResponse = await fetch(
                        `https://services.leadconnectorhq.com/contacts/${contact.id}`,
                        {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${GHL_API_KEY}`,
                                'Version': '2021-07-28',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                customFields: [
                                    {
                                        key: 'referral_link',
                                        field_value: referralLink
                                    }
                                ]
                            })
                        }
                    );

                    if (!updateResponse.ok) {
                        const errorText = await updateResponse.text();
                        throw new Error(`Update failed: ${updateResponse.status} - ${errorText}`);
                    }

                    return { status: 'updated', email: signup.email };
                } catch (error) {
                    return { status: 'failed', email: signup.email, error: error.message };
                }
            });

            const results = await Promise.all(promises);
            
            results.forEach(result => {
                if (result.status === 'updated') {
                    updated++;
                } else if (result.status === 'not_found') {
                    notFound++;
                } else if (result.status === 'failed') {
                    failed++;
                    errors.push({ email: result.email, error: result.error });
                }
            });

            // Delay between batches
            if (i + BATCH_SIZE < signups.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        return Response.json({
            success: true,
            total: signups.length,
            updated,
            notFound,
            failed,
            errors: errors.slice(0, 10), // Return first 10 errors only
            message: `Synced ${updated} referral links to GHL, ${notFound} contacts not found, ${failed} failed`
        });
    } catch (error) {
        console.error('Sync error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});