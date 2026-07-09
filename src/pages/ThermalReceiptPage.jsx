import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────
// Thermal receipt — opened in a NEW TAB by BillGenerator's "Print Receipt".
//
// ARCHITECTURE (audit + approved PRD):
//  • ONE thermal path. Pure inline style props on EVERY element — ZERO
//    className — so Tailwind/global resets cannot collapse the flex layout
//    in print mode. (Verified: Tailwind preflight sets *,html,img resets that
//    inline styles override.)
//  • @page is the ONLY stylesheet. CRITICAL FIX: `@page { size: 80mm auto }` is
//    INVALID CSS (length + `auto` is not in the Paged Media grammar) and Chrome
//    silently drops it → page falls back to A4 → the Czerlop driver scales and
//    fonts shrink. Instead we measure the rendered receipt height AFTER all
//    images/fonts are ready and inject `@page { size: <w>mm <h>mm; margin: 0 }`
//    so the page exactly fits the content: one page, no A4 fallback, no waste.
//  • html/body overflow:visible + width set inline (beforeprint/afterprint) so
//    Chrome measures true receipt height.
//  • window.print() fires only after: document.fonts.ready AND every tracked
//    image onLoad/onError, then 300ms settle + two requestAnimationFrame cycles
//    (after measuring + setting @page). Then window.close() after 1200ms.
//  • NEVER imports jsPDF, NEVER creates a Blob, NEVER downloads. The A4 invoice
//    PDF is a fully independent path (BillGenerator "Download Invoice", on
//    explicit click only) and is never invoked here or during checkout.
// ─────────────────────────────────────────────────────────────────────────

const FONT = "'Courier New', Courier, monospace";
const money = (n) => `PKR ${Number(n || 0).toFixed(2)}`;
const MM_PER_PX = 25.4 / 96; // CSS px → mm at 96dpi

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
  const [loaded, setLoaded] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);
  const loadedRef = useRef(0);
  const lastLoadAtRef = useRef(0);
  const printedRef = useRef(false);
  const pageStyleRef = useRef(null); // dedicated <style> element for @page

  // Load receipt data + wait for fonts
  useEffect(() => {
    setData(readData() || {});
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setFontsReady(true)).catch(() => setFontsReady(true));
    } else {
      setFontsReady(true);
    }
  }, []);

  // Expected tracked images: logo + rewards QR + 2 app QRs
  const expected =
    (data?.logoDataUrl ? 1 : 0) +
    (data?.qrCodeUrl ? 1 : 0) +
    (data?.iosQrUrl ? 1 : 0) +
    (data?.androidQrUrl ? 1 : 0);

  const markLoaded = () => {
    loadedRef.current += 1;
    lastLoadAtRef.current = Date.now();
    setLoaded(loadedRef.current);
  };

  // Create the single @page <style> element (placeholder size until measured).
  useEffect(() => {
    if (!data) return;
    const pw = data.paperWidth === 58 ? 58 : 80;
    const el = document.createElement("style");
    el.setAttribute("data-thermal-page", "");
    el.textContent = `@page { size: ${pw}mm ${pw}mm; margin: 0; }`;
    document.head.appendChild(el);
    pageStyleRef.current = el;
    return () => {
      el.remove();
      pageStyleRef.current = null;
    };
  }, [data]);

  // Print gate: all images loaded + fonts ready + 300ms since last load.
  const doPrint = () => {
    if (printedRef.current) return;
    printedRef.current = true;
    const pw = data.paperWidth === 58 ? 58 : 80;
    // Measure the fully-laid-out receipt and fit the @page to it (the fix for
    // the A4 fallback — `size: Wmm auto` is invalid and was being dropped).
    const el = document.getElementById("receipt");
    if (el && pageStyleRef.current) {
      const mmH = el.scrollHeight * MM_PER_PX;
      pageStyleRef.current.textContent =
        `@page { size: ${pw}mm ${Math.ceil(mmH) + 1}mm; margin: 0; }`;
    }
    // Two rAF so the browser applies the measured page size before printing.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        try { window.print(); } catch (e) {}
        setTimeout(() => { try { window.close(); } catch (e) {} }, 1200);
      })
    );
  };

  useEffect(() => {
    if (printedRef.current || !data) return;
    if (loaded < expected || !fontsReady) return;
    const wait = Math.max(0, 300 - (Date.now() - lastLoadAtRef.current));
    const timer = setTimeout(doPrint, wait);
    return () => clearTimeout(timer);
  }, [loaded, expected, fontsReady, data]);

  // Inline body/html styling — screen (grey, centered) vs print (flush, pw mm).
  useEffect(() => {
    if (!data) return;
    const pw = data.paperWidth === 58 ? 58 : 80;
    const html = document.documentElement;
    const body = document.body;
    const screen = () => {
      html.style.background = "#eeeeee";
      html.style.overflow = "visible";
      html.style.width = "100%";
      html.style.margin = "0";
      html.style.padding = "0";
      body.style.background = "#eeeeee";
      body.style.overflow = "visible";
      body.style.width = "100%";
      body.style.margin = "0";
      body.style.padding = "0";
      body.style.display = "flex";
      body.style.justifyContent = "center";
      body.style.minHeight = "100vh";
    };
    const print = () => {
      html.style.background = "#ffffff";
      html.style.overflow = "visible";
      html.style.width = `${pw}mm`;
      html.style.margin = "0";
      html.style.padding = "0";
      body.style.background = "#ffffff";
      body.style.overflow = "visible";
      body.style.width = `${pw}mm`;
      body.style.margin = "0";
      body.style.padding = "0";
      body.style.display = "block";
      body.style.minHeight = "0";
    };
    screen();
    window.addEventListener("beforeprint", print);
    window.addEventListener("afterprint", screen);
    return () => {
      window.removeEventListener("beforeprint", print);
      window.removeEventListener("afterprint", screen);
    };
  }, [data]);

  if (!data) {
    return <div style={{ padding: 20, fontFamily: FONT }}>Loading receipt…</div>;
  }

  const { bill, qrCodeUrl, iosQrUrl, androidQrUrl, logoDataUrl, paperWidth } = data;
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

  // Inline style helpers — no className anywhere
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

  return (
    <div id="receipt" style={{
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
          <img src={logoDataUrl} alt="Bean" onLoad={markLoaded} onError={markLoaded}
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
            <img src={qrCodeUrl} alt="Rewards QR" onLoad={markLoaded} onError={markLoaded} style={imgQr(qrLg)} />
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
            {iosQrUrl && <img src={iosQrUrl} alt="iOS" onLoad={markLoaded} onError={markLoaded} style={imgApp(qrSm)} />}
            <div style={{ fontFamily: FONT, fontSize: fsSm, color: "#000000" }}>iOS</div>
          </div>
          <div style={{ textAlign: "center" }}>
            {androidQrUrl && <img src={androidQrUrl} alt="Android" onLoad={markLoaded} onError={markLoaded} style={imgApp(qrSm)} />}
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