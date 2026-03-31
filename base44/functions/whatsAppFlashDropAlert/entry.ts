import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function sendWhatsApp(phone, message) {
  const apiKey = Deno.env.get('GHL_API_KEY');
  const locationId = Deno.env.get('GHL_LOCATION_ID');

  let normalizedPhone = phone.trim().replace(/\s|-/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '+92' + normalizedPhone.slice(1);
  } else if (!normalizedPhone.startsWith('+')) {
    normalizedPhone = '+' + normalizedPhone;
  }

  const searchRes = await fetch(
    `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&query=${encodeURIComponent(normalizedPhone)}`,
    { headers: { Authorization: `Bearer ${apiKey}`, Version: '2021-07-28' } }
  );
  const searchData = await searchRes.json();
  const contact = searchData?.contacts?.[0];
  if (!contact) throw new Error(`No GHL contact for ${normalizedPhone}`);

  const msgRes = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Version: '2021-07-28' },
    body: JSON.stringify({ type: 'WhatsApp', contactId: contact.id, message }),
  });

  if (!msgRes.ok) throw new Error(`GHL send failed: ${await msgRes.text()}`);
  return await msgRes.json();
}

/**
 * Triggered by entity automation when FlashDrop status → "active".
 * Notifies all customers with a phone number.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const drop = body?.data;

    if (!drop || drop.status !== 'active') {
      return Response.json({ skipped: true, reason: 'Drop not active' });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const usersWithPhone = users.filter(u => u.phone);

    const tierEmoji = { Platinum: '💎', Gold: '🥇', Silver: '🥈', Bronze: '☕' };
    let sent = 0, failed = 0;

    for (const user of usersWithPhone) {
      const customers = await base44.asServiceRole.entities.Customer.filter({ created_by: user.email });
      const tier = customers[0]?.tier || 'Bronze';
      const emoji = tierEmoji[tier] || '☕';
      const locationText = drop.location_name || drop.location || 'our location';

      const message =
        `${emoji} *Flash Drop Alert — Bean!*\n\n` +
        `Hi ${user.display_name || user.full_name || 'Coffee Lover'}! ☕\n\n` +
        `*${drop.title}* is LIVE right now at ${locationText}!\n\n` +
        `🎁 ${drop.description || 'Limited items available'}\n` +
        `⚡ ${drop.items_remaining || drop.total_items} left — first come, first served!\n\n` +
        `Open the Bean app to claim yours before it's gone! 🏃`;

      try {
        await sendWhatsApp(user.phone, message);
        sent++;
      } catch (e) {
        console.error(`Failed ${user.email}:`, e.message);
        failed++;
      }
    }

    return Response.json({ success: true, sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});