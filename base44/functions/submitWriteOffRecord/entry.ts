import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { applyStockDelta, roundQty } from "../../shared/stockLedger.ts";

// Submits a Write-Off / spoilage record.
//  - Deducts each line's quantity_in_units from the corresponding InventoryItem
//    via an immutable Waste_Log inventory_transaction.
//  - Persists the WriteOffRecord (the financial expense ledger entry under to_account).
//  - Auto-generates a WO-###### document number if not supplied.

const ACCOUNTS = ["Spoilage", "Staff Consumption", "Expired", "Drop", "Other"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'manager', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const { date, storage, to_account, comment, lines } = body;
    if (!date || !to_account || !Array.isArray(lines) || lines.length === 0) {
      return Response.json({ error: 'date, to_account and lines[] are required' }, { status: 400 });
    }
    if (!ACCOUNTS.includes(to_account)) {
      return Response.json({ error: 'Invalid to_account' }, { status: 400 });
    }

    // Auto-generate doc number
    const existing = await base44.asServiceRole.entities.WriteOffRecord.list("-created_date", 500);
    const seq = (existing.length || 0) + 1;
    const doc_number = body.doc_number || `WO-${String(seq).padStart(6, '0')}`;

    let totalCost = 0;
    const processedLines = [];
    for (const l of lines) {
      const qty = roundQty(Number(l.quantity_in_units) || 0);
      if (qty <= 0) continue;
      const item = l.inventory_item_id
        ? await base44.asServiceRole.entities.InventoryItem.get(l.inventory_item_id)
        : null;
      const unitCost = item
        ? (item.moving_average_cost || item.cost_per_base_unit || 0)
        : (Number(l.unit_cost) || 0);
      const lineTotal = Math.round(qty * unitCost * 100) / 100;
      totalCost = Math.round((totalCost + lineTotal) * 100) / 100;

      if (item) {
        await applyStockDelta(base44, {
          inventory_item_id: item.id,
          qty_change_base_unit: -qty,
          transaction_type: 'Waste_Log',
          created_by: user.email,
          notes: `Write-off ${doc_number} → ${to_account}`
        });
      }
      processedLines.push({
        inventory_item_id: item?.id || "",
        item_name: item?.name || l.item_name || "",
        unit: item?.base_unit || l.unit || "",
        package_quantity: roundQty(Number(l.package_quantity) || 0),
        quantity_in_units: qty,
        unit_cost: unitCost,
        total_cost: lineTotal
      });
    }

    const record = await base44.asServiceRole.entities.WriteOffRecord.create({
      doc_number,
      date,
      storage: storage || "",
      to_account,
      comment: comment || "",
      lines: processedLines,
      total_cost: totalCost,
      posted: true,
      created_by: user.email,
      created_by_name: user.full_name || user.email
    });

    return Response.json({ success: true, doc_number, total_cost: totalCost, id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}