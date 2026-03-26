import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { full_name, email, referral_code } = await req.json();

    if (!full_name || !email || !referral_code) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Construct referral link
    const referralLink = `https://bean.base44.app/waitlist?referred_by=${referral_code}`;
    const firstName = full_name.split(' ')[0];

    const emailBody = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1ED; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color-scheme: light only;">
    <div style="max-width: 560px; margin: 40px auto; padding: 0 20px;">

        <div style="text-align: center; padding: 32px 0 24px 0;">
            <p style="font-size: 28px; margin: 0;">☕</p>
            <p style="font-size: 22px; font-weight: 700; color: #5C4A3A; margin: 8px 0 0 0; letter-spacing: -0.3px;">Coffee Lover's Club by Bean</p>
        </div>

        <div style="background-color: #FFFFFF; border-radius: 12px; padding: 40px 36px; border: 1px solid #E8DED8;">

            <p style="font-size: 17px; color: #5C4A3A; line-height: 1.8; margin: 0 0 20px 0;">
                Hi <strong>${firstName}</strong>,
            </p>

            <p style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 20px 0;">
                We've been watching the community grow, and it means a lot that you're an active part of it. We'd love for you to take your community status to the next level, as a founding members of Coffee Lover's Club (CLC).
            </p>

            <p style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 20px 0;">
                We'd like to invite you to become an <strong>Elite Bean Ambassador (EBA)</strong> — a small group of members who go above and beyond for the community.
            </p>

            <p style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 15px 0;">
                Here's what you unlock as an EBA:
            </p>

            <p style="font-size: 15px; color: #5C4A3A; line-height: 2; margin: 0 0 28px 0; padding-left: 8px;">
                ✓ &nbsp;Exclusive discounts on coffee, juices, breakfast &amp; merchandise<br>
                ✓ &nbsp;Verified EBA Badge on your app profile<br>
                ✓ &nbsp;Early access to new blends and beta features<br>
                ✓ &nbsp;VIP invites to Ambassador-only tastings &amp; workshops
            </p>

            <hr style="border: none; border-top: 1px solid #E8DED8; margin: 28px 0;">

            <p style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 12px 0;">
                <strong>How to qualify:</strong> Refer 5 or more fellow coffee lovers using your unique link below. Once they join, you're in.
            </p>

            <p style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 12px 0;">
                Your referral link:
            </p>

            <div style="background-color: #F5F1ED; border-radius: 8px; padding: 14px 16px; margin: 0 0 28px 0; border: 1px solid #E8DED8;">
                <strong style="color: #8B7355; font-size: 14px;">${referralLink}</strong>
            </div>

            <p style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 28px 0;">
                Share it with anyone who loves a good cup, and we'll take care of the rest.
            </p>

            <p style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 28px 0;">
                Stay Caffeinated,<br>
                <strong>The BEAN Team</strong>
            </p>

            <hr style="border: none; border-top: 1px solid #E8DED8; margin: 28px 0;">

            <p style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0 0 8px 0;">
                <strong>P.S.</strong> Quick one — what's your go-to coffee order?
            </p>
            <p style="font-size: 15px; color: #5C4A3A; line-height: 1.9; margin: 0;">
                Just hit reply and tell us — we'll be planning our next community events menu around member favourites! ☕
            </p>

        </div>

        <div style="padding: 28px 0; text-align: center;">
            <p style="font-size: 12px; color: #A89380; margin: 0 0 8px 0;">
                Don't want these updates?
            </p>
            <p style="font-size: 12px; color: #A89380; margin: 0 0 8px 0;">
                <a href="#" style="color: #8B7355; text-decoration: underline;">Unsubscribe</a>
            </p>
            <p style="font-size: 11px; color: #C9B8A6; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                BEAN Coffee • Pakistan
            </p>
        </div>

    </div>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      from_name: "BEAN Coffee",
      subject: `Your invite from the Bean team, ${firstName}`,
      body: emailBody
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});