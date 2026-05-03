// Email sending disabled — all emails go through GHL
Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  console.log('sendWelcomeEmailSeries called but disabled — emails handled by GHL', body.user_email, 'email_number:', body.email_number);
  return Response.json({ success: true, skipped: true, reason: 'Emails handled by GHL' });
});