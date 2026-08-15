import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Re-allocates reward points from an expired (unscanned) bill to a customer.
// Used when a customer missed the 3-hour scan window and is upset — an admin
// can manually award the same points with a full audit trail.
//
// Authority: admin / super_admin only.
// Inputs: { sale_id, customer_email, reason }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'super_admin'].includes(user.role)) {
      return Response.json({ success: false, error: 'Forbidden — admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { sale_id, customer_email, reason } = body;

    if (!sale_id || !customer_email || !reason) {
      return Response.json({ success: false, error: 'sale_id, customer_email, and reason are all required' }, { status: 400 });
    }

    // 1. Fetch the sale
    const sale = await base44.asServiceRole.entities.StoreSale.get(sale_id);
    if (!sale) {
      return Response.json({ success: false, error: 'Sale not found' });
    }

    if (sale.is_scanned) {
      return Response.json({ success: false, error: 'This bill has already been scanned — points were already awarded.' });
    }

    const pointsToAward = sale.points_awarded || 0;
    if (pointsToAward <= 0) {
      return Response.json({ success: false, error: 'No points to award for this bill.' });
    }

    // 2. Fetch the customer record
    let customerList = await base44.asServiceRole.entities.Customer.filter({ user_email: customer_email });
    if (customerList.length === 0) {
      customerList = await base44.asServiceRole.entities.Customer.filter({ created_by: customer_email });
    }
    if (customerList.length === 0) {
      return Response.json({ success: false, error: 'Customer profile not found for this email.' });
    }

    const customer = customerList[0];
    const oldBalance = customer.points_balance || 0;
    const newPointsBalance = oldBalance + pointsToAward;
    const newTotalEarned = (customer.total_points_earned || 0) + pointsToAward;
    const newTotalSpend = (customer.total_spend_pkr || 0) + (sale.subtotal || sale.total_amount || 0);

    // 3. Award points to the customer
    await base44.asServiceRole.entities.Customer.update(customer.id, {
      points_balance: newPointsBalance,
      total_points_earned: newTotalEarned,
      total_spend_pkr: newTotalSpend
    });

    // 4. Mark the sale as scanned + stamp the reallocation audit fields
    await base44.asServiceRole.entities.StoreSale.update(sale.id, {
      is_scanned: true,
      scanned_by: customer_email,
      scanned_at: new Date().toISOString(),
      reallocated_by: user.email,
      reallocated_at: new Date().toISOString(),
      reallocated_reason: reason
    });

    // 5. Log activity for the customer's feed
    await base44.asServiceRole.entities.Activity.create({
      user_email: customer_email,
      action_type: "points_reallocated",
      description: `Points re-allocated by admin for expired bill ${sale.bill_number} (${pointsToAward} pts)`,
      points_amount: pointsToAward,
      metadata: {
        bill_number: sale.bill_number,
        sale_id: sale.id,
        reallocated_by: user.email,
        reason
      }
    });

    // 6. Permanent audit trail in PointsAdjustment
    await base44.asServiceRole.entities.PointsAdjustment.create({
      customer_email: customer_email,
      customer_name: customer.display_name || customer_email,
      old_balance: oldBalance,
      new_balance: newPointsBalance,
      delta: pointsToAward,
      reason: `Re-allocation of expired bill ${sale.bill_number}: ${reason}`,
      adjusted_by: user.email,
      adjusted_by_name: user.full_name || user.email,
      adjusted_at: new Date().toISOString()
    });

    console.log(`Re-allocated ${pointsToAward} pts from expired bill ${sale.bill_number} to ${customer_email} by ${user.email}`);

    return Response.json({
      success: true,
      points_awarded: pointsToAward,
      old_balance: oldBalance,
      new_balance: newPointsBalance,
      bill_number: sale.bill_number
    });

  } catch (error) {
    console.error('Error re-allocating expired points:', error);
    return Response.json({ success: false, error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
});