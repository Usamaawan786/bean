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
    const itemsList = order.items.map(item => 
      `• ${item.product_name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const emailBody = `
Hi ${order.customer_name},

Thank you for your order! 🎉

Order #${order.order_number}
Date: ${new Date(order.created_date).toLocaleDateString()}

Items Ordered:
${itemsList}

Total: $${order.total_amount.toFixed(2)}
Status: ${order.status}

${order.points_earned ? `You earned ${order.points_earned} reward points! 🌟` : ''}

Shipping Address:
${order.shipping_address.street}
${order.shipping_address.city}, ${order.shipping_address.postal_code}
${order.shipping_address.country}

We'll send you another email when your order ships.

Thanks for supporting Bean!

— The Bean Team
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: "Bean - Order Confirmation",
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