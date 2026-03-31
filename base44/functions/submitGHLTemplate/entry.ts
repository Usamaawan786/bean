import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

    const { templateBody, varMap } = convertToTemplateFormat(campaign.message);
    const templateName = toTemplateName(campaign.name);

    // Save template info to campaign — user will create it manually in GHL
    await base44.asServiceRole.entities.WhatsAppCampaign.update(campaignId, {
      ghl_template_name: templateName,
      template_status: 'pending_approval',
      template_submitted_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      templateName,
      templateBody,
      varMap,
      instructions: `GHL does not support template creation via API. Please:\n1. Go to GHL → Settings → WhatsApp → Templates\n2. Create a new template named: "${templateName}"\n3. Paste the template body below\n4. Submit for WhatsApp approval\n5. Once approved in GHL, click "Mark as Approved" in the app`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});