import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { applyStockDelta, roundQty } from "../../shared/stockLedger.ts";

// Standalone waste logging: records disposal of a raw ingredient (spoilage,
// expiry, spill, etc.) that is NOT part of a yield-processing batch. Debits
// the waste weight from the raw item's stock (Waste_Log ledger entry) and
// writes a WasteLog record with the disposal reason so per-item yield
// percentages stay accurate.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'manager', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { raw_item_id, waste_weight, reason, notes } = body;
    if (!raw_item_id) {
      return Response.json({ error: 'raw_item_id is required' }, { status: 400 });
    }

    const waste = Number(waste_weight);
    if (!(waste > 0)) {
      return Response.json({ error: 'waste_weight must be greater than 0' }, { status: 400 });
    }

    const raw = await base44.asServiceRole.entities.InventoryItem.get(raw_item_id);
    if (!raw) return Response.json({ error: 'Raw item not found' }, { status: 404 });

    const unit = raw.base_unit || '';
    const reasonLabel = reason || 'Other';

    // 1. Debit the wasted quantity from stock
    await applyStockDelta(base44, {
      inventory_item_id: raw_item_id,
      qty_change_base_unit: -waste,
      transaction_type: 'Waste_Log',
      created_by: user.email,
      notes: 'Standalone waste — ' + reasonLabel + ' (' + waste + ' ' + unit + ')'
    });

    // 2. WasteLog record
    const record = await base44.asServiceRole.entities.WasteLog.create({
      raw_item_id,
      waste_weight: roundQty(waste),
      unit,
      reason: reasonLabel,
      notes: notes || '',
      created_by: user.email
    });

    return Response.json({
      success: true,
      waste_log_id: record.id,
      waste_weight: roundQty(waste),
      reason: reasonLabel
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}