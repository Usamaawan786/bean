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
  // 1. Search by phone
  const searchRes = await fetch(
    `${GHL_BASE}/contacts/?locationId=${locationId}&query=${encodeURIComponent(phone)}`,
    { headers: ghlHeaders(apiKey) }
  );
  const searchData = await searchRes.json();
  const existing = searchData?.contacts?.[0];
  if (existing) return existing.id;

  // 2. Create contact if not found
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
  // Search for existing conversation
  const searchRes = await fetch(
    `${GHL_BASE}/conversations/search?locationId=${locationId}&contactId=${contactId}`,
    { headers: ghlHeaders(apiKey) }
  );
  const searchData = await searchRes.json();
  const existing = searchData?.conversations?.[0];
  if (existing) return existing.id;

  // Create new conversation
  const createRes = await fetch(`${GHL_BASE}/conversations/`, {
    method: 'POST',
    headers: ghlHeaders(apiKey),
    body: JSON.stringify({ locationId, contactId }),
  });
  if (!createRes.ok) throw new Error(`Failed to create conversation: ${await createRes.text()}`);
  const created = await createRes.json();
  return created?.conversation?.id || created?.id;
}

async function sendWhatsApp(apiKey, locationId, phone, message, name) {
  const p = formatPhone(phone);
  const contactId = await findOrCreateContact(apiKey, locationId, p, name);
  if (!contactId) throw new Error(`Could not find or create GHL contact for ${p}`);

  const conversationId = await getOrCreateConversation(apiKey, locationId, contactId);
  if (!conversationId) throw new Error(`Could not get/create conversation for contact ${contactId}`);

  // Send WhatsApp message via conversation
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
  console.log(`✅ Sent WhatsApp to ${p} (contact: ${contactId}, conv: ${conversationId})`);
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

    // Fetch campaign
    const allCampaigns = await base44.asServiceRole.entities.WhatsAppCampaign.list('-created_date', 200);
    const campaign = allCampaigns.find(c => c.id === campaignId);
    if (!campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 });
    if (campaign.status === 'sent') return Response.json({ error: 'Campaign already sent' }, { status: 400 });

    const apiKey = Deno.env.get('GHL_API_KEY');
    const locationId = Deno.env.get('GHL_LOCATION_ID');

    // Get all users with phones
    const allUsers = await base44.asServiceRole.entities.User.list();
    const usersWithPhone = allUsers.filter(u => u.phone);

    // Get all customers for filtering + personalisation
    const allCustomers = await base44.asServiceRole.entities.Customer.list();
    const customerMap = {};
    allCustomers.forEach(c => { customerMap[c.created_by] = c; });

    // Filter by audience
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
      const personalised = campaign.message
        .replace(/\{\{name\}\}/g, name)
        .replace(/\{\{tier\}\}/g, customerMap[u.email]?.tier || 'Bronze')
        .replace(/\{\{points\}\}/g, customerMap[u.email]?.points_balance || 0);
      try {
        await sendWhatsApp(apiKey, locationId, u.phone, personalised, name);
        sent++;
      } catch (e) {
        console.error(`❌ Failed for ${u.email} (${u.phone}):`, e.message);
        errors.push({ email: u.email, phone: u.phone, error: e.message });
        failed++;
      }
    }

    // Update campaign record
    await base44.asServiceRole.entities.WhatsAppCampaign.update(campaignId, {
      status: failed === targets.length && targets.length > 0 ? 'failed' : 'sent',
      sent_at: new Date().toISOString(),
      total_recipients: targets.length,
      sent_count: sent,
      failed_count: failed,
    });

    return Response.json({ success: true, total: targets.length, sent, failed, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});