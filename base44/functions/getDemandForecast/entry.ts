import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { ingredient_id } = body;

    let items;
    if (ingredient_id) {
      const item = await base44.asServiceRole.entities.InventoryItem.get(ingredient_id);
      items = item ? [item] : [];
    } else {
      items = await base44.asServiceRole.entities.InventoryItem.list('-name', 200);
    }

    const today = new Date();

    // Dates for the same day-of-week across last 4 weeks
    const targetDates = [];
    for (let w = 1; w <= 4; w++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (7 * w));
      targetDates.push(d.toISOString().slice(0, 10));
    }

    const forecasts = [];

    for (const item of items) {
      const transactions = await base44.asServiceRole.entities.InventoryTransaction.filter(
        { inventory_item_id: item.id, transaction_type: 'Sales_Deduction' },
        '-created_date', 500
      );

      let totalDeduction = 0;
      const weeklyData = [];

      for (const dateStr of targetDates) {
        const dayStart = new Date(dateStr + 'T00:00:00Z');
        const dayEnd = new Date(dateStr + 'T23:59:59.999Z');

        let dayDeduction = 0;
        for (const tx of transactions) {
          const txDate = new Date(tx.created_date);
          if (txDate >= dayStart && txDate <= dayEnd) {
            dayDeduction += Math.abs(tx.qty_change_base_unit || 0);
          }
        }
        totalDeduction += dayDeduction;
        weeklyData.push({ date: dateStr, deduction: Math.round(dayDeduction * 100) / 100 });
      }

      const matchingDays = targetDates.length;
      const avgVelocity = matchingDays > 0 ? totalDeduction / matchingDays : 0;
      const bufferMultiplier = 1.15;
      const targetPrepQty = Math.max(0, (avgVelocity * bufferMultiplier) - (item.current_stock_base_qty || 0));

      let status = 'green';
      if (targetPrepQty > avgVelocity * 0.5) status = 'red';
      else if (targetPrepQty > 0) status = 'amber';

      forecasts.push({
        inventory_item_id: item.id,
        name: item.name,
        unit: item.base_unit,
        current_stock: Math.round((item.current_stock_base_qty || 0) * 100) / 100,
        avg_daily_velocity: Math.round(avgVelocity * 100) / 100,
        target_prep_qty: Math.round(targetPrepQty * 100) / 100,
        status,
        weekly_data: weeklyData
      });
    }

    return Response.json({ success: true, forecasts });
  } catch (error) {
    console.error('getDemandForecast error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});