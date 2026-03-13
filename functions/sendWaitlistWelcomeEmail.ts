import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { full_name, email } = await req.json();

    if (!full_name || !email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      from_name: "BEAN Coffee",
      subject: `Welcome to BEAN, ${full_name}! Your Waitlist Confirmation`,
      body: `Hi ${full_name},

Thank you for joining the waitlist for Islamabad's First Coffee Lover's Club! 

We're excited to have you as part of our founding community.


YOUR EARLY BIRD PERKS:

  ✓  50 Welcome Bonus Points
     Start earning rewards immediately

  ✓  10% Off First 3 Orders
     Exclusive early bird discount

  ✓  Founding Member Badge
     Special status forever

  ✓  Priority Event Access
     First to know, first to go


IMPORTANT NEXT STEP:

To complete your registration and secure your perks, please follow us on Instagram:

👉  https://www.instagram.com/beanpakistan


WHAT'S NEXT?

We'll notify you via email when it's time to join the app and claim your rewards.

In the meantime, stay tuned for exclusive updates about our launch!


Questions? Just reply to this email.

We can't wait to serve you at BEAN!


Best regards,
The BEAN Team


---
You're receiving this because you signed up for the BEAN Coffee waitlist.
If you didn't sign up, please ignore this email.`
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});