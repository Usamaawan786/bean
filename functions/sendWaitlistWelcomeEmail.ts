import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { full_name, email } = await req.json();

    if (!full_name || !email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use service role to send email (no auth required for waitlist emails)
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      from_name: "BEAN Coffee",
      subject: `Welcome to BEAN, ${full_name}! Your Waitlist Confirmation`,
      body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <style>
        @media (prefers-color-scheme: dark) {
            body, div, p, h1, h2, h3, ul, li, a { background-color: #F5F1ED !important; color: #5C4A3A !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1ED; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased; color-scheme: light only;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #F5F1ED;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B7355 0%, #6B5744 100%); padding: 50px 30px; text-align: center; border-radius: 16px 16px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Welcome to BEAN! 🎉</h1>
        </div>
        
        <!-- Body -->
        <div style="background-color: white; padding: 45px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 8px 20px rgba(0,0,0,0.08);">
            
            <p style="font-size: 18px; color: #5C4A3A; line-height: 1.8; margin: 0 0 28px 0;">
                Hi <strong>${full_name}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #5C4A3A; line-height: 1.8; margin: 0 0 36px 0;">
                Thank you for joining the waitlist for <strong>Islamabad's First Coffee Lover's Club!</strong> We're excited to have you as part of our founding community.
            </p>
            
            <!-- Perks Section -->
            <div style="background: linear-gradient(135deg, #FFF8F0 0%, #FFF3E6 100%); border-left: 5px solid #8B7355; padding: 32px 28px; margin: 0 0 36px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(139,115,85,0.1);">
                <h2 style="color: #8B7355; margin: 0 0 24px 0; font-size: 22px; font-weight: 700;">YOUR EARLY BIRD PERKS</h2>
                
                <div style="margin-bottom: 20px;">
                    <div style="color: #5C4A3A; font-weight: 600; margin-bottom: 6px;">✓ 50 Welcome Bonus Points</div>
                    <div style="font-size: 14px; color: #8B7355; padding-left: 20px;">Start earning rewards immediately</div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="color: #5C4A3A; font-weight: 600; margin-bottom: 6px;">✓ 10% Off First 3 Orders</div>
                    <div style="font-size: 14px; color: #8B7355; padding-left: 20px;">Exclusive early bird discount</div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="color: #5C4A3A; font-weight: 600; margin-bottom: 6px;">✓ Founding Member Badge</div>
                    <div style="font-size: 14px; color: #8B7355; padding-left: 20px;">Special status forever</div>
                </div>
                
                <div>
                    <div style="color: #5C4A3A; font-weight: 600; margin-bottom: 6px;">✓ Priority Event Access</div>
                    <div style="font-size: 14px; color: #8B7355; padding-left: 20px;">First to know, first to go</div>
                </div>
            </div>
            
            <!-- Important Next Step -->
            <div style="background-color: #FFF3CD; border: 2px solid #FFC107; padding: 32px 28px; margin: 0 0 36px 0; border-radius: 10px; box-shadow: 0 2px 8px rgba(255,193,7,0.15);">
                <h3 style="color: #856404; margin: 0 0 18px 0; font-size: 20px; font-weight: 700;">⚠️ IMPORTANT NEXT STEP</h3>
                <p style="color: #856404; margin: 0 0 18px 0; line-height: 1.8; font-size: 15px;">
                    To complete your registration and secure your perks, please <strong>follow us on Instagram</strong> which is <strong>NEWLY</strong> live!
                </p>
                <div style="text-align: center; margin: 24px 0 18px 0;">
                    <a href="https://www.instagram.com/beanpakistan" style="display: inline-block; background: linear-gradient(135deg, #E1306C, #C13584, #833AB4); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px;">
                        👉 Follow @beanpakistan
                    </a>
                </div>
                <p style="color: #856404; margin: 0; line-height: 1.8; font-size: 15px;">
                    In the meantime, stay tuned for exclusive updates about our launch!
                </p>
            </div>
            
            <!-- What's Next -->
            <div style="background-color: #F8F9FA; padding: 24px; margin: 0 0 36px 0; border-radius: 8px; border-left: 4px solid #8B7355;">
                <h3 style="color: #5C4A3A; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">What's Next?</h3>
                <p style="color: #5C4A3A; margin: 0; line-height: 1.8; font-size: 15px;">
                    We'll notify you via email when it's time to join the app and claim your rewards.
                </p>
            </div>
            
            <p style="font-size: 16px; color: #5C4A3A; line-height: 1.8; margin: 0 0 28px 0;">
                Questions? Just reply to this email. We can't wait to serve you at BEAN!
            </p>
            
            <p style="font-size: 16px; color: #5C4A3A; line-height: 1.8; margin: 0;">
                Best regards,<br>
                <strong style="font-size: 17px;">The BEAN Team</strong>
            </p>
            
            <hr style="border: none; border-top: 2px solid #E8DED8; margin: 40px 0 32px 0;">
            
            <p style="font-size: 13px; color: #8B7355; text-align: center; line-height: 1.7; margin: 0;">
                You're receiving this because you signed up for the BEAN Coffee waitlist.<br>
                If you didn't sign up, please ignore this email.
            </p>
        </div>
    </div>
</body>
</html>
`
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});