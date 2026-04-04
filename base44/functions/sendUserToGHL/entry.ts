import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const GHL_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/gj8OBCLmVBdkG2uJwiTN/webhook-trigger/f77ddd65-ac38-42fd-a859-cfab76b5a389";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, phone } = await req.json();

    const payload = {
      name: name || user.full_name || "",
      email: email || user.email || "",
      phone: phone || "",
      source: "Bean App Signup",
      tags: ["App User"]
    };

    const res = await fetch(GHL_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `GHL webhook failed: ${errText}` }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});