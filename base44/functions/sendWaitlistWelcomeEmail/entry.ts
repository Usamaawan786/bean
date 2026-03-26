import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { full_name, email, referral_code } = await req.json();

    if (!full_name || !email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const firstName = full_name.split(' ')[0];
    
    // Trigger GHL workflow/automation for welcome email
    // Using the same webhook endpoint that's already working for lead capture
    const ghlWebhookUrl = "https://services.leadconnectorhq.com/hooks/gj8OBCLmVBdkG2uJwiTN/webhook-trigger/fe044896-846d-465d-8078-0f9eeb44bcb7";
    
    const nameParts = full_name.split(' ');
    const lastName = nameParts.slice(1).join(' ') || '';

    const response = await fetch(ghlWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: firstName,
        lastName: lastName,
        email: email,
        referralCode: referral_code || '',
        triggerWelcomeEmail: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL Webhook Error:', errorText);
      return Response.json({ error: 'Failed to trigger welcome email' }, { status: 500 });
    }

    console.log('Successfully triggered welcome email via GHL webhook');
    return Response.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});