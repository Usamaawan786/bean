import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all EBA signups
    const ebaSignups = await base44.asServiceRole.entities.WaitlistSignup.filter({ eba_status: 'EBA' });
    
    if (ebaSignups.length === 0) {
      return Response.json({ success: true, synced: 0, message: 'No EBA signups found' });
    }

    let synced = 0;
    const results = [];

    for (const signup of ebaSignups) {
      if (!signup.email) continue;

      try {
        // Find customer by email
        const customers = await base44.asServiceRole.entities.Customer.filter({ user_email: signup.email });
        
        if (customers.length > 0) {
          const customer = customers[0];
          
          // Update if not already marked as EBA
          if (!customer.is_eba) {
            await base44.asServiceRole.entities.Customer.update(customer.id, {
              is_eba: true
            });
            synced++;
            results.push({ email: signup.email, name: signup.full_name, status: 'updated' });
          } else {
            results.push({ email: signup.email, name: signup.full_name, status: 'already_eba' });
          }
        } else {
          results.push({ email: signup.email, name: signup.full_name, status: 'no_customer_record' });
        }
      } catch (err) {
        console.error(`Error syncing EBA for ${signup.email}:`, err.message);
        results.push({ email: signup.email, name: signup.full_name, status: 'error', error: err.message });
      }
    }

    console.log(`[syncEBAToCustomers] Synced ${synced}/${ebaSignups.length} EBA customers`);
    return Response.json({ success: true, synced, total: ebaSignups.length, results });

  } catch (error) {
    console.error('[syncEBAToCustomers] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});