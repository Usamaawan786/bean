import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GHL_WEBHOOK = "https://services.leadconnectorhq.com/hooks/gj8OBCLmVBdkG2uJwiTN/webhook-trigger/c45acf73-92c1-4737-9d12-693169c853c5";

async function pushContactToGHL(contact) {
  const nameParts = (contact.name || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const locationId = Deno.env.get("GHL_LOCATION_ID") || '';
  const apiKey = Deno.env.get("GHL_API_KEY") || '';

  const contactPayload = {
    firstName,
    lastName,
    name: contact.name || `${firstName} ${lastName}`.trim(),
    email: contact.email || '',
    phone: contact.phone || '',
    locationId,
    source: "Bean App"
  };

  console.log('Pushing to GHL Contacts API:', JSON.stringify(contactPayload));

  // 1. Create/upsert contact via GHL Contacts API
  const contactsRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Version': '2021-07-28'
    },
    body: JSON.stringify(contactPayload)
  });

  const contactsText = await contactsRes.text();
  console.log('GHL Contacts API status:', contactsRes.status, 'body:', contactsText);

  // 2. Also fire the webhook for workflow enrollment
  const webhookRes = await fetch(GHL_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contactPayload)
  });

  const webhookText = await webhookRes.text();
  console.log('GHL Webhook status:', webhookRes.status, 'body:', webhookText);

  return {
    contacts_api: { status: contactsRes.status, response: contactsText },
    webhook: { status: webhookRes.status, response: webhookText }
  };
}

Deno.serve(async (req) => {
  try {
    // Read body FIRST before anything else consumes the stream
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      console.log('No JSON body or empty body');
    }

    const base44 = createClientFromRequest(req);

    // Handle bulk mode: push all users from database (admin only)
    if (body.bulk === true) {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const allUsers = await base44.asServiceRole.entities.User.list();
      console.log(`Bulk push: found ${allUsers.length} users`);

      let successCount = 0;
      let failCount = 0;

      for (const u of allUsers) {
        if (!u.email) continue;
        try {
          await pushContactToGHL({
            name: u.display_name || u.full_name || '',
            email: u.email,
            phone: u.phone || ''
          });
          successCount++;
        } catch (e) {
          console.error('Failed for user:', u.email, e.message);
          failCount++;
        }
        await new Promise(r => setTimeout(r, 300));
      }

      return Response.json({ success: true, pushed: successCount, failed: failCount });
    }

    // Single user mode
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const name = body.name || user.display_name || user.full_name || '';
    const email = body.email || user.email || '';
    const phone = body.phone || user.phone || '';

    if (!email) {
      return Response.json({ error: 'Missing email' }, { status: 400 });
    }

    const result = await pushContactToGHL({ name, email, phone });
    return Response.json({ success: true, ...result });

  } catch (error) {
    console.error('sendUserToGHL error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});