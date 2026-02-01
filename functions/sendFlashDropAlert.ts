import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin authentication required
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }
    
    const { dropId } = await req.json();

    if (!dropId) {
      return Response.json({ error: 'dropId is required' }, { status: 400 });
    }

    // Get the drop details
    const drop = await base44.asServiceRole.entities.FlashDrop.get(dropId);
    
    if (!drop) {
      return Response.json({ error: 'Drop not found' }, { status: 404 });
    }

    // Get all customers (you might want to add a notification preference field later)
    const customers = await base44.asServiceRole.entities.Customer.list();
    
    // Send email to each customer
    const emailPromises = customers.map(customer => {
      return base44.asServiceRole.integrations.Core.SendEmail({
        from_name: "BEAN - Breakfast & Coffee",
        to: customer.created_by,
        subject: `🔥 Flash Drop Alert: ${drop.title}`,
        body: `
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
              <h1 style="color: #5C4A3A; font-size: 28px; margin: 0 0 16px 0; font-weight: 700;">Flash Drop Alert! 🔥</h1>
              <p style="color: #8B7355; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Hey there!</p>
              <p style="color: #8B7355; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">A new Flash Drop just went <strong>LIVE</strong>! 🎉</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5EBE8; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <tr>
                  <td>
                    <p style="color: #5C4A3A; font-size: 16px; margin: 8px 0;"><strong>📍 Location:</strong> ${drop.location_name || drop.location}</p>
                    <p style="color: #5C4A3A; font-size: 16px; margin: 8px 0;"><strong>🎁 Available:</strong> ${drop.items_remaining || drop.total_items} ${drop.description}</p>
                    <p style="color: #5C4A3A; font-size: 16px; margin: 8px 0;"><strong>⏰ Hurry:</strong> These go fast!</p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #8B7355; font-size: 16px; line-height: 1.6; margin: 24px 0;">Open the Bean app now to claim your free item!</p>
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
        `
      });
    });

    await Promise.all(emailPromises);

    return Response.json({ 
      success: true, 
      emailsSent: customers.length 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});