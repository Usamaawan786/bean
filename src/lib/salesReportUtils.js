// Daily sales report helpers — all timestamps in Pakistan Standard Time (PKT = UTC+5).

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

// Stored timestamps are naive UTC strings ("2026-11-17T19:03:06.993000").
// Normalise to something Date() can parse on every engine.
export function parseUtcMs(value) {
  if (!value) return NaN;
  let s = String(value).trim();
  if (!/Z$|[+-]\d\d:?\d\d$/.test(s)) s += "Z";
  s = s.replace(/(\.\d{3})\d+/, "$1");
  return new Date(s).getTime();
}

// UTC ms → PKT calendar key "YYYY-MM-DD"
export function pktDateKey(ms) {
  return new Date(ms + PKT_OFFSET_MS).toISOString().slice(0, 10);
}

// Yesterday's PKT calendar key
export function yesterdayPktKey() {
  return pktDateKey(Date.now() - 24 * 60 * 60 * 1000);
}

// A PKT calendar day as a UTC range, in the format the stored timestamps use.
export function pktDayRangeUtc(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const startMs = Date.UTC(y, m - 1, d) - PKT_OFFSET_MS;
  return {
    startUtc: new Date(startMs).toISOString(),
    endUtc: new Date(startMs + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// "6:03 PM" in PKT
export function saleTimePkt(value) {
  const ms = parseUtcMs(value);
  if (Number.isNaN(ms)) return "—";
  const pkt = new Date(ms + PKT_OFFSET_MS);
  const h24 = pkt.getUTCHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = String(pkt.getUTCMinutes()).padStart(2, "0");
  return `${h12}:${mm} ${h24 < 12 ? "AM" : "PM"}`;
}

// "18 Nov 2026" in PKT
export function pktDateLong(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

export function fmtPKR(n) {
  return "Rs " + Number(n || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function lineTotal(item) {
  return Number(item.quantity || 0) * Number(item.price || 0);
}

export function methodKey(method) {
  return String(method || "Cash").toLowerCase().replace(/[^a-z]/g, "");
}

export function summarize(sales) {
  const list = sales || [];
  let total = 0;
  let items = 0;
  const byMethod = {};
  for (const s of list) {
    const amount = Number(s.total_amount || 0);
    total += amount;
    const key = s.payment_method || "Cash";
    byMethod[key] = byMethod[key] || { count: 0, total: 0 };
    byMethod[key].count += 1;
    byMethod[key].total += amount;
    for (const i of s.items || []) items += Number(i.quantity || 0);
  }
  return {
    bills: list.length,
    total,
    items,
    average: list.length ? total / list.length : 0,
    byMethod,
  };
}

function csvEscape(val) {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

// One row per sold item, so the manager can filter by product in Excel.
export function buildItemCsv(sales, dateStr) {
  const lines = [];
  lines.push("Bean Coffee — Daily Sales Report");
  lines.push(`Date,${pktDateLong(dateStr)} (PKT)`);
  lines.push(`Generated,${new Date().toLocaleString("en-PK")}`);
  lines.push("");
  lines.push(
    "Bill Number,Date,Time (PKT),Item,Quantity,Unit Price (PKR),Line Total (PKR),Bill Total (PKR),Payment Method,Customer,Order Type,Cashier"
  );
  for (const s of sales) {
    const billTotal = Number(s.total_amount || 0);
    const items = s.items || [];
    if (!items.length) {
      lines.push(
        [s.bill_number, dateStr, saleTimePkt(s.created_date), "(no items)", 0, 0, 0, billTotal, s.payment_method, s.customer_name || "", s.order_type || "", s.cashier_name || ""]
          .map(csvEscape)
          .join(",")
      );
      continue;
    }
    for (const i of items) {
      lines.push(
        [
          s.bill_number,
          dateStr,
          saleTimePkt(s.created_date),
          i.product_name,
          i.quantity,
          Number(i.price || 0).toFixed(2),
          lineTotal(i).toFixed(2),
          billTotal.toFixed(2),
          s.payment_method,
          s.customer_name || "",
          s.order_type || "",
          s.cashier_name || "",
        ]
          .map(csvEscape)
          .join(",")
      );
    }
  }
  return "\uFEFF" + lines.join("\n");
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Printable document: every bill with its items, prices and time.
export function printSalesReport(sales, dateStr, summary) {
  const win = window.open("", "_blank");
  if (!win) return;
  const esc = (v) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const money = (n) => Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 });

  let billsHtml = "";
  for (const s of sales) {
    const items = s.items || [];
    const rows = items
      .map(
        (i) => `<tr>
          <td>${esc(i.product_name)}</td>
          <td style="text-align:center">${Number(i.quantity || 0)}</td>
          <td style="text-align:right">${money(i.price)}</td>
          <td style="text-align:right">${money(lineTotal(i))}</td>
        </tr>`
      )
      .join("");
    billsHtml += `<div class="bill">
      <div class="bill-head">
        <span class="bill-no">${esc(s.bill_number)}</span>
        <span class="bill-meta">${saleTimePkt(s.created_date)} &middot; ${esc(s.payment_method || "Cash")}${s.customer_name ? " &middot; " + esc(s.customer_name) : ""}${s.table_number ? " &middot; Table " + esc(s.table_number) : ""}</span>
        <span class="bill-total">${money(s.total_amount)}</span>
      </div>
      <table>
        <thead><tr><th>Item</th><th style="text-align:center;width:60px">Qty</th><th style="text-align:right;width:100px">Unit Price</th><th style="text-align:right;width:100px">Amount</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" style="color:#999">No line items recorded</td></tr>'}</tbody>
      </table>
    </div>`;
  }

  const methodRows = Object.entries(summary.byMethod)
    .map(
      ([method, v]) =>
        `<tr><td>${esc(method)}</td><td style="text-align:center">${v.count}</td><td style="text-align:right">${money(v.total)}</td></tr>`
    )
    .join("");

  win.document.write(`<!DOCTYPE html><html><head><title>Bean Coffee — Daily Sales ${dateStr}</title>
  <style>
    * { font-family: Arial, Helvetica, sans-serif; box-sizing: border-box; }
    body { color: #5C4A3A; margin: 0; padding: 36px; }
    .header { text-align: center; border-bottom: 3px solid #8B7355; padding-bottom: 18px; margin-bottom: 24px; }
    .header h1 { font-size: 26px; margin: 0 0 6px; }
    .header p { color: #8B7355; font-size: 13px; margin: 3px 0; }
    h2 { font-size: 14px; border-bottom: 1px solid #E8DED8; padding-bottom: 5px; margin: 26px 0 10px; text-transform: uppercase; letter-spacing: 0.6px; }
    .stats { display: flex; gap: 12px; }
    .stat { flex: 1; border: 1px solid #E8DED8; border-radius: 10px; padding: 10px 12px; background: #FAF7F3; }
    .stat b { display: block; font-size: 16px; margin-top: 3px; }
    .stat span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #8B7355; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #F3ECE4; text-align: left; padding: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 5px 6px; border-bottom: 1px solid #F0EBE5; }
    .bill { border: 1px solid #E8DED8; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; page-break-inside: avoid; }
    .bill-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
    .bill-no { font-weight: 700; font-size: 12px; }
    .bill-meta { font-size: 11px; color: #8B7355; flex: 1; }
    .bill-total { font-weight: 700; font-size: 12px; }
    .grand { margin-top: 18px; border-top: 2px solid #8B7355; padding-top: 10px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; }
    .note { font-size: 10px; color: #999; text-align: center; margin-top: 22px; }
    @media print { body { padding: 16px; } .no-print { display: none; } }
  </style></head><body>
  <button class="no-print" onclick="window.print()" style="background:#5C4A3A;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;margin-bottom:18px;">Print / Save as PDF</button>
  <div class="header">
    <h1>Bean Coffee</h1>
    <p><strong>Daily Sales Report</strong></p>
    <p>${pktDateLong(dateStr)} (PKT)</p>
    <p>Generated ${esc(new Date().toLocaleString("en-PK"))}</p>
  </div>
  <div class="stats">
    <div class="stat"><span>Total Sales</span><b>Rs ${money(summary.total)}</b></div>
    <div class="stat"><span>Bills</span><b>${summary.bills}</b></div>
    <div class="stat"><span>Items Sold</span><b>${summary.items}</b></div>
    <div class="stat"><span>Average Bill</span><b>Rs ${money(summary.average)}</b></div>
  </div>
  <h2>Payment Breakdown</h2>
  <table>
    <thead><tr><th>Payment Method</th><th style="text-align:center">Bills</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${methodRows}</tbody>
  </table>
  <h2>All Transactions (${sales.length})</h2>
  ${billsHtml}
  <div class="grand"><span>TOTAL</span><span>Rs ${money(summary.total)}</span></div>
  <p class="note">All times are Pakistan Standard Time. Amounts include applicable GST.</p>
  </body></html>`);
  win.document.close();
}