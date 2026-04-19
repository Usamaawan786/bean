import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GHL_WEBHOOK = "https://services.leadconnectorhq.com/hooks/gj8OBCLmVBdkG2uJwiTN/webhook-trigger/c45acf73-92c1-4737-9d12-693169c853c5";

async function pushContactToGHL(contact) {
  const nameParts = (contact.name || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const payload = {
    "First name": firstName,
    "Last name": lastName,
    "Email": contact.email || '',
    "Phone number": contact.phone || ''
  };

  console.log('Pushing to GHL:', JSON.stringify(payload));

  const response = await fetch(GHL_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  console.log('GHL response status:', response.status, 'body:', responseText);
  return { status: response.status, response: responseText };
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
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      }

      return Response.json({ success: true, pushed: successCount, failed: failCount });
    }

    // Single user mode
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use body data if provided, fallback to user object fields
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