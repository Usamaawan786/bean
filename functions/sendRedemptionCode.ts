import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin authentication required
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }
    
    const { redemptionId } = await req.json();

    if (!redemptionId) {
      return Response.json({ error: 'redemptionId is required' }, { status: 400 });
    }

    // Get redemption details
    const redemption = await base44.asServiceRole.entities.Redemption.get(redemptionId);
    
    if (!redemption) {
      return Response.json({ error: 'Redemption not found' }, { status: 404 });
    }

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F1ED;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F1ED; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #8B7355 0%, #6B5744 100%); padding: 40px 20px; text-align: center;">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976cd7fe6e4b20fcb30cf61/fe8510aa2_Group1302.png" alt="BEAN" width="200" style="display: block; margin: 0 auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="color: #5C4A3A; font-size: 28px; margin: 0 0 16px 0; font-weight: 700;">Congratulations! 🎉</h1>
              <p style="color: #8B7355; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">You've successfully redeemed: <strong>${redemption.reward_name}</strong></p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #F5EBE8 0%, #EDE3DF 100%); border-radius: 12px; padding: 30px; margin: 24px 0; border: 2px dashed #8B7355;">
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #8B7355; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">YOUR REDEMPTION CODE</p>
                    <p style="color: #5C4A3A; font-size: 32px; margin: 0; font-weight: 700; letter-spacing: 4px;">${redemption.redemption_code}</p>
                  </td>
                </tr>
              </table>
              
              <h2 style="color: #5C4A3A; font-size: 18px; margin: 24px 0 12px 0; font-weight: 600;">How to Use:</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="color: #8B7355; font-size: 15px; margin: 0;"><strong>1.</strong> Visit any BEAN location</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="color: #8B7355; font-size: 15px; margin: 0;"><strong>2.</strong> Show this code to the barista</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="color: #8B7355; font-size: 15px; margin: 0;"><strong>3.</strong> Enjoy your reward!</p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5EBE8; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <tr>
                  <td>
                    <p style="color: #5C4A3A; font-size: 15px; margin: 4px 0;"><strong>Points Used:</strong> ${redemption.points_spent}</p>
                    <p style="color: #5C4A3A; font-size: 15px; margin: 4px 0;"><strong>Status:</strong> ${redemption.status}</p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #8B7355; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; font-style: italic;">This code is valid until redeemed. Don't forget to use it!</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F5F1ED; padding: 30px; text-align: center; border-top: 1px solid #E8DED8;">
              <p style="color: #8B7355; font-size: 14px; margin: 0;">— The BEAN Team</p>
              <p style="color: #C9B8A6; font-size: 12px; margin: 8px 0 0 0;">Brews · Bites · Bar</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: "BEAN - Breakfast & Coffee",
      to: redemption.customer_email,
      subject: `Your Reward Code: ${redemption.reward_name}`,
      body: emailBody
    });

    return Response.json({ 
      success: true,
      redemptionCode: redemption.redemption_code
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});