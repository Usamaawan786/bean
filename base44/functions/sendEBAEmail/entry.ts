// Email sending disabled — all emails go through GHL
Deno.serve(async (_req) => {
  console.log('sendEBAEmail called but disabled — emails handled by GHL');
  return Response.json({ success: true, skipped: true, reason: 'Emails handled by GHL' });
});