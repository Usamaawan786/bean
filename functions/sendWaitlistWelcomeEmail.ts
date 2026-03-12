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
      subject: "Welcome to the BEAN Community! ☕",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #F5F1ED;">
          <div style="background: linear-gradient(135deg, #8B7355 0%, #6B5744 100%); padding: 40px 20px; text-align: center; border-radius: 16px 16px 0 0;">
            <h1 style="color: #FFFFFF; font-size: 32px; margin: 0;">Welcome to BEAN! 🎉</h1>
          </div>
          
          <div style="background: #FFFFFF; padding: 40px 30px; border-radius: 0 0 16px 16px;">
            <p style="color: #5C4A3A; font-size: 18px; margin-bottom: 20px;">Hi ${full_name},</p>
            
            <p style="color: #5C4A3A; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Thank you for joining the waitlist for <strong>Islamabad's First Coffee Lover's Club!</strong> 
              We're thrilled to have you as part of our founding community.
            </p>
            
            <div style="background: #F5EBE8; border-left: 4px solid #8B7355; padding: 20px; margin: 30px 0; border-radius: 8px;">
              <h2 style="color: #5C4A3A; font-size: 20px; margin-top: 0;">Your Early Bird Perks:</h2>
              <ul style="color: #5C4A3A; font-size: 15px; line-height: 1.8;">
                <li>🎁 <strong>50 Welcome Bonus Points</strong> - Start earning rewards immediately</li>
                <li>💰 <strong>10% Off First 3 Orders</strong> - Exclusive early bird discount</li>
                <li>👑 <strong>Founding Member Badge</strong> - Special status forever</li>
                <li>⚡ <strong>Priority Event Access</strong> - First to know, first to go</li>
              </ul>
            </div>
            
            <div style="background: #FFF9E6; border: 2px solid #F59E0B; padding: 20px; margin: 30px 0; border-radius: 8px; text-align: center;">
              <p style="color: #92400E; font-size: 16px; font-weight: bold; margin: 0 0 10px 0;">⚠️ Important Next Step</p>
              <p style="color: #92400E; font-size: 14px; margin: 0 0 15px 0;">
                To complete your registration and secure your perks, you must follow us on Instagram:
              </p>
              <a href="https://www.instagram.com/beanpakistan?igsh=ZzdtYzg1bnMwcWp2" 
                 style="display: inline-block; background: linear-gradient(135deg, #E91E63 0%, #9C27B0 100%); color: #FFFFFF; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                📸 Follow @beanpakistan
              </a>
            </div>
            
            <p style="color: #5C4A3A; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              We'll notify you via email when it's time to join the app and claim your rewards. 
              In the meantime, stay tuned for exclusive updates about our launch!
            </p>
            
            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #E8DED8;">
              <p style="color: #8B7355; font-size: 14px; margin: 0;">
                Questions? Reply to this email anytime.<br/>
                We can't wait to serve you at BEAN!
              </p>
            </div>
          </div>
        </div>
      `
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});