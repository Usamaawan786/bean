import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Edit-Bill escape hatch: deletes a just-saved StoreSale using the service role
// (cashier RLS blocks StoreSale.delete) and reverts the linked OpenTicket so the
// cashier can correct and re-complete the sale. Allowed for any POS staff role.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['cashier', 'manager', 'admin', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: staff access required' }, { status: 403 });
    }

    const { sale_id, ticket_id } = await req.json();
    if (!sale_id) {
      return Response.json({ error: 'sale_id is required' }, { status: 400 });
    }

    // Delete the just-saved sale with service-role permissions (cashiers can't delete via RLS).
    await base44.asServiceRole.entities.StoreSale.delete(sale_id);

    // Revert the linked OpenTicket back to Open so it can be re-completed.
    if (ticket_id) {
      try {
        await base44.asServiceRole.entities.OpenTicket.update(ticket_id, {
          status: 'Open',
          sale_bill_number: null,
        });
      } catch (e) {
        // non-blocking — sale is already voided; ticket revert is best-effort
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});