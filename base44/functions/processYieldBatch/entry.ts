import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { applyStockDelta, roundQty } from "../../shared/stockLedger.ts";

// Atomic yield-processing transaction:
//   1. Debit gross_input_weight from the raw item's stock (Batch_Production_Debit).
//   2. Credit net_usable_output_weight to the processed item's stock (Batch_Production_Credit).
//   3. Write waste_weight (gross - net) to the waste_ledger (WasteLog).
//   4. Update the processed item's cost basis to the calculated effective_unit_cost.
//   5. Record the YieldConversion header for traceability.
//
// Formulas:
//   yield_percentage    = (net / gross) * 100
//   waste_weight        = gross - net
//   effective_unit_cost  = raw_unit_cost / (yield_percentage / 100)

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'manager', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { raw_item_id, processed_item_id, gross_input_weight, net_usable_output_weight, notes } = body;
    if (!raw_item_id || !processed_item_id) {
      return Response.json({ error: 'raw_item_id and processed_item_id are required' }, { status: 400 });
    }
    if (raw_item_id === processed_item_id) {
      return Response.json({ error: 'Raw and processed items must be different' }, { status: 400 });
    }

    const gross = Number(gross_input_weight);
    const net = Number(net_usable_output_weight);
    if (!(gross > 0) || !(net >= 0) || net > gross) {
      return Response.json({ error: 'Invalid weights: net must be between 0 and gross' }, { status: 400 });
    }

    const raw = await base44.asServiceRole.entities.InventoryItem.get(raw_item_id);
    const processed = await base44.asServiceRole.entities.InventoryItem.get(processed_item_id);
    if (!raw) return Response.json({ error: 'Raw item not found' }, { status: 404 });
    if (!processed) return Response.json({ error: 'Processed item not found' }, { status: 404 });

    const waste = roundQty(gross - net);
    const yieldPct = gross > 0 ? Math.round((net / gross) * 10000) / 100 : 0;
    const rawUnitCost = raw.moving_average_cost || raw.cost_per_base_unit || 0;
    const effectiveUnitCost = yieldPct > 0
      ? Math.round((rawUnitCost / (yieldPct / 100)) * 10000) / 10000
      : 0;
    const unit = raw.base_unit || '';

    // 1. Debit raw stock
    await applyStockDelta(base44, {
      inventory_item_id: raw_item_id,
      qty_change_base_unit: -gross,
      transaction_type: 'Batch_Production_Debit',
      created_by: user.email,
      notes: 'Yield processing — raw input (' + gross + ' ' + unit + ')'
    });

    // 2. Credit processed stock
    await applyStockDelta(base44, {
      inventory_item_id: processed_item_id,
      qty_change_base_unit: net,
      transaction_type: 'Batch_Production_Credit',
      created_by: user.email,
      notes: 'Yield processing — net usable output (' + net + ' ' + (processed.base_unit || unit) + ')'
    });

    // 3. Waste ledger entry
    let wasteLogId = '';
    if (waste > 0) {
      const wasteLog = await base44.asServiceRole.entities.WasteLog.create({
        raw_item_id,
        processed_item_id,
        waste_weight: waste,
        unit,
        yield_percentage: yieldPct,
        notes: notes || 'Yield processing waste',
        created_by: user.email
      });
      wasteLogId = wasteLog.id;
    }

    // 4. Update processed item cost basis to effective unit cost
    await base44.asServiceRole.entities.InventoryItem.update(processed_item_id, {
      cost_per_base_unit: effectiveUnitCost,
      moving_average_cost: effectiveUnitCost
    });

    // 5. YieldConversion record
    const record = await base44.asServiceRole.entities.YieldConversion.create({
      raw_item_id,
      processed_item_id,
      gross_input_weight: roundQty(gross),
      net_usable_output_weight: roundQty(net),
      waste_weight: waste,
      yield_percentage: yieldPct,
      raw_unit_cost: rawUnitCost,
      effective_unit_cost: effectiveUnitCost,
      unit,
      notes: notes || '',
      created_by: user.email
    });
    if (wasteLogId) {
      await base44.asServiceRole.entities.WasteLog.update(wasteLogId, { yield_conversion_id: record.id });
    }

    return Response.json({
      success: true,
      yield_conversion_id: record.id,
      waste_weight: waste,
      yield_percentage: yieldPct,
      effective_unit_cost: effectiveUnitCost,
      raw_unit_cost: rawUnitCost
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}