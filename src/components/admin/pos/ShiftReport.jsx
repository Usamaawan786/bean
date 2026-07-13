import { format, formatDistanceStrict } from "date-fns";

const FONT = "'Courier New', Courier, monospace";
const money = (n) => `PKR ${Number(n || 0).toFixed(2)}`;

export default function ShiftReport({ shift, sales = [], entries = [] }) {
  const fs = 10;
  const fsSm = 8;
  const fsBrand = 14;
  const fsHead = 11;

  const row = (extra) => ({
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    width: "100%", margin: "1.2mm 0", fontFamily: FONT, fontSize: fs, color: "#000000", ...extra
  });
  const divider = { borderTop: "1px dashed #000000", margin: "2mm 0", width: "100%" };
  const solid = { borderTop: "2px solid #000000", margin: "1mm 0", width: "100%" };
  const section = { marginBottom: "3mm" };
  const heading = { fontFamily: FONT, fontSize: fsHead, fontWeight: 700, color: "#000000", marginBottom: "1mm" };

  const sum = (arr, key) => arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);
  const cashSales = sales.filter(s => s.payment_method === "Cash");
  const cardSales = sales.filter(s => s.payment_method === "Card");
  const compSales = sales.filter(s => s.payment_method === "Complimentary");

  const grossSales = sum(sales, "original_subtotal");
  const totalDiscounts = sum(sales, "discount_amount");
  const totalGst = sum(sales, "tax");
  const cashTotal = sum(cashSales, "total_amount");
  const cardTotal = sum(cardSales, "total_amount");
  const compValue = sum(compSales, "original_subtotal");

  const expenses = entries.filter(e => e.type === "expense");
  const pettyCash = entries.filter(e => e.type === "petty_cash");
  const totalExpenses = sum(expenses, "amount");
  const totalPettyCash = sum(pettyCash, "amount");

  const cashierMap = {};
  sales.forEach(s => {
    const key = s.cashier_name || s.cashier_email || "Unknown";
    if (!cashierMap[key]) cashierMap[key] = { count: 0, total: 0 };
    cashierMap[key].count += 1;
    cashierMap[key].total += Number(s.total_amount) || 0;
  });

  const opened = shift.opened_at ? new Date(shift.opened_at) : null;
  const closed = shift.closed_at ? new Date(shift.closed_at) : null;
  const duration = opened && closed ? formatDistanceStrict(closed, opened) : "—";

  const expectedDrawer = Number(shift.opening_float || 0) + cashTotal - totalPettyCash - totalExpenses;
  const closingFloat = Number(shift.closing_float || 0);
  const variance = shift.status === "closed" ? (closingFloat - expectedDrawer) : null;

  return (
    <div id="shift-report" style={{
      width: "80mm", padding: "3mm", background: "#ffffff", boxSizing: "border-box",
      fontFamily: FONT, color: "#000000", boxShadow: "0 4px 16px rgba(0,0,0,0.12)"
    }}>
      <div style={{ ...section, textAlign: "center" }}>
        <div style={{ fontFamily: FONT, fontSize: fsBrand, fontWeight: 700, letterSpacing: "1px" }}>Bean</div>
        <div style={{ fontFamily: FONT, fontSize: fs, fontWeight: 700 }}>Shift Report</div>
      </div>
      <div style={divider} />

      <div style={section}>
        <div style={row()}><span>Shift Type</span><span style={{ fontWeight: 700 }}>{shift.shift_type === "morning" ? "Morning" : "Evening"}</span></div>
        <div style={row()}><span>Opened By</span><span>{shift.opened_by_name || shift.opened_by}</span></div>
        <div style={row()}><span>Opened At</span><span>{opened ? format(opened, "MMM dd, HH:mm") : "—"}</span></div>
        <div style={row()}><span>Closed By</span><span>{shift.closed_by_name || "—"}</span></div>
        <div style={row()}><span>Closed At</span><span>{closed ? format(closed, "MMM dd, HH:mm") : "—"}</span></div>
        <div style={row()}><span>Duration</span><span>{duration}</span></div>
      </div>
      <div style={divider} />

      <div style={section}>
        <div style={heading}>Sales Summary</div>
        <div style={row()}><span>Transactions</span><span>{sales.length}</span></div>
        <div style={row()}><span>Gross Sales</span><span>{money(grossSales)}</span></div>
        <div style={row({ color: "#cc0000" })}><span>Discounts</span><span>- {money(totalDiscounts)}</span></div>
        <div style={row()}><span>GST</span><span>{money(totalGst)}</span></div>
        <div style={solid} />
        <div style={row()}><span>Cash ({cashSales.length})</span><span style={{ fontWeight: 700 }}>{money(cashTotal)}</span></div>
        <div style={row()}><span>Card ({cardSales.length})</span><span style={{ fontWeight: 700 }}>{money(cardTotal)}</span></div>
        <div style={row({ color: "#7c3aed" })}><span>Complimentary ({compSales.length})</span><span style={{ fontWeight: 700 }}>{money(compValue)} value</span></div>
      </div>
      <div style={divider} />

      <div style={section}>
        <div style={heading}>Per-Cashier</div>
        {Object.keys(cashierMap).length === 0 ? (
          <div style={{ fontFamily: FONT, fontSize: fsSm }}>No transactions</div>
        ) : Object.entries(cashierMap).map(([name, d]) => (
          <div key={name} style={row()}><span>{name} ({d.count})</span><span>{money(d.total)}</span></div>
        ))}
      </div>
      <div style={divider} />

      <div style={section}>
        <div style={heading}>Expenses</div>
        {expenses.length === 0 ? (
          <div style={{ fontFamily: FONT, fontSize: fsSm }}>None</div>
        ) : expenses.map(e => (
          <div key={e.id} style={row()}><span>{e.description} <span style={{ fontSize: fsSm, color: "#666" }}>({e.added_by_name || e.added_by})</span></span><span>{money(e.amount)}</span></div>
        ))}
        <div style={row({ fontWeight: 700 })}><span>Total Expenses</span><span>{money(totalExpenses)}</span></div>
      </div>
      <div style={divider} />

      <div style={section}>
        <div style={heading}>Petty Cash</div>
        {pettyCash.length === 0 ? (
          <div style={{ fontFamily: FONT, fontSize: fsSm }}>None</div>
        ) : pettyCash.map(e => (
          <div key={e.id} style={row()}><span>{e.category} <span style={{ fontSize: fsSm, color: "#666" }}>({e.added_by_name || e.added_by})</span></span><span>{money(e.amount)}</span></div>
        ))}
        <div style={row({ fontWeight: 700 })}><span>Total Petty Cash</span><span>{money(totalPettyCash)}</span></div>
      </div>
      <div style={divider} />

      <div style={section}>
        <div style={heading}>Cash Reconciliation</div>
        <div style={row()}><span>Opening Float</span><span>{money(shift.opening_float)}</span></div>
        <div style={row()}><span>+ Cash Sales</span><span>{money(cashTotal)}</span></div>
        <div style={row({ color: "#cc0000" })}><span>- Expenses</span><span>- {money(totalExpenses)}</span></div>
        <div style={row({ color: "#cc0000" })}><span>- Petty Cash</span><span>- {money(totalPettyCash)}</span></div>
        <div style={solid} />
        <div style={row({ fontWeight: 700 })}><span>Expected Drawer</span><span>{money(expectedDrawer)}</span></div>
        {shift.status === "closed" && (
          <>
            <div style={row()}><span>Actual Closing Float</span><span>{money(closingFloat)}</span></div>
            <div style={row({ fontWeight: 700, color: variance >= 0 ? "#15803d" : "#cc0000" })}>
              <span>Variance</span><span>{variance >= 0 ? "+" : ""}{money(variance)}</span>
            </div>
          </>
        )}
      </div>

      <div style={{ height: "6mm" }} />
    </div>
  );
}