import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { full_name, email, referral_code } = await req.json();

    if (!full_name || !email || !referral_code) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Construct referral link
    const referralLink = `https://bean-coffee.base44.app/Waitlist?referred_by=${referral_code}`;
    const firstName = full_name.split(' ')[0];

    const emailBody = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <title>An Exclusive Invitation for You, BEAN Ambassador!</title>
    <style>
        @media (prefers-color-scheme: dark) {
            body, div, p, h1, h2, h3, ul, li, a { background-color: #F5F1ED !important; color: #5C4A3A !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1ED; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased; color-scheme: light only;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #F5F1ED;">
        
        <div style="background: linear-gradient(135deg, #8B7355 0%, #6B5744 100%); padding: 50px 30px; text-align: center; border-radius: 16px 16px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">An Exclusive Invitation, ${firstName}! ☕</h1>
        </div>
        
        <div style="background-color: white; padding: 45px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 8px 20px rgba(0,0,0,0.08);">
            
            <p style="font-size: 18px; color: #5C4A3A; line-height: 1.8; margin: 0 0 28px 0;">
                Hi <strong>${firstName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #5C4A3A; line-height: 1.8; margin: 0 0 36px 0;">
                Get ready for an exciting update! To celebrate our community and reward our most dedicated members, we're launching an exclusive program:
            </p>

            <h2 style="color: #8B7355; margin: 0 0 24px 0; font-size: 24px; font-weight: 700; text-align: center;">Become an Elite Bean Ambassador (EBA)</h2>
            
            <p style="font-size: 16px; color: #5C4A3A; line-height: 1.8; margin: 0 0 36px 0;">
                We're inviting you to take your love for BEAN to the next level. If you live and breathes coffee and want to be at the forefront of Islamabad's first Coffee Lover's Club, this is for you.
            </p>
            
            <div style="background: linear-gradient(135deg, #FFF8F0 0%, #FFF3E6 100%); border-left: 5px solid #8B7355; padding: 32px 28px; margin: 0 0 36px 0; border-radius: 8px;">
                <h3 style="color: #8B7355; margin: 0 0 12px 0; font-size: 20px; font-weight: 700;">The Challenge:</h3>
                <p style="color: #5C4A3A; margin: 0; line-height: 1.8; font-size: 15px;">
                    Simply refer <strong>5 or more fellow coffee lovers</strong> using your unique link. Once they join the family, you'll instantly qualify as an <strong>Elite Bean Ambassador</strong>.
                </p>
            </div>

            <div style="background-color: #F8F9FA; padding: 32px 28px; margin: 0 0 36px 0; border-radius: 8px; border-left: 4px solid #6B5744;">
                <h3 style="color: #5C4A3A; margin: 0 0 20px 0; font-size: 18px; font-weight: 700;">Ambassador Perks:</h3>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 15px; color: #5C4A3A; line-height: 1.8;">
                    <li style="margin-bottom: 10px;">✓ <strong>Exclusive Discounts:</strong> Unique pricing on coffee, beans, and merchandise.</li>
                    <li style="margin-bottom: 10px;">✓ <strong>Digital Badge:</strong> A verified "EBA" badge displayed on your app profile.</li>
                    <li style="margin-bottom: 10px;">✓ <strong>Early Access:</strong> First dibs on new blends and beta features.</li>
                    <li style="margin-bottom: 10px;">✓ <strong>VIP Invites:</strong> Access to Ambassador-only tastings and workshops.</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
                <p style="font-size: 16px; color: #5C4A3A; line-height: 1.8; margin: 0 0 20px 0;">
                    Share your unique referral link to start:
                </p>
                <div style="background-color: #FFF3E6; border: 1px dashed #8B7355; padding: 15px; border-radius: 8px; display: inline-block; width: 90%; word-break: break-all;">
                    <strong style="color: #8B7355; font-size: 16px;">${referralLink}</strong>
                </div>
            </div>
            
            <p style="font-size: 16px; color: #5C4A3A; line-height: 1.8; margin: 0;">
                Stay Caffeinated,<br>
                <strong>The BEAN Team</strong>
            </p>
            
            <hr style="border: none; border-top: 2px solid #E8DED8; margin: 40px 0 32px 0;">
            
            <p style="font-size: 12px; color: #A89380; text-align: center; margin: 0;">
                Want to take a break from the caffeine? <br>
                <a href="#" style="color: #8B7355; text-decoration: underline;">Unsubscribe</a>  
            </p>
            
            <p style="font-size: 11px; color: #A89380; text-align: center; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px;">
                BEAN Coffee • Pakistan
            </p>
        </div>
    </div>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      from_name: "BEAN Coffee",
      subject: `☕ An Exclusive Invitation, ${firstName}!`,
      body: emailBody
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});