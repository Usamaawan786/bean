import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { full_name, email, referral_link } = await req.json();

    if (!full_name || !email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const firstName = full_name.split(' ')[0];
    
    const htmlBody = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <style>
        @media (prefers-color-scheme: dark) {
            body { background-color: #1a1612 !important; }
            .card { background-color: #2a241e !important; border-color: #3a3329 !important; }
            .text-primary { color: #E8DED8 !important; }
            .text-secondary { color: #C9B8A6 !important; }
            .text-accent { color: #D4C4B0 !important; }
            .bg-highlight { background-color: #342e28 !important; border-color: #4a4339 !important; }
            .divider { border-color: #3a3329 !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1ED; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 560px; margin: 40px auto; padding: 0 20px;">

        <!-- Minimal Header -->
        <div style="text-align: center; padding: 32px 0 24px 0;">
            <p style="font-size: 28px; margin: 0;">☕</p>
            <p class="text-primary" style="font-size: 22px; font-weight: 700; color: #5C4A3A; margin: 8px 0 0 0; letter-spacing: -0.3px;">Welcome to Coffee Lover's Club by Bean!</p>
        </div>

        <!-- Body Card -->
        <div class="card" style="background-color: #FFFFFF; border-radius: 12px; padding: 40px 36px; border: 1px solid #E8DED8;">

            <p class="text-primary" style="font-size: 17px; color: #5C4A3A; line-height: 1.8; margin: 0 0 20px 0;">
                Hi <strong>${firstName}</strong>,
            </p>

            <p class="text-primary" style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 20px 0;">
                We have an exciting update for you! To celebrate our community and reward our most dedicated members, we're launching something special:
            </p>

            <p class="text-accent" style="font-size: 18px; font-weight: 700; color: #8B7355; margin: 0 0 20px 0; text-align: center;">
                Become an Elite Bean Ambassador (EBA) 🌟
            </p>

            <p class="text-primary" style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 28px 0;">
                If you live and breathe coffee and want to be at the forefront of Islamabad's first Coffee Lover's Club — this is for you.
            </p>

            <hr class="divider" style="border: none; border-top: 1px solid #E8DED8; margin: 28px 0;">

            <p class="text-primary" style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 12px 0;">
                <strong>The Challenge:</strong>
            </p>
            <p class="text-primary" style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 28px 0;">
                Simply refer <strong>5 or more fellow coffee lovers</strong> using your unique link. Once they join, you instantly qualify as an <strong>Elite Bean Ambassador</strong>.
            </p>

            <p class="text-primary" style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 12px 0;">
                <strong>Ambassador Perks:</strong>
            </p>
            <p class="text-primary" style="font-size: 15px; color: #5C4A3A; line-height: 2; margin: 0 0 28px 0; padding-left: 8px;">
                ✓ &nbsp;<strong>Exclusive Discounts</strong> on coffee, beans & merchandise<br>
                ✓ &nbsp;<strong>Verified EBA Badge</strong> on your app profile<br>
                ✓ &nbsp;<strong>Early Access</strong> to new blends and beta features<br>
                ✓ &nbsp;<strong>VIP Invites</strong> to Ambassador-only tastings & workshops
            </p>

            <hr class="divider" style="border: none; border-top: 1px solid #E8DED8; margin: 28px 0;">

            <p class="text-primary" style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 12px 0;">
                Your unique referral link:
            </p>
            <div class="bg-highlight" style="background-color: #FFF8F0; border: 1px dashed #8B7355; padding: 14px 18px; border-radius: 8px; margin: 0 0 28px 0; word-break: break-all;">
                <strong class="text-accent" style="color: #8B7355; font-size: 14px;">${referral_link || 'https://bean.base44.app/waitlist'}</strong>
            </div>

            <p class="text-primary" style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 28px 0;">
                Share it with fellow coffee lovers and start your journey to becoming a BEAN Ambassador!
            </p>

            <p class="text-primary" style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0;">
                Stay Caffeinated,<br>
                <strong>The BEAN Team</strong>
            </p>

        </div>

        <!-- Footer -->
        <div style="padding: 28px 0; text-align: center;">
            <p class="text-secondary" style="font-size: 12px; color: #A89380; margin: 0 0 8px 0;">
                Wanna take a break from Caffeine?
            </p>
            <p class="text-secondary" style="font-size: 12px; color: #A89380; margin: 0 0 8px 0;">
                <a href="mailto:support@beancoffee.co?subject=Unsubscribe" style="color: #8B7355; text-decoration: underline;">Unsubscribe</a>
            </p>
            <p class="text-secondary" style="font-size: 11px; color: #C9B8A6; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                BEAN Coffee • Pakistan
            </p>
        </div>

    </div>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: "Welcome to Bean Coffee Lover's Club ☕",
      body: htmlBody,
      from_name: "Bean Coffee"
    });

    console.log('Successfully sent welcome email to:', email);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});