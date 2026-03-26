import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Parse webhook payload from GHL
        const payload = await req.json();
        
        console.log('GHL Webhook received:', payload);

        // GHL webhook structure varies by event type
        // Common fields: type, email, messageId, timestamp
        const { type, email, messageId, timestamp } = payload;

        if (!email) {
            return Response.json({ message: 'No email in payload' }, { status: 200 });
        }

        // Find the email log by recipient email
        const logs = await base44.asServiceRole.entities.EmailLog.filter({ 
            recipient_email: email 
        });

        if (logs.length === 0) {
            return Response.json({ message: 'Email log not found' }, { status: 200 });
        }

        // Update the most recent log for this email
        const log = logs[logs.length - 1];

        // Handle different webhook event types
        switch (type) {
            case 'delivered':
                await base44.asServiceRole.entities.EmailLog.update(log.id, {
                    status: 'delivered'
                });
                break;

            case 'opened':
                await base44.asServiceRole.entities.EmailLog.update(log.id, {
                    status: 'opened',
                    opened_at: timestamp || new Date().toISOString()
                });
                
                // Update campaign opened_count
                if (log.campaign_id) {
                    const campaigns = await base44.asServiceRole.entities.EmailCampaign.filter({ 
                        id: log.campaign_id 
                    });
                    if (campaigns.length > 0) {
                        const campaign = campaigns[0];
                        await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, {
                            opened_count: (campaign.opened_count || 0) + 1
                        });
                    }
                }
                break;

            case 'clicked':
                await base44.asServiceRole.entities.EmailLog.update(log.id, {
                    status: 'clicked',
                    clicked_at: timestamp || new Date().toISOString()
                });
                
                // Update campaign clicked_count
                if (log.campaign_id) {
                    const campaigns = await base44.asServiceRole.entities.EmailCampaign.filter({ 
                        id: log.campaign_id 
                    });
                    if (campaigns.length > 0) {
                        const campaign = campaigns[0];
                        await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, {
                            clicked_count: (campaign.clicked_count || 0) + 1
                        });
                    }
                }
                break;

            case 'bounced':
                await base44.asServiceRole.entities.EmailLog.update(log.id, {
                    status: 'bounced',
                    error_message: payload.reason || 'Email bounced'
                });
                
                // Update campaign bounced_count
                if (log.campaign_id) {
                    const campaigns = await base44.asServiceRole.entities.EmailCampaign.filter({ 
                        id: log.campaign_id 
                    });
                    if (campaigns.length > 0) {
                        const campaign = campaigns[0];
                        await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, {
                            bounced_count: (campaign.bounced_count || 0) + 1
                        });
                    }
                }
                break;

            case 'complained':
            case 'spam':
                await base44.asServiceRole.entities.EmailLog.update(log.id, {
                    status: 'bounced',
                    error_message: 'Marked as spam'
                });
                break;

            default:
                console.log('Unknown webhook type:', type);
        }

        return Response.json({ message: 'Webhook processed' }, { status: 200 });
    } catch (error) {
        console.error('GHL webhook error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});