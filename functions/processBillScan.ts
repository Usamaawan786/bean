import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { qrCodeId } = await req.json();

    if (!qrCodeId) {
      return Response.json({ error: 'QR code ID is required' }, { status: 400 });
    }

    // Find the sale with this QR code
    const sales = await base44.entities.StoreSale.filter({ qr_code_id: qrCodeId });

    if (sales.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Invalid QR code' 
      }, { status: 404 });
    }

    const sale = sales[0];

    // Check if already scanned
    if (sale.is_scanned) {
      return Response.json({ 
        success: false, 
        error: 'This QR code has already been used' 
      }, { status: 400 });
    }

    // Calculate points: 10 points per 1000 PKR
    const pointsToAward = Math.floor(sale.total_amount / 100);

    // Get customer record
    const customers = await base44.entities.Customer.filter({ created_by: user.email });
    
    if (customers.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Customer profile not found' 
      }, { status: 404 });
    }

    const customer = customers[0];

    // Update customer points
    await base44.entities.Customer.update(customer.id, {
      points_balance: customer.points_balance + pointsToAward,
      total_points_earned: customer.total_points_earned + pointsToAward
    });

    // Mark sale as scanned
    await base44.entities.StoreSale.update(sale.id, {
      is_scanned: true,
      scanned_by: user.email,
      scanned_at: new Date().toISOString(),
      points_awarded: pointsToAward
    });

    return Response.json({
      success: true,
      points_awarded: pointsToAward,
      new_balance: customer.points_balance + pointsToAward
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});