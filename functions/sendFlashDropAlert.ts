import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
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
        from_name: "Bean Rewards",
        to: customer.created_by,
        subject: `🔥 Flash Drop Alert: ${drop.title}`,
        body: `
Hey there!

A new Flash Drop just went LIVE! 🎉

📍 Location: ${drop.location_name || drop.location}
🎁 Available: ${drop.items_remaining || drop.total_items} ${drop.description}
⏰ Hurry - these go fast!

Open the Bean app now to claim your free item!

— The Bean Team
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