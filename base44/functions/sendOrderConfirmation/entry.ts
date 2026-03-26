import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin authentication required
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }
    
    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'orderId is required' }, { status: 400 });
    }

    // Get order details
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Format order items
    const itemsListHTML = order.items.map(item => 
      `<tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #E8DED8;">
          <p style="color: #5C4A3A; font-size: 15px; margin: 0; font-weight: 500;">${item.product_name} <span style="color: #8B7355;">x${item.quantity}</span></p>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #E8DED8; text-align: right;">
          <p style="color: #5C4A3A; font-size: 15px; margin: 0; font-weight: 500;">PKR ${(item.price * item.quantity).toFixed(2)}</p>
        </td>
      </tr>`
    ).join('');

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
              <h1 style="color: #5C4A3A; font-size: 28px; margin: 0 0 16px 0; font-weight: 700;">Order Confirmed! 🎉</h1>
              <p style="color: #8B7355; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Hi ${order.customer_name},</p>
              <p style="color: #8B7355; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Thank you for your order!</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5EBE8; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <tr>
                  <td>
                    <p style="color: #5C4A3A; font-size: 14px; margin: 0 0 4px 0; font-weight: 600;">Order Number</p>
                    <p style="color: #8B7355; font-size: 20px; margin: 0 0 12px 0; font-weight: 700;">#${order.order_number}</p>
                    <p style="color: #8B7355; font-size: 14px; margin: 0;">Date: ${new Date(order.created_date).toLocaleDateString()}</p>
                  </td>
                </tr>
              </table>
              
              <h2 style="color: #5C4A3A; font-size: 18px; margin: 24px 0 12px 0; font-weight: 600;">Order Items</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${itemsListHTML}
                <tr>
                  <td style="padding: 16px 0 0 0;">
                    <p style="color: #5C4A3A; font-size: 18px; margin: 0; font-weight: 700; text-align: right;">Total: PKR ${order.total_amount.toFixed(2)}</p>
                  </td>
                </tr>
              </table>
              
              ${order.points_earned ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #FFF9E6 0%, #FFF4CC 100%); border-radius: 12px; padding: 16px; margin: 24px 0;">
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #5C4A3A; font-size: 16px; margin: 0;">🌟 You earned <strong>${order.points_earned} reward points!</strong></p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <h2 style="color: #5C4A3A; font-size: 18px; margin: 24px 0 12px 0; font-weight: 600;">Shipping Address</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5EBE8; border-radius: 12px; padding: 20px;">
                <tr>
                  <td>
                    <p style="color: #5C4A3A; font-size: 15px; margin: 4px 0;">${order.shipping_address.street}</p>
                    <p style="color: #5C4A3A; font-size: 15px; margin: 4px 0;">${order.shipping_address.city}, ${order.shipping_address.postal_code}</p>
                    <p style="color: #5C4A3A; font-size: 15px; margin: 4px 0;">${order.shipping_address.country}</p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #8B7355; font-size: 15px; line-height: 1.6; margin: 24px 0 0 0;">We'll send you another email when your order ships.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F5F1ED; padding: 30px; text-align: center; border-top: 1px solid #E8DED8;">
              <p style="color: #8B7355; font-size: 14px; margin: 0;">Thanks for supporting BEAN!</p>
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
      to: order.customer_email,
      subject: `Order Confirmation - #${order.order_number}`,
      body: emailBody
    });

    return Response.json({ 
      success: true,
      orderNumber: order.order_number
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});