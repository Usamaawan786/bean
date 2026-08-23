import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { applyStockDelta } from "../../shared/stockLedger.ts";

// Locks & submits the nightly EOD reconciliation.
//  - Writes immutable Manual_Audit_Adjustment ledger entries for every non-zero
//    variance (this also rolls today's actual closing into tomorrow's opening stock).
//  - Persists an immutable EodReconciliation sheet (status = Locked).
//  - If a sheet for the day is already Locked, a Manager PIN override is required
//    to re-submit; otherwise editing is blocked.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'manager', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { date, lines, notes, manager_pin } = await req.json();
    if (!date || !Array.isArray(lines) || lines.length === 0) {
      return Response.json({ error: 'date and lines[] are required' }, { status: 400 });
    }

    // Manager PIN is stored as a secret so it never appears in source code.
    const expectedPin = Deno.env.get('MANAGER_PIN');
    const sheets = await base44.asServiceRole.entities.EodReconciliation.list("-audit_date", 50);
    const existing = sheets.find(s => s.audit_date === date);
    if (existing && existing.status === 'Locked') {
      if (!expectedPin) {
        return Response.json({ error: 'MANAGER_PIN not configured' }, { status: 500 });
      }
      if (manager_pin !== expectedPin) {
        return Response.json({ error: 'Sheet is locked. Manager PIN override required to re-submit.' }, { status: 403 });
      }
    }

    let totalLoss = 0;
    let surplusAmount = 0;
    let shortageAmount = 0;
    for (const l of lines) {
      totalLoss += l.financial_loss_value || 0;
      const amt = Math.abs(l.variance || 0) * (l.unit_cost || 0);
      if ((l.variance || 0) > 0) surplusAmount += amt;
      else if ((l.variance || 0) < 0) shortageAmount += amt;
      if (l.variance && Math.abs(l.variance) > 0.0001) {
        await applyStockDelta(base44, {
          inventory_item_id: l.inventory_item_id,
          qty_change_base_unit: l.variance,
          transaction_type: 'Manual_Audit_Adjustment',
          created_by: user.email,
          notes: `EOD reconciliation ${date} — variance adjustment`
        });
      }
    }
    totalLoss = Math.round(totalLoss * 100) / 100;

    const payload = {
      audit_date: date,
      status: 'Locked',
      lines,
      surplus_amount: Math.round(surplusAmount * 100) / 100,
      shortage_amount: Math.round(shortageAmount * 100) / 100,
      total_financial_loss: totalLoss,
      locked_by: user.email,
      locked_at: new Date().toISOString(),
      notes: notes || ''
    };

    let sheetId;
    if (existing) {
      await base44.asServiceRole.entities.EodReconciliation.update(existing.id, payload);
      sheetId = existing.id;
    } else {
      const rec = await base44.asServiceRole.entities.EodReconciliation.create(payload);
      sheetId = rec.id;
    }

    return Response.json({ success: true, sheet_id: sheetId, total_financial_loss: totalLoss });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}