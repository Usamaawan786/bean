import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Manual WhatsApp sender (admin only).
 * Payload: { phone, message }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { phone, message } = await req.json();
    if (!phone || !message) {
      return Response.json({ error: 'phone and message required' }, { status: 400 });
    }

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
    if (!contact) return Response.json({ error: `No GHL contact for ${normalizedPhone}` }, { status: 404 });

    const msgRes = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Version: '2021-07-28' },
      body: JSON.stringify({ type: 'WhatsApp', contactId: contact.id, message }),
    });

    if (!msgRes.ok) throw new Error(`GHL send failed: ${await msgRes.text()}`);
    return Response.json({ success: true, result: await msgRes.json() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});