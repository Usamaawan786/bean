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

// Convert our message variables to WhatsApp template numbered variables
// {{name}} → {{1}}, {{points}} → {{2}}, {{tier}} → {{3}}
function convertToTemplateFormat(message) {
  let templateBody = message;
  const varMap = {};
  let idx = 1;

  const vars = ['name', 'points', 'tier'];
  for (const v of vars) {
    if (message.includes(`{{${v}}}`)) {
      varMap[v] = idx;
      templateBody = templateBody.replaceAll(`{{${v}}}`, `{{${idx}}}`);
      idx++;
    }
  }
  return { templateBody, varMap };
}

// Slugify campaign name for GHL template name
function toTemplateName(name) {
  return 'bean_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 50) + '_' + Date.now();
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

    const apiKey = Deno.env.get('GHL_API_KEY');
    const locationId = Deno.env.get('GHL_LOCATION_ID');

    const { templateBody, varMap } = convertToTemplateFormat(campaign.message);
    const templateName = toTemplateName(campaign.name);

    // Build body component with example values
    const bodyComponent = {
      type: 'BODY',
      text: templateBody,
    };

    // Add example values if there are variables
    if (Object.keys(varMap).length > 0) {
      const exampleValues = [];
      if (varMap.name) exampleValues[varMap.name - 1] = 'Ayesha';
      if (varMap.points) exampleValues[varMap.points - 1] = '250';
      if (varMap.tier) exampleValues[varMap.tier - 1] = 'Gold';
      bodyComponent.example = { body_text: [exampleValues] };
    }

    const templatePayload = {
      name: templateName,
      language: 'en',
      category: 'MARKETING',
      components: [bodyComponent],
    };

    const res = await fetch(`${GHL_BASE}/locations/${locationId}/templates`, {
      method: 'POST',
      headers: ghlHeaders(apiKey),
      body: JSON.stringify(templatePayload),
    });

    const body = await res.text();
    console.log('GHL template create response:', res.status, body);

    if (!res.ok) {
      return Response.json({ error: `GHL error (${res.status}): ${body}` }, { status: 500 });
    }

    const data = JSON.parse(body);
    const ghlTemplateId = data?.id || data?.template?.id || templateName;

    // Update campaign with template info
    await base44.asServiceRole.entities.WhatsAppCampaign.update(campaignId, {
      ghl_template_id: ghlTemplateId,
      ghl_template_name: templateName,
      template_status: 'pending_approval',
      template_submitted_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      templateName,
      ghlTemplateId,
      varMap,
      message: 'Template submitted for WhatsApp approval. This typically takes a few minutes to a few hours.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});