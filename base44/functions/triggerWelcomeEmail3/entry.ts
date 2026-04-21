import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// This function is called by a scheduled automation to send email #3 to customers
// who signed up ~5 days ago (Flash Drops + Referral email).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    const allCustomers = await base44.asServiceRole.entities.Customer.list("-created_date", 500);
    const targetCustomers = allCustomers.filter(c => {
      if (!c.created_date) return false;
      const created = new Date(c.created_date);
      return created >= sixDaysAgo && created <= fiveDaysAgo;
    });

    console.log(`Found ${targetCustomers.length} customers for welcome email #3`);

    let sent = 0;
    for (const customer of targetCustomers) {
      const email = customer.user_email || customer.created_by;
      if (!email) continue;
      try {
        await base44.asServiceRole.functions.invoke("sendWelcomeEmailSeries", {
          user_email: email,
          customer_id: customer.id,
          email_number: 3,
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send email #3 to ${email}:`, e.message);
      }
    }

    return Response.json({ success: true, sent, total_found: targetCustomers.length });
  } catch (error) {
    console.error("triggerWelcomeEmail3 error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});