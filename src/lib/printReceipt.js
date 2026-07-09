// ─────────────────────────────────────────────────────────────────────────
// Thermal receipt printing — @media print isolation.
//
// Injects a print-only stylesheet that hides the app chrome (#root, the modal
// overlay/toolbar) and reveals only #receipt at the exact paper width, then
// opens the native browser print dialog synchronously from the click. No
// separate page, no bitmaps — the browser sends the rendered receipt DOM
// straight to the print spooler.
// ─────────────────────────────────────────────────────────────────────────
export function printReceipt(paperWidth = 80) {
  const pw = paperWidth === 58 ? 58 : 80;
  const STYLE_ID = "thermal-receipt-print-style";

  // Remove any leftover print style (e.g. rapid re-clicks).
  document.getElementById(STYLE_ID)?.remove();

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @media print {
      @page { size: ${pw}mm auto; margin: 0; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      /* Hide the rest of the app and the modal overlay/toolbar. */
      #root { display: none !important; }
      [data-receipt-backdrop] { display: none !important; }
      [data-receipt-toolbar] { display: none !important; }
      /* Un-float the stage so #receipt flows at the top of the page. */
      [data-receipt-stage] {
        position: static !important;
        display: block !important;
        overflow: visible !important;
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      /* The receipt itself: exact paper width, no shadow, colors preserved. */
      #receipt {
        position: static !important;
        box-shadow: none !important;
        margin: 0 !important;
        width: ${pw}mm !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #receipt * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;
  document.head.appendChild(style);

  const cleanup = () => {
    document.getElementById(STYLE_ID)?.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup, { once: true });
  // Fallback cleanup in case afterprint does not fire.
  setTimeout(cleanup, 15000);

  window.print();
}