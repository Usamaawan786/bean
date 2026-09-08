import { utcToPktDisplay } from "@/lib/pktTime";

const FONT = "'Courier New', Courier, monospace";
const money = (n) => `PKR ${Number(n || 0).toFixed(2)}`;

// Printable thermal Discounts Report — mirrors ShiftReport styling so it
// prints the same way on the receipt printer.
export default function DiscountsReport({ reportDate, sales = [] }) {
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

  const totalDiscount = sales.reduce((s, x) => s + (Number(x.discount_amount) || 0), 0);
  const totalOriginal = sales.reduce((s, x) => s + (Number(x.original_subtotal) || 0), 0);
  const totalFinal = sales.reduce((s, x) => s + (Number(x.subtotal) || 0), 0);
  const billDiscounts = sales.filter(s => (Number(s.discount_pct) || 0) > 0);
  const itemDiscounts = sales.filter(s => (s.items || []).some(i => (Number(i.item_discount_pct) || 0) > 0));

  const cashierMap = {};
  sales.forEach(s => {
    const key = s.cashier_name || s.cashier_email || "Unknown";
    if (!cashierMap[key]) cashierMap[key] = { count: 0, amount: 0 };
    cashierMap[key].count += 1;
    cashierMap[key].amount += Number(s.discount_amount) || 0;
  });

  return (
    <div id="discounts-report" style={{
      width: "80mm", padding: "3mm", background: "#ffffff", boxSizing: "border-box",
      fontFamily: FONT, color: "#000000", boxShadow: "0 4px 16px rgba(0,0,0,0.12)"
    }}>
      <div style={{ ...section, textAlign: "center" }}>
        <div style={{ fontFamily: FONT, fontSize: fsBrand, fontWeight: 700, letterSpacing: "1px" }}>Bean</div>
        <div style={{ fontFamily: FONT, fontSize: fs, fontWeight: 700 }}>Discounts Report</div>
        <div style={{ fontFamily: FONT, fontSize: fsSm }}>{reportDate} (PKT)</div>
      </div>
      <div style={divider} />

      <div style={section}>
        <div style={heading}>Summary</div>
        <div style={row()}><span>Discounted Bills</span><span>{sales.length}</span></div>
        <div style={row()}><span>Bill-Level Discounts</span><span>{billDiscounts.length}</span></div>
        <div style={row()}><span>Item-Level Discounts</span><span>{itemDiscounts.length}</span></div>
        <div style={solid} />
        <div style={row()}><span>Gross (pre-discount)</span><span>{money(totalOriginal)}</span></div>
        <div style={row({ color: "#cc0000" })}><span>Total Discounts</span><span>- {money(totalDiscount)}</span></div>
        <div style={row({ fontWeight: 700 })}><span>Net (post-discount)</span><span>{money(totalFinal)}</span></div>
      </div>
      <div style={divider} />

      <div style={section}>
        <div style={heading}>Per-Cashier</div>
        {Object.keys(cashierMap).length === 0 ? (
          <div style={{ fontFamily: FONT, fontSize: fsSm }}>No discounts</div>
        ) : Object.entries(cashierMap).map(([name, d]) => (
          <div key={name} style={row()}><span>{name} ({d.count})</span><span>{money(d.amount)}</span></div>
        ))}
      </div>
      <div style={divider} />

      <div style={section}>
        <div style={heading}>Discount Log</div>
        {sales.length === 0 ? (
          <div style={{ fontFamily: FONT, fontSize: fsSm }}>No discounts on this date</div>
        ) : sales.map(s => {
          const itemDisc = (s.items || []).some(i => (Number(i.item_discount_pct) || 0) > 0);
          const billDisc = (Number(s.discount_pct) || 0) > 0;
          return (
            <div key={s.id} style={{ marginBottom: "2mm" }}>
              <div style={row({ fontWeight: 700 })}>
                <span>{s.bill_number}</span>
                <span style={{ fontSize: fsSm }}>{utcToPktDisplay(s.created_date)}</span>
              </div>
              <div style={row()}>
                <span style={{ fontSize: fsSm }}>Cashier: {s.cashier_name || s.cashier_email || "—"}</span>
                <span style={{ fontSize: fsSm }}>{s.customer_name || "Walk-in"}</span>
              </div>
              <div style={row({ color: "#cc0000" })}>
                <span style={{ fontSize: fsSm }}>
                  {billDisc ? `Bill -${s.discount_pct}%` : ""}{billDisc && itemDisc ? " · " : ""}{itemDisc ? "Item discounts" : ""}
                </span>
                <span style={{ fontWeight: 700 }}>- {money(s.discount_amount)}</span>
              </div>
              <div style={row()}>
                <span style={{ fontSize: fsSm }}>Gross {money(s.original_subtotal)}</span>
                <span style={{ fontSize: fsSm }}>Net {money(s.subtotal)}</span>
              </div>
              <div style={{ ...divider, margin: "1mm 0" }} />
            </div>
          );
        })}
      </div>

      <div style={{ height: "6mm" }} />
    </div>
  );
}