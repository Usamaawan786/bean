import { useEffect, useState } from "react";
import { format } from "date-fns";

// Standalone thermal receipt page opened in a new tab by BillGenerator.
// Reads bill data + assets (all base64) from sessionStorage and auto-prints.
// No layout, no nav — just the receipt HTML + print CSS.

function readData() {
  try {
    const raw = sessionStorage.getItem("thermalReceiptData");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export default function ThermalReceiptPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const d = readData();
    setData(d || {});
    // Give the DOM a tick to paint the base64 images before invoking print.
    const t = setTimeout(() => {
      try {
        window.print();
      } catch (e) {}
      // Close after the print dialog is dismissed/handled.
      const c = setTimeout(() => {
        try { window.close(); } catch (e) {}
      }, 500);
    }, 350);
    return () => clearTimeout(t);
  }, []);

  if (!data) {
    return <div style={{ padding: 20, fontFamily: "monospace" }}>Loading receipt…</div>;
  }

  const { bill, qrCodeUrl, iosQrUrl, androidQrUrl, logoDataUrl, paperWidth } = data;
  const pw = paperWidth || 80;          // mm
  const cw = pw - 8;                      // content width mm
  const gstLabel = bill?.paymentMethod === "Card" ? "5%" : "17%";
  const pts = bill?.pointsToAward ?? Math.floor(bill?.subtotal / 100);

  const css = `
    @page { size: ${pw}mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0; background: #ffffff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    body { font-family: "Courier New", monospace; color: #000000; }
    #receipt {
      width: ${cw}mm;
      margin: 0 auto;
      padding: 4mm 2mm;
      font-size: 8pt;
      line-height: 1.25;
    }
    .c { text-align: center; }
    .b { font-weight: 700; }
    .sm { font-size: 7pt; }
    .logo { display:block; width:18mm; height:18mm; margin:0 auto 1mm; object-fit:contain; }
    .brand { font-size:12pt; font-weight:700; letter-spacing:1px; }
    .tagline { font-size:7pt; font-style:italic; }
    .dashed { border-top:1px dashed #000; margin:1.5mm 0; }
    .solid { border-top:2px solid #000; margin:1mm 0; }
    .feed { height: 8mm; }
    .row { display:flex; justify-content:space-between; margin:0.3mm 0; }
    .head { display:flex; margin:0.5mm 0; }
    .qcol { width:10mm; text-align:center; }
    .pcol { width:20mm; text-align:right; }
    .tcol { width:24mm; text-align:right; }
    .iname { margin:0.5mm 0; }
    .iline { display:flex; font-size:7.5pt; }
    .grand { font-size:11pt; font-weight:700; margin:1mm 0; }
    .qr { display:block; width:36mm; height:36mm; margin:1mm auto; }
    .qrrow { display:flex; justify-content:center; gap:4mm; }
    .qcell { text-align:center; }
    .qrsm { display:block; width:24mm; height:24mm; margin:0 auto; }
    .code { font-size:9pt; letter-spacing:1px; word-break:break-all; }
  `;

  return (
    <>
      <style>{css}</style>
      <div id="receipt">
        {/* Header */}
        <div className="c">
          {logoDataUrl && <img src={logoDataUrl} alt="Bean" className="logo" />}
          <div className="brand">BEAN</div>
          <div className="tagline">More than just coffee, it's a community!</div>
        </div>

        <div className="dashed" />

        {/* Invoice info */}
        <div className="row"><span>Invoice No.</span><span className="b">{bill?.billNumber}</span></div>
        <div className="row"><span>Date</span><span>{bill?.date ? format(new Date(bill.date), "MMM dd, yyyy HH:mm") : ""}</span></div>
        {bill?.cashierName && (
          <div className="row"><span>Cashier</span><span>{bill.cashierName}</span></div>
        )}
        {bill?.orderType && (
          <div className="row"><span>Order</span><span>{bill.orderType}</span></div>
        )}
        {bill?.customerInfo?.name && (
          <div className="row"><span>Customer</span><span>{bill.customerInfo.name}</span></div>
        )}
        {bill?.customerInfo?.phone && (
          <div className="row"><span>Phone</span><span>{bill.customerInfo.phone}</span></div>
        )}

        <div className="dashed" />

        {/* Items */}
        <div className="head">
          <span className="b">Item</span>
          <span className="b qcol">Qty</span>
          <span className="b pcol">Price</span>
          <span className="b tcol">Total</span>
        </div>
        <div className="dashed" />
        {bill?.items?.map((item, i) => (
          <div key={i}>
            <div className="iname">{item.name}</div>
            <div className="iline">
              <span className="qcol">{item.quantity}</span>
              <span className="pcol">PKR {Number(item.price).toFixed(2)}</span>
              <span className="tcol b">PKR {(Number(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          </div>
        ))}

        <div className="dashed" />

        {/* Totals */}
        {bill?.discountPct > 0 ? (
          <>
            <div className="row"><span>Subtotal</span><span>PKR {(bill.originalSubtotal ?? bill.subtotal).toFixed(2)}</span></div>
            <div className="row"><span>Discount ({bill.discountPct}%)</span><span>- PKR {(bill.discountAmount ?? 0).toFixed(2)}</span></div>
          </>
        ) : (
          <div className="row"><span>Subtotal</span><span>PKR {bill?.subtotal?.toFixed(2)}</span></div>
        )}
        <div className="row"><span>GST ({gstLabel})</span><span>PKR {bill?.tax?.toFixed(2)}</span></div>

        <div className="solid" />
        <div className="row grand"><span>TOTAL</span><span>PKR {bill?.total?.toFixed(2)}</span></div>

        <div className="dashed" />

        {/* Reward points */}
        <div className="row"><span>Reward Points Earned</span><span className="b">{pts} pts</span></div>
        <div className="row"><span>Payment</span><span>{bill?.paymentMethod}</span></div>

        {/* Rewards QR */}
        {qrCodeUrl && (
          <>
            <div className="dashed" />
            <div className="c b">Earn Rewards</div>
            <img src={qrCodeUrl} alt="Rewards QR" className="qr" />
            <div className="c sm">Scan in the Bean Pakistan App to add points</div>
            {bill?.qrCodeId && (
              <>
                <div className="c sm">or enter code manually:</div>
                <div className="c b code">{bill.qrCodeId}</div>
              </>
            )}
          </>
        )}

        {/* App download */}
        <div className="dashed" />
        <div className="c b">Don't have the app? Download &amp; scan</div>
        <div className="qrrow">
          <div className="qcell">
            {iosQrUrl && <img src={iosQrUrl} alt="iOS" className="qrsm" />}
            <div className="c sm">iOS</div>
          </div>
          <div className="qcell">
            {androidQrUrl && <img src={androidQrUrl} alt="Android" className="qrsm" />}
            <div className="c sm">Android</div>
          </div>
        </div>

        <div className="dashed" />
        <div className="c">Thank you for your purchase!</div>
        <div className="c sm">Bean — More than just coffee, it's a community!</div>
        <div className="feed" />
      </div>
    </>
  );
}