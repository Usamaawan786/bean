import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { roundQty } from "../../shared/stockLedger.ts";

// Builds the EOD reconciliation matrix for a given PKT calendar day.
// Per item it derives: opening stock (from the previous locked sheet's actual
// closing, else back-calculated from current stock minus today's movements),
// purchases in, sales deductions, logged wastage (waste ledger + yield waste),
// and the theoretical closing stock. Transfers and actual closing are seeded
// from any existing draft/locked sheet for the day so the grid is editable.

const PKT_OFFSET = "+05:00";

function pktDayBounds(dateStr) {
  return {
    start: new Date(dateStr + "T00:00:00" + PKT_OFFSET),
    end: new Date(dateStr + "T23:59:59" + PKT_OFFSET)
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'manager', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { date } = await req.json();
    const today = date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
    const { start, end } = pktDayBounds(today);

    const [items, txs, wasteLogs, sheets] = await Promise.all([
      base44.asServiceRole.entities.InventoryItem.list("-name", 2000),
      base44.asServiceRole.entities.InventoryTransaction.list("-created_date", 5000),
      base44.asServiceRole.entities.WasteLog.list("-created_date", 1000),
      base44.asServiceRole.entities.EodReconciliation.list("-audit_date", 50)
    ]);

    // Previous locked sheet → opening stock source
    let prevLines = {};
    for (const s of sheets) {
      if (s.status === 'Locked' && s.audit_date < today) {
        for (const l of (s.lines || [])) prevLines[l.inventory_item_id] = l;
        break;
      }
    }
    const existing = sheets.find(s => s.audit_date === today);

    // Group today's transactions by item
    const txByItem = {};
    for (const tx of txs) {
      const d = new Date(tx.created_date);
      if (d < start || d > end) continue;
      (txByItem[tx.inventory_item_id] ||= []).push(tx);
    }
    // Yield waste (WasteLog entity) by raw item
    const wasteByItem = {};
    for (const w of wasteLogs) {
      const d = new Date(w.created_date);
      if (d < start || d > end) continue;
      wasteByItem[w.raw_item_id] = (wasteByItem[w.raw_item_id] || 0) + (w.waste_weight || 0);
    }

    const lines = items.map(item => {
      const unit = item.base_unit || '';
      const unitCost = item.moving_average_cost || item.cost_per_base_unit || 0;
      const itemTx = txByItem[item.id] || [];
      let purchases = 0, sales = 0, wasteTx = 0, sumToday = 0;
      for (const tx of itemTx) {
        sumToday += tx.qty_change_base_unit;
        if (tx.transaction_type === 'Purchase_Invoice') purchases += tx.qty_change_base_unit;
        else if (['Sales_Deduction', 'Modifier_Credit', 'Modifier_Debit'].includes(tx.transaction_type)) sales += tx.qty_change_base_unit;
        else if (tx.transaction_type === 'Waste_Log') wasteTx += tx.qty_change_base_unit;
      }
      const loggedWastage = Math.abs(wasteTx) + (wasteByItem[item.id] || 0);
      const salesDeductions = Math.abs(sales);

      let opening;
      if (prevLines[item.id] && typeof prevLines[item.id].actual_closing === 'number') {
        opening = prevLines[item.id].actual_closing;
      } else {
        opening = (item.current_stock_base_qty || 0) - sumToday;
      }

      const existingLine = existing?.lines?.find(l => l.inventory_item_id === item.id);
      const transfers_in = existingLine?.transfers_in || 0;
      const transfers_out = existingLine?.transfers_out || 0;
      const actual = existingLine?.actual_closing ?? roundQty(opening + purchases - salesDeductions - loggedWastage);

      const theoretical = roundQty(opening + purchases + transfers_in - transfers_out - salesDeductions - loggedWastage);
      const variance = roundQty(actual - theoretical);
      const financialLoss = Math.round(Math.abs(variance) * unitCost * 100) / 100;

      return {
        inventory_item_id: item.id,
        item_name: item.name,
        unit,
        opening_stock: roundQty(opening),
        purchases_in: roundQty(purchases),
        transfers_in: roundQty(transfers_in),
        transfers_out: roundQty(transfers_out),
        sales_deductions: roundQty(salesDeductions),
        logged_wastage: roundQty(loggedWastage),
        theoretical_closing: theoretical,
        actual_closing: roundQty(actual),
        variance,
        financial_loss_value: financialLoss,
        unit_cost: unitCost
      };
    });

    return Response.json({
      date: today,
      lines,
      locked: existing?.status === 'Locked',
      existing_id: existing?.id || null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}