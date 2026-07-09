import { useEffect, useState } from "react";
import { format } from "date-fns";

// Standalone thermal receipt page opened in a new tab by BillGenerator.
// Reads bill data + assets (all base64) from sessionStorage and auto-prints.
// Pure HTML + inline <style> — no jsPDF, no html2canvas, no canvas, no Blob.
// Critical fix: @page size: <pw>mm auto; margin: 0; and html/body overflow: visible
// so Chrome measures true content height instead of falling back to A4.

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
    let cancelled = false;
    let closeTimer = null;

    const trigger = () => {
      if (cancelled) return;
      try { window.print(); } catch (e) {}
      closeTimer = setTimeout(() => {
        try { window.close(); } catch (e) {}
      }, 1000);
    };

    const t = setTimeout(() => {
      if (cancelled) return;
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(trigger).catch(trigger);
      } else {
        trigger();
      }
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(t);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, []);

  if (!data) {
    return <div style={{ padding: 20, fontFamily: "monospace" }}>Loading receipt…</div>;
  }

  const { bill, qrCodeUrl, iosQrUrl, androidQrUrl, logoDataUrl, paperWidth } = data;
  const pw = paperWidth === 58 ? 58 : 80; // mm
  const gstLabel = bill?.paymentMethod === "Card" ? "5%" : "17%";
  const pts = bill?.pointsToAward ?? Math.floor(bill?.subtotal / 100);

  // Font / sizes scale down on 58mm so everything fits comfortably.
  const is58 = pw === 58;
  const fs = is58 ? "9px" : "11px";       // base font
  const fsSm = is58 ? "7px" : "9px";      // small text
  const fsBrand = is58 ? "13px" : "16px"; // BEAN wordmark
  const fsGrand = is58 ? "12px" : "14px"; // TOTAL line
  const qrLg = is58 ? "110px" : "150px"; // rewards QR
  const qrSm = is58 ? "78px" : "100px";  // app download QRs

  const css = `
    @page { size: ${pw}mm auto; margin: 0mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${pw}mm;
      margin: 0;
      padding: 0;
      overflow: visible;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: "Courier New", monospace;
      color: #000000;
      font-size: ${fs};
      line-height: 1.3;
    }
    #receipt {
      width: ${pw}mm;
      padding: 2mm 2mm 4mm;
      box-sizing: border-box;
    }
    .c { text-align: center; }
    .b { font-weight: 700; }
    .sm { font-size: ${fsSm}; }
    .logo { display:block; width: 16mm; height: 16mm; margin: 0 auto 1mm; object-fit: contain; }
    .brand { font-size: ${fsBrand}; font-weight: 700; letter-spacing: 1px; }
    .tagline { font-size: ${fsSm}; font-style: italic; }
    .dashed { border-top: 1px dashed #000; margin: 1mm 0; }
    .solid { border-top: 2px solid #000; margin: 0.8mm 0; }
    .feed { height: 6mm; }
    .row { display: flex; justify-content: space-between; margin: 0.4mm 0; page-break-inside: avoid; }
    .iname { font-weight: 700; margin: 0.6mm 0 0.2mm; page-break-inside: avoid; }
    .iline { display: flex; justify-content: space-between; font-size: ${fsSm}; page-break-inside: avoid; }
    .grand { font-size: ${fsGrand}; font-weight: 700; margin: 0.8mm 0; page-break-inside: avoid; }
    .disc { color: #d40000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .qr { display: block; width: ${qrLg}; height: ${qrLg}; margin: 1mm auto; }
    .qrrow { display: flex; justify-content: space-around; margin-top: 1mm; }
    .qcell { text-align: center; }
    .qrsm { display: block; width: ${qrSm}; height: ${qrSm}; margin: 0 auto; }
    .code { font-size: ${fs}; letter-spacing: 1px; word-break: break-all; }
    .totals { page-break-inside: avoid; }
    @media screen {
      html { background: #ededed; }
      body { margin: 24px auto; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
    }
    @media print {
      html, body { width: ${pw}mm; margin: 0; background: #ffffff; box-shadow: none; }
      #receipt { width: ${pw}mm; box-shadow: none; }
    }
  `;

  const money = (n) => `PKR ${Number(n || 0).toFixed(2)}`;

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
        {bill?.cashierName && <div className="row"><span>Cashier</span><span>{bill.cashierName}</span></div>}
        {bill?.orderType && <div className="row"><span>Order</span><span>{bill.orderType}</span></div>}
        {bill?.customerInfo?.name && <div className="row"><span>Customer</span><span>{bill.customerInfo.name}</span></div>}
        {bill?.customerInfo?.phone && <div className="row"><span>Phone</span><span>{bill.customerInfo.phone}</span></div>}

        <div className="dashed" />

        {/* Items */}
        {bill?.items?.map((item, i) => (
          <div key={i}>
            <div className="iname">{item.name}</div>
            <div className="iline">
              <span>{item.quantity} x {money(item.price)}</span>
              <span className="b">{money(Number(item.price) * item.quantity)}</span>
            </div>
          </div>
        ))}

        <div className="dashed" />

        {/* Totals */}
        <div className="totals">
          {bill?.discountPct > 0 ? (
            <>
              <div className="row"><span>Subtotal</span><span>{money(bill.originalSubtotal ?? bill.subtotal)}</span></div>
              <div className="row disc"><span>Discount ({bill.discountPct}%)</span><span>- {money(bill.discountAmount)}</span></div>
            </>
          ) : (
            <div className="row"><span>Subtotal</span><span>{money(bill?.subtotal)}</span></div>
          )}
          <div className="row"><span>GST ({gstLabel})</span><span>{money(bill?.tax)}</span></div>
          <div className="solid" />
          <div className="row grand"><span>TOTAL</span><span>{money(bill?.total)}</span></div>
        </div>

        <div className="dashed" />

        <div className="row"><span>Reward Points</span><span className="b">{pts} pts</span></div>
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
        <div className="c b">Download the Bean app</div>
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