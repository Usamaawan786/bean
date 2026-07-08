import { format } from "date-fns";

// @media print stylesheet injected when the BillGenerator modal mounts.
// Hides all modal chrome and shows only the #thermal-receipt div, sized for
// 80mm thermal paper with zero margins and monochrome output.
export function ThermalPrintStyles() {
  return (
    <style>{`
      .thermal-print-root { display: none; }

      @media print {
        @page { size: 80mm auto; margin: 0; }
        html, body {
          width: 80mm;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        /* Hide everything in the app except the thermal receipt */
        body * { visibility: hidden; }
        .thermal-print-root, .thermal-print-root * { visibility: visible; }
        .thermal-print-root {
          display: block;
          position: absolute;
          left: 0;
          top: 0;
          width: 80mm;
          margin: 0;
          padding: 0;
        }

        .thermal-receipt {
          width: 72mm;
          margin: 0 auto;
          padding: 4mm 2mm;
          background: #ffffff;
          color: #000000;
          font-family: "Courier New", monospace;
          font-size: 8pt;
          line-height: 1.2;
          page-break-inside: avoid;
          orphans: 999;
          widows: 999;
        }
        .th-center { text-align: center; }
        .th-bold { font-weight: 700; }
        .th-small { font-size: 7pt; }
        .th-section-label { font-weight: 700; margin: 1mm 0; }

        .th-logo {
          display: block;
          width: 20mm;
          height: 20mm;
          margin: 0 auto 1mm;
          object-fit: contain;
        }
        .th-brand { font-size: 12pt; font-weight: 700; letter-spacing: 1px; }
        .th-tagline { font-size: 7pt; font-style: italic; }

        .th-divider {
          border-top: 1px dashed #000;
          margin: 1.5mm 0;
        }
        .th-solid {
          border-top: 2px solid #000;
          margin: 1mm 0;
        }
        .th-feed { height: 8mm; }

        .th-row {
          display: flex;
          justify-content: space-between;
          margin: 0.3mm 0;
        }
        .th-col-header {
          display: flex;
          margin: 0.5mm 0;
        }
        .th-qty { width: 10mm; text-align: center; }
        .th-price { width: 20mm; text-align: right; }
        .th-total { width: 24mm; text-align: right; }

        .th-item { margin: 0.5mm 0; }
        .th-item-line {
          display: flex;
          font-size: 7.5pt;
        }

        .th-grand {
          font-size: 11pt;
          font-weight: 700;
          margin: 1mm 0;
        }

        .th-qr {
          display: block;
          width: 40mm;
          height: 40mm;
          margin: 1mm auto;
        }
        .th-qr-row {
          display: flex;
          justify-content: center;
          gap: 4mm;
        }
        .th-qr-cell { text-align: center; }
        .th-qr-sm {
          display: block;
          width: 28mm;
          height: 28mm;
          margin: 0 auto;
        }
      }
    `}</style>
  );
}

