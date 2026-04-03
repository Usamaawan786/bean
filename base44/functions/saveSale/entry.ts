import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['admin', 'super_admin', 'manager', 'cashier'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { saleData } = body;

    if (!saleData) {
      return Response.json({ error: 'saleData is required' }, { status: 400 });
    }

    // Use service role to bypass any RLS issues
    const sale = await base44.asServiceRole.entities.StoreSale.create(saleData);

    return Response.json({ success: true, sale });
  } catch (error) {
    console.error('Error saving sale:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});