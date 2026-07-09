import { format } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────
// THE single receipt template. Rendered by:
//   • BillGenerator        → mode="preview"  (grey, centered, no auto-print)
//   • ThermalReceiptPage  → mode="print"    (white, flush, auto window.print())
//
// The ONLY differences allowed between modes are handled by the PARENT:
// outer background, outer margins, and automatic print behaviour.
// Everything below — logo, invoice no, items, totals, rewards, QR, footer,
// spacing, typography, alignment — comes from this one JSX tree.
//
// Pure inline styles, ZERO className — so Tailwind/global resets cannot
// collapse the flex layout in print mode. "mm" units render at 96dpi.
// ─────────────────────────────────────────────────────────────────────────

const FONT = "'Courier New', Courier, monospace";
const money = (n) => `PKR ${Number(n || 0).toFixed(2)}`;

export default function ReceiptTemplate({
  bill,
  qrCodeUrl,
  iosQrUrl,
  androidQrUrl,
  logoDataUrl,
  paperWidth = 80,
  onImageLoad,
  domId = "receipt",
}) {
  const pw = paperWidth === 58 ? 58 : 80;
  const is58 = pw === 58;
  const fs = is58 ? 9 : 11;
  const fsSm = is58 ? 7 : 9;
  const fsBrand = is58 ? 13 : 16;
  const fsGrand = is58 ? 12 : 14;
  const qrLg = is58 ? 110 : 150;
  const qrSm = is58 ? 78 : 100;
  const gstLabel = bill?.paymentMethod === "Card" ? "5%" : "17%";
  const pts = bill?.pointsToAward ?? Math.floor((bill?.subtotal || 0) / 100);

  // Inline style helpers
  const row = (extra) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    margin: "1.5mm 0",
    fontFamily: FONT,
    fontSize: fs,
    color: "#000000",
    ...extra,
  });
  const nowrap = { whiteSpace: "nowrap" };
  const divider = { borderTop: "1px dashed #000000", margin: "1.5mm 0", width: "100%" };
  const solid = { borderTop: "2px solid #000000", margin: "1mm 0", width: "100%" };
  const section = { marginBottom: "3mm" };
  const imgQr = (px) => ({ display: "block", width: px, height: px, margin: "1mm auto" });
  const imgApp = (px) => ({ display: "block", width: px, height: px, margin: "0 auto" });
  const label = { fontFamily: FONT, fontSize: fs, color: "#000000" };

  // Print mode tracks every image load to gate window.print(); preview ignores.
  const imgProps = onImageLoad ? { onLoad: onImageLoad, onError: onImageLoad } : {};

  return (
    <div id={domId} style={{
      width: `${pw}mm`,
      padding: "2mm 2mm 4mm",
      background: "#ffffff",
      boxSizing: "border-box",
      fontFamily: FONT,
      color: "#000000",
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    }}>
      {/* Store Header */}
      <div style={{ ...section, textAlign: "center" }}>
        {logoDataUrl && (
          <img src={logoDataUrl} alt="Bean" {...imgProps}
            style={{ display: "block", width: "14mm", height: "14mm", margin: "0 auto 1mm", objectFit: "contain" }} />
        )}
        <div style={{ fontFamily: FONT, fontSize: fsBrand, fontWeight: 700, letterSpacing: "1px", color: "#000000" }}>Bean</div>
        <div style={{ fontFamily: FONT, fontSize: fsSm, fontStyle: "italic", color: "#000000" }}>More than just coffee, it's a community!</div>
      </div>

      <div style={divider} />

      {/* Invoice Details */}
      <div style={section}>
        <div style={row()}><span>Invoice No.</span><span style={{ fontWeight: 700 }}>{bill?.billNumber}</span></div>
        <div style={row()}><span>Date</span><span>{bill?.date ? format(new Date(bill.date), "MMM dd, yyyy HH:mm") : ""}</span></div>
        {bill?.cashierName && <div style={row()}><span>Cashier</span><span>{bill.cashierName}</span></div>}
        {bill?.orderType && <div style={row()}><span>Order</span><span>{bill.orderType}</span></div>}
        {bill?.customerInfo?.name && <div style={row()}><span>Customer</span><span>{bill.customerInfo.name}</span></div>}
        {bill?.customerInfo?.phone && <div style={row()}><span>Phone</span><span>{bill.customerInfo.phone}</span></div>}
      </div>

      <div style={divider} />

      {/* Items */}
      <div style={section}>
        {bill?.items?.map((item, i) => (
          <div key={i} style={{ marginBottom: "1.5mm" }}>
            <div style={{ fontFamily: FONT, fontSize: fs, fontWeight: 700, color: "#000000", wordWrap: "break-word", overflowWrap: "break-word" }}>
              {item.name}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", fontFamily: FONT, fontSize: fsSm, color: "#000000" }}>
              <span>{item.quantity} x {money(item.price)}</span>
              <span style={{ ...nowrap, fontWeight: 700 }}>{money(Number(item.price) * item.quantity)}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={divider} />

      {/* Totals */}
      <div style={section}>
        {bill?.discountPct > 0 ? (
          <>
            <div style={row()}><span>Subtotal</span><span style={nowrap}>{money(bill.originalSubtotal ?? bill.subtotal)}</span></div>
            <div style={row({ color: "#cc0000" })}>
              <span>Discount ({bill.discountPct}%)</span>
              <span style={nowrap}>- {money(bill.discountAmount)}</span>
            </div>
          </>
        ) : (
          <div style={row()}><span>Subtotal</span><span style={nowrap}>{money(bill?.subtotal)}</span></div>
        )}
        <div style={row()}><span>GST ({gstLabel})</span><span style={nowrap}>{money(bill?.tax)}</span></div>
        <div style={solid} />
        <div style={row({ fontSize: fsGrand, fontWeight: 700 })}>
          <span>TOTAL</span>
          <span style={nowrap}>{money(bill?.total)}</span>
        </div>
      </div>

      <div style={divider} />

      {/* Rewards + Payment */}
      <div style={section}>
        <div style={row()}><span>Reward Points</span><span style={{ fontWeight: 700 }}>{pts} pts</span></div>
        <div style={row()}><span>Payment</span><span>{bill?.paymentMethod}</span></div>
      </div>

      {/* Rewards QR */}
      {qrCodeUrl && (
        <>
          <div style={divider} />
          <div style={{ ...section, textAlign: "center" }}>
            <div style={{ fontFamily: FONT, fontSize: fs, fontWeight: 700, color: "#000000" }}>Earn Rewards</div>
            <img src={qrCodeUrl} alt="Rewards QR" {...imgProps} style={imgQr(qrLg)} />
            <div style={{ fontFamily: FONT, fontSize: fsSm, color: "#000000" }}>Scan in the Bean Pakistan App to add points</div>
            {bill?.qrCodeId && (
              <>
                <div style={{ fontFamily: FONT, fontSize: fsSm, color: "#000000" }}>or enter code manually:</div>
                <div style={{ fontFamily: FONT, fontSize: fs, fontWeight: 700, letterSpacing: "1px", wordBreak: "break-all", color: "#000000" }}>{bill.qrCodeId}</div>
              </>
            )}
          </div>
        </>
      )}

      <div style={divider} />

      {/* App Download QRs */}
      <div style={{ ...section, textAlign: "center" }}>
        <div style={{ fontFamily: FONT, fontSize: fs, fontWeight: 700, color: "#000000" }}>Download the Bean app</div>
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: "1mm" }}>
          <div style={{ textAlign: "center" }}>
            {iosQrUrl && <img src={iosQrUrl} alt="iOS" {...imgProps} style={imgApp(qrSm)} />}
            <div style={{ fontFamily: FONT, fontSize: fsSm, color: "#000000" }}>iOS</div>
          </div>
          <div style={{ textAlign: "center" }}>
            {androidQrUrl && <img src={androidQrUrl} alt="Android" {...imgProps} style={imgApp(qrSm)} />}
            <div style={{ fontFamily: FONT, fontSize: fsSm, color: "#000000" }}>Android</div>
          </div>
        </div>
      </div>

      <div style={divider} />

      {/* Footer */}
      <div style={{ textAlign: "center" }}>
        <div style={label}>Thank you for your purchase!</div>
        <div style={{ fontFamily: FONT, fontSize: fsSm, color: "#000000" }}>Bean — More than just coffee, it's a community!</div>
        <div style={{ height: "6mm" }} />
      </div>
    </div>
  );
}