// Print-only thermal receipt layout (72mm / 80mm paper). Renders as a hidden
// div that the @media print stylesheet shows when window.print() is called.
// Layout-only utilities here — no colours, shadows, or rounded corners since
// thermal printers are monochrome.
export default function ThermalReceipt({ bill, qrCodeUrl, iosQrUrl, androidQrUrl, logoUrl }) {
  const pts = bill.pointsToAward ?? Math.floor(bill.subtotal / 100);
  const gstLabel = bill.paymentMethod === "Card" ? "5%" : "17%";

  return (
    <div id="thermal-receipt" className="thermal-receipt">
      {/* Header */}
      <div className="th-center">
        <img src={logoUrl} alt="Bean" className="th-logo" />
        <div className="th-brand">BEAN</div>
        <div className="th-tagline">More than just coffee, it's a community!</div>
      </div>

      <div className="th-divider" />

      {/* Invoice info */}
      <div className="th-row">
        <span>Invoice No.</span>
        <span className="th-bold">{bill.billNumber}</span>
      </div>
      <div className="th-row">
        <span>Date</span>
        <span>{format(new Date(bill.date), "MMM dd, yyyy HH:mm")}</span>
      </div>
      {bill.customerInfo?.name && (
        <div className="th-row">
          <span>Customer</span>
          <span>{bill.customerInfo.name}</span>
        </div>
      )}
      {bill.customerInfo?.phone && (
        <div className="th-row">
          <span>Phone</span>
          <span>{bill.customerInfo.phone}</span>
        </div>
      )}

      <div className="th-divider" />

      {/* Items */}
      <div className="th-col-header">
        <span className="th-bold">Item</span>
        <span className="th-bold th-qty">Qty</span>
        <span className="th-bold th-price">Price</span>
        <span className="th-bold th-total">Total</span>
      </div>
      <div className="th-divider" />
      {bill.items.map((item, index) => (
        <div key={index} className="th-item">
          <div className="th-item-name">{item.name}</div>
          <div className="th-item-line">
            <span className="th-qty">{item.quantity}</span>
            <span className="th-price">PKR {item.price.toFixed(2)}</span>
            <span className="th-total th-bold">PKR {(item.price * item.quantity).toFixed(2)}</span>
          </div>
        </div>
      ))}

      <div className="th-divider" />

      {/* Totals */}
      {bill.discountPct > 0 ? (
        <>
          <div className="th-row">
            <span>Subtotal</span>
            <span>PKR {(bill.originalSubtotal ?? bill.subtotal).toFixed(2)}</span>
          </div>
          <div className="th-row">
            <span>Discount ({bill.discountPct}%)</span>
            <span>- PKR {(bill.discountAmount ?? 0).toFixed(2)}</span>
          </div>
        </>
      ) : (
        <div className="th-row">
          <span>Subtotal</span>
          <span>PKR {bill.subtotal.toFixed(2)}</span>
        </div>
      )}
      <div className="th-row">
        <span>GST ({gstLabel})</span>
        <span>PKR {bill.tax.toFixed(2)}</span>
      </div>

      <div className="th-solid" />
      <div className="th-row th-grand">
        <span>TOTAL</span>
        <span>PKR {bill.total.toFixed(2)}</span>
      </div>

      <div className="th-divider" />

      {/* Reward points */}
      <div className="th-row">
        <span>Reward Points Earned</span>
        <span className="th-bold">{pts} pts</span>
      </div>

      {/* Rewards QR */}
      {qrCodeUrl && (
        <>
          <div className="th-divider" />
          <div className="th-center th-section-label">Earn Rewards</div>
          <img src={qrCodeUrl} alt="Rewards QR" className="th-qr" />
          <div className="th-center th-small">
            Scan in the Bean Pakistan App to add points
          </div>
          {bill.qrCodeId && (
            <>
              <div className="th-center th-small">or enter code manually:</div>
              <div className="th-center th-bold" style={{ fontSize: "9pt", letterSpacing: "1px", wordBreak: "break-all" }}>
                {bill.qrCodeId}
              </div>
            </>
          )}
        </>
      )}

      {/* App download */}
      <div className="th-divider" />
      <div className="th-center th-section-label">
        Don't have the app? Download &amp; scan
      </div>
      <div className="th-qr-row">
        <div className="th-qr-cell">
          {iosQrUrl && <img src={iosQrUrl} alt="iOS" className="th-qr-sm" />}
          <div className="th-center th-small">iOS</div>
        </div>
        <div className="th-qr-cell">
          {androidQrUrl && <img src={androidQrUrl} alt="Android" className="th-qr-sm" />}
          <div className="th-center th-small">Android</div>
        </div>
      </div>

      <div className="th-divider" />
      <div className="th-center">Thank you for your purchase!</div>
      <div className="th-center th-small">Bean — More than just coffee, it's a community!</div>
      <div className="th-feed" />
    </div>
  );
}