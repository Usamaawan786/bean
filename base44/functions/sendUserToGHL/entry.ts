import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, phone } = await req.json();

    if (!name || !email || !phone) {
      return Response.json({ error: 'Missing name, email, or phone' }, { status: 400 });
    }

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    const GHL_WEBHOOK = "https://services.leadconnectorhq.com/hooks/gj8OBCLmVBdkG2uJwiTN/webhook-trigger/c45acf73-92c1-4737-9d12-693169c853c5";

    const response = await fetch(GHL_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "First name": firstName,
        "Last name": lastName,
        "Email": email,
        "Phone number": phone
      })
    });

    const responseText = await response.text();
    console.log('GHL response status:', response.status, 'body:', responseText);

    return Response.json({ success: true, status: response.status, response: responseText });
  } catch (error) {
    console.error('sendUserToGHL error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});