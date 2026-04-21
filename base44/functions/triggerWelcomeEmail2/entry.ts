import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// This function is called by a scheduled automation to send email #2 to customers
// who signed up ~2 days ago and haven't received email #2 yet.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // Find customers created 2-3 days ago (window to avoid duplicates)
    const allCustomers = await base44.asServiceRole.entities.Customer.list("-created_date", 500);
    const targetCustomers = allCustomers.filter(c => {
      if (!c.created_date) return false;
      const created = new Date(c.created_date);
      return created >= threeDaysAgo && created <= twoDaysAgo;
    });

    console.log(`Found ${targetCustomers.length} customers for welcome email #2`);

    let sent = 0;
    for (const customer of targetCustomers) {
      const email = customer.user_email || customer.created_by;
      if (!email) continue;
      try {
        await base44.asServiceRole.functions.invoke("sendWelcomeEmailSeries", {
          user_email: email,
          customer_id: customer.id,
          email_number: 2,
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send email #2 to ${email}:`, e.message);
      }
    }

    return Response.json({ success: true, sent, total_found: targetCustomers.length });
  } catch (error) {
    console.error("triggerWelcomeEmail2 error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});