import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

function ghlHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Version: GHL_VERSION,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { campaignId } = await req.json();
    if (!campaignId) return Response.json({ error: 'campaignId required' }, { status: 400 });

    const allCampaigns = await base44.asServiceRole.entities.WhatsAppCampaign.list('-created_date', 200);
    const campaign = allCampaigns.find(c => c.id === campaignId);
    if (!campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 });
    if (!campaign.ghl_template_name) return Response.json({ error: 'No template submitted yet' }, { status: 400 });

    const apiKey = Deno.env.get('GHL_API_KEY');
    const locationId = Deno.env.get('GHL_LOCATION_ID');

    // Fetch templates list and find ours by name
    const res = await fetch(`${GHL_BASE}/locations/${locationId}/templates?limit=100`, {
      headers: ghlHeaders(apiKey),
    });

    const body = await res.text();
    console.log('GHL templates list response:', res.status, body);

    if (!res.ok) {
      return Response.json({ error: `GHL error (${res.status}): ${body}` }, { status: 500 });
    }

    const data = JSON.parse(body);
    const templates = data?.templates || data?.data || [];
    const found = templates.find(t => t.name === campaign.ghl_template_name);

    if (!found) {
      return Response.json({ status: 'pending_approval', message: 'Template not yet visible in GHL — still processing.' });
    }

    // GHL/WhatsApp statuses: APPROVED, REJECTED, PENDING, IN_APPEAL
    const rawStatus = (found.status || '').toUpperCase();
    let newStatus = 'pending_approval';
    if (rawStatus === 'APPROVED') newStatus = 'approved';
    else if (rawStatus === 'REJECTED') newStatus = 'rejected';

    const updateData = { template_status: newStatus };
    if (found.rejected_reason || found.rejection_reason) {
      updateData.template_rejection_reason = found.rejected_reason || found.rejection_reason;
    }
    if (found.id) updateData.ghl_template_id = found.id;

    await base44.asServiceRole.entities.WhatsAppCampaign.update(campaignId, updateData);

    return Response.json({
      success: true,
      status: newStatus,
      rawStatus,
      templateId: found.id,
      rejectionReason: found.rejected_reason || found.rejection_reason || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});