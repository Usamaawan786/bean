import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function sendWhatsApp(apiKey, locationId, phone, message) {
  let p = phone.trim().replace(/[\s\-()]/g, '');
  if (p.startsWith('0092')) p = '+' + p.slice(2);
  else if (p.startsWith('92') && !p.startsWith('+')) p = '+' + p;
  else if (p.startsWith('0')) p = '+92' + p.slice(1);
  else if (!p.startsWith('+')) p = '+92' + p;
  // Validate: Pakistani numbers should be +923XXXXXXXXX (12 digits total)
  if (p.startsWith('+92') && p.length !== 13) throw new Error(`Invalid PK phone length: ${p}`);
  if (p.length < 10) throw new Error(`Phone too short: ${p}`);

  const searchRes = await fetch(
    `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&query=${encodeURIComponent(p)}`,
    { headers: { Authorization: `Bearer ${apiKey}`, Version: '2021-07-28' } }
  );
  const searchData = await searchRes.json();
  const contact = searchData?.contacts?.[0];
  if (!contact) throw new Error(`No GHL contact for ${p}`);

  const msgRes = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Version: '2021-07-28' },
    body: JSON.stringify({ type: 'WhatsApp', contactId: contact.id, message }),
  });
  if (!msgRes.ok) throw new Error(`GHL error: ${await msgRes.text()}`);
  return await msgRes.json();
}

/**
 * Manually triggered WhatsApp campaign runner (admin only).
 * Payload: { campaignId }
 * Sends to the audience defined on the campaign record. NO auto-trigger.
 */
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

    // Get all customers for filtering
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

    for (const u of targets) {
      const name = u.display_name || u.full_name || 'Coffee Lover';
      const personalised = campaign.message
        .replace(/\{\{name\}\}/g, name)
        .replace(/\{\{tier\}\}/g, customerMap[u.email]?.tier || 'Bronze')
        .replace(/\{\{points\}\}/g, customerMap[u.email]?.points_balance || 0);
      try {
        await sendWhatsApp(apiKey, locationId, u.phone, personalised);
        sent++;
      } catch (e) {
        console.error(`Failed ${u.email}:`, e.message);
        failed++;
      }
    }

    // Update campaign record
    await base44.asServiceRole.entities.WhatsAppCampaign.update(campaignId, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      total_recipients: targets.length,
      sent_count: sent,
      failed_count: failed,
    });

    return Response.json({ success: true, total: targets.length, sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});