import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { campaign_id } = await req.json();

        if (!campaign_id) {
            return Response.json({ error: 'Campaign ID is required' }, { status: 400 });
        }

        const GHL_API_KEY = Deno.env.get('GHL_API_KEY');
        const GHL_LOCATION_ID = Deno.env.get('GHL_LOCATION_ID');

        if (!GHL_API_KEY || !GHL_LOCATION_ID) {
            return Response.json({ error: 'GHL credentials not configured' }, { status: 500 });
        }

        // Get campaign details
        const campaigns = await base44.asServiceRole.entities.EmailCampaign.filter({ id: campaign_id });
        if (campaigns.length === 0) {
            return Response.json({ error: 'Campaign not found' }, { status: 404 });
        }

        const campaign = campaigns[0];

        // Get recipients based on recipient_type
        let recipients = [];
        
        if (campaign.recipient_type === 'all_users') {
            recipients = await base44.asServiceRole.entities.User.list();
        } else if (campaign.recipient_type === 'waitlist') {
            recipients = await base44.asServiceRole.entities.WaitlistSignup.list();
        } else if (campaign.recipient_type === 'customers') {
            recipients = await base44.asServiceRole.entities.Customer.list();
        } else if (campaign.recipient_type === 'custom') {
            recipients = (campaign.custom_recipients || []).map(email => ({ email }));
        }

        // Update campaign with total recipients
        await base44.asServiceRole.entities.EmailCampaign.update(campaign_id, {
            total_recipients: recipients.length,
            status: 'sending'
        });

        let sent_count = 0;
        let delivered_count = 0;
        let failed_count = 0;

        // Send emails via GoHighLevel
        for (const recipient of recipients) {
            const recipientEmail = recipient.email;
            const recipientName = recipient.full_name || recipient.name || '';

            try {
                // Send email via GHL API
                const ghlResponse = await fetch(`https://services.leadconnectorhq.com/emails/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GHL_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Version': '2021-07-28'
                    },
                    body: JSON.stringify({
                        locationId: GHL_LOCATION_ID,
                        to: [recipientEmail],
                        subject: campaign.subject,
                        html: campaign.body,
                        from: campaign.from_name || 'BEAN Coffee',
                        replyTo: recipientEmail
                    })
                });

                const ghlData = await ghlResponse.json();

                if (ghlResponse.ok) {
                    // Log successful email
                    await base44.asServiceRole.entities.EmailLog.create({
                        campaign_id: campaign_id,
                        campaign_name: campaign.name,
                        recipient_email: recipientEmail,
                        recipient_name: recipientName,
                        subject: campaign.subject,
                        body: campaign.body,
                        from_name: campaign.from_name,
                        status: 'sent',
                        sent_at: new Date().toISOString()
                    });

                    sent_count++;
                    delivered_count++;
                } else {
                    throw new Error(ghlData.message || 'GHL API error');
                }
            } catch (error) {
                // Log failed email
                await base44.asServiceRole.entities.EmailLog.create({
                    campaign_id: campaign_id,
                    campaign_name: campaign.name,
                    recipient_email: recipientEmail,
                    recipient_name: recipientName,
                    subject: campaign.subject,
                    body: campaign.body,
                    from_name: campaign.from_name,
                    status: 'failed',
                    sent_at: new Date().toISOString(),
                    error_message: error.message
                });

                sent_count++;
                failed_count++;
            }
        }

        // Update campaign with final stats
        await base44.asServiceRole.entities.EmailCampaign.update(campaign_id, {
            status: 'sent',
            sent_count: sent_count,
            delivered_count: delivered_count
        });

        return Response.json({
            success: true,
            sent: sent_count,
            delivered: delivered_count,
            failed: failed_count,
            provider: 'GoHighLevel'
        });
    } catch (error) {
        console.error('GHL campaign send error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});