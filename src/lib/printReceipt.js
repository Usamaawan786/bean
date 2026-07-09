// ─────────────────────────────────────────────────────────────────────────
// THE one and only print path in the application.
//
// Printing a receipt is just: open the browser print dialog on the current
// page. The receipt (#receipt) is rendered by <Receipt> inside a body-level
// portal (BillGenerator), so it lives OUTSIDE #root. This function injects a
// short print stylesheet that hides #root and the overlay chrome (backdrop +
// toolbar), leaving #receipt as the only in-flow content — so exactly one
// page prints, with no separate print page, no hidden window, and no
// duplicate renderer.
//
// @page is pinned to the thermal driver's paper size (POS80C = 80×420mm) so
// Chrome's print dialog selects it instead of falling back to Letter. The
// printer feeds only the printed content and auto-cuts at the content end.
// ─────────────────────────────────────────────────────────────────────────

export function printReceipt(paperWidth = 80) {
  const pw = paperWidth === 58 ? 58 : 80;
  const style = document.createElement("style");
  style.id = "receipt-print-page";
  style.textContent = `
    @page { size: ${pw}mm 420mm; margin: 0; }
    @media print {
      html, body { width: ${pw}mm !important; margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
      #root { display: none !important; }
      [data-receipt-backdrop], [data-receipt-toolbar] { display: none !important; }
      [data-receipt-stage] { position: static !important; overflow: visible !important; padding: 0 !important; display: block !important; background: transparent !important; }
      #receipt { box-shadow: none !important; }
    }
  `;
  document.head.appendChild(style);

  const cleanup = () => {
    style.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup, { once: true });

  // Two animation frames so the injected @page is committed before the dialog.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      try { window.print(); } catch (e) { /* ignore */ }
    })
  );
}