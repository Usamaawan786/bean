import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const customers = await base44.entities.Customer.list();
    let updated = 0;

    for (const customer of customers) {
      // Check if they should have EBA status based on referral_conversions >= 5
      // (referring users who spent PKR 2000+)
      const shouldBeEBA = (customer.referral_conversions || 0) >= 5;
      const isCurrentlyEBA = customer.is_eba || false;

      if (shouldBeEBA && !isCurrentlyEBA) {
        await base44.entities.Customer.update(customer.id, { is_eba: true });
        updated++;
      } else if (!shouldBeEBA && isCurrentlyEBA) {
        // Optionally revoke if they no longer meet criteria
        await base44.entities.Customer.update(customer.id, { is_eba: false });
        updated++;
      }
    }

    return Response.json({
      status: 'success',
      message: `EBA status synced for ${customers.length} customers`,
      updated_count: updated
    });
  } catch (error) {
    console.error('EBA backfill failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});