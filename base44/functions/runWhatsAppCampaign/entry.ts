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

function formatPhone(phone) {
  let p = phone.trim().replace(/[\s\-()]/g, '');
  if (p.startsWith('0092')) p = '+' + p.slice(2);
  else if (p.startsWith('92') && !p.startsWith('+')) p = '+' + p;
  else if (p.startsWith('0')) p = '+92' + p.slice(1);
  else if (!p.startsWith('+')) p = '+92' + p;
  if (p.startsWith('+92') && p.length !== 13) throw new Error(`Invalid PK phone length: ${p} (${p.length} digits)`);
  if (p.length < 10) throw new Error(`Phone too short: ${p}`);
  return p;
}

async function findOrCreateContact(apiKey, locationId, phone, name) {
  const searchRes = await fetch(
    `${GHL_BASE}/contacts/?locationId=${locationId}&query=${encodeURIComponent(phone)}`,
    { headers: ghlHeaders(apiKey) }
  );
  const searchData = await searchRes.json();
  const existing = searchData?.contacts?.[0];
  if (existing) return existing.id;

  const createRes = await fetch(`${GHL_BASE}/contacts/`, {
    method: 'POST',
    headers: ghlHeaders(apiKey),
    body: JSON.stringify({
      locationId,
      phone,
      firstName: name.split(' ')[0] || name,
      lastName: name.split(' ').slice(1).join(' ') || '',
      tags: ['bean-loyalty-app'],
    }),
  });
  if (!createRes.ok) throw new Error(`Failed to create GHL contact: ${await createRes.text()}`);
  const created = await createRes.json();
  return created?.contact?.id || created?.id;
}

async function getOrCreateConversation(apiKey, locationId, contactId) {
  const searchRes = await fetch(
    `${GHL_BASE}/conversations/search?locationId=${locationId}&contactId=${contactId}`,
    { headers: ghlHeaders(apiKey) }
  );
  const searchData = await searchRes.json();
  const existing = searchData?.conversations?.[0];
  if (existing) return existing.id;

  const createRes = await fetch(`${GHL_BASE}/conversations/`, {
    method: 'POST',
    headers: ghlHeaders(apiKey),
    body: JSON.stringify({ locationId, contactId }),
  });
  if (!createRes.ok) throw new Error(`Failed to create conversation: ${await createRes.text()}`);
  const created = await createRes.json();
  return created?.conversation?.id || created?.id;
}

// Send using an approved WhatsApp template
async function sendTemplateMessage(apiKey, locationId, contactId, conversationId, templateName, variables) {
  // Build ordered variable array: {{1}} = name, {{2}} = points, {{3}} = tier
  const varOrder = ['name', 'points', 'tier'];
  const templateVars = varOrder
    .filter(v => variables[v] !== undefined)
    .map(v => ({ key: v, value: String(variables[v]) }));

  const msgRes = await fetch(`${GHL_BASE}/conversations/messages`, {
    method: 'POST',
    headers: ghlHeaders(apiKey),
    body: JSON.stringify({
      type: 'WhatsApp',
      conversationId,
      contactId,
      message: '',
      templateId: templateName,
      templateParams: templateVars.map(v => v.value),
    }),
  });
  const msgBody = await msgRes.text();
  if (!msgRes.ok) throw new Error(`GHL template send error (${msgRes.status}): ${msgBody}`);
  return JSON.parse(msgBody);
}

// Send free-form message (within 24h window)
async function sendFreeformMessage(apiKey, contactId, conversationId, message) {
  const msgRes = await fetch(`${GHL_BASE}/conversations/messages`, {
    method: 'POST',
    headers: ghlHeaders(apiKey),
    body: JSON.stringify({
      type: 'WhatsApp',
      conversationId,
      contactId,
      message,
    }),
  });
  const msgBody = await msgRes.text();
  if (!msgRes.ok) throw new Error(`GHL send error (${msgRes.status}): ${msgBody}`);
  return JSON.parse(msgBody);
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
    if (campaign.status === 'sent') return Response.json({ error: 'Campaign already sent' }, { status: 400 });

    // If template-based campaign, must be approved
    const useTemplate = campaign.template_status === 'approved' && campaign.ghl_template_name;
    if (campaign.ghl_template_name && campaign.template_status !== 'approved') {
      return Response.json({
        error: `Cannot send: template status is "${campaign.template_status}". Please wait for WhatsApp to approve the template.`
      }, { status: 400 });
    }

    const apiKey = Deno.env.get('GHL_API_KEY');
    const locationId = Deno.env.get('GHL_LOCATION_ID');

    const allUsers = await base44.asServiceRole.entities.User.list();
    const usersWithPhone = allUsers.filter(u => u.phone);

    const allCustomers = await base44.asServiceRole.entities.Customer.list();
    const customerMap = {};
    allCustomers.forEach(c => { customerMap[c.created_by] = c; });

    let targets = usersWithPhone;
    const { audience } = campaign;

    if (['Bronze', 'Silver', 'Gold', 'Platinum'].includes(audience)) {
      targets = usersWithPhone.filter(u => customerMap[u.email]?.tier === audience);
    } else if (audience === 'high_spenders') {
      targets = usersWithPhone.filter(u => (customerMap[u.email]?.total_spend_pkr || 0) >= 5000);
    } else if (audience === 'no_purchase_7d') {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentScans = await base44.asServiceRole.entities.StoreSale.list('-created_date', 500);
      const recentEmails = new Set(recentScans
        .filter(s => new Date(s.scanned_at || s.created_date) >= cutoff)
        .map(s => s.scanned_by).filter(Boolean));
      targets = usersWithPhone.filter(u => !recentEmails.has(u.email));
    }

    let sent = 0, failed = 0;
    const errors = [];

    for (const u of targets) {
      const name = u.display_name || u.full_name || 'Coffee Lover';
      const customer = customerMap[u.email];
      const variables = {
        name,
        points: customer?.points_balance || 0,
        tier: customer?.tier || 'Bronze',
      };

      try {
        const p = formatPhone(u.phone);
        const contactId = await findOrCreateContact(apiKey, locationId, p, name);
        const conversationId = await getOrCreateConversation(apiKey, locationId, contactId);

        if (useTemplate) {
          await sendTemplateMessage(apiKey, locationId, contactId, conversationId, campaign.ghl_template_name, variables);
        } else {
          const personalised = campaign.message
            .replace(/\{\{name\}\}/g, name)
            .replace(/\{\{tier\}\}/g, variables.tier)
            .replace(/\{\{points\}\}/g, variables.points);
          await sendFreeformMessage(apiKey, contactId, conversationId, personalised);
        }

        sent++;
        console.log(`✅ Sent to ${u.email} (${u.phone}) via ${useTemplate ? 'template' : 'freeform'}`);
      } catch (e) {
        console.error(`❌ Failed for ${u.email} (${u.phone}):`, e.message);
        errors.push({ email: u.email, phone: u.phone, error: e.message });
        failed++;
      }
    }

    await base44.asServiceRole.entities.WhatsAppCampaign.update(campaignId, {
      status: failed === targets.length && targets.length > 0 ? 'failed' : 'sent',
      sent_at: new Date().toISOString(),
      total_recipients: targets.length,
      sent_count: sent,
      failed_count: failed,
    });

    return Response.json({ success: true, total: targets.length, sent, failed, errors, mode: useTemplate ? 'template' : 'freeform' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});