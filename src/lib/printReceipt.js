// Native thermal receipt print: inject a print stylesheet sized to the chosen
// paper width, then call window.print() synchronously inside the click gesture.
// No html2canvas / no iframe / no async work — the browser prints the native
// #receipt element, so text and QR codes stay vector-crisp and the receipt
// lands on a single page sized to its content (the DOM flows, unlike a bitmap).
export function printReceipt(paperWidth = 80) {
  const pw = paperWidth === 58 ? 58 : 80;

  // Replace any stylesheet left over from a previous print.
  const existing = document.getElementById("print-size");
  if (existing) existing.remove();

  // #receipt is nested inside [data-receipt-stage] (portaled to <body>), so we
  // hide every other direct child of <body>, hide the toolbar, and flatten the
  // stage to a plain block — leaving only #receipt flowing at the page origin.
  const style = document.createElement("style");
  style.id = "print-size";
  style.textContent =
    "@page { size: " + pw + "mm auto; margin: 0; }" +
    "@media print {" +
    "body > *:not([data-receipt-stage]) { display: none !important; }" +
    "[data-receipt-toolbar] { display: none !important; }" +
    "[data-receipt-stage] { position: static !important; display: block !important; padding: 0 !important; margin: 0 !important; background: #fff !important; overflow: visible !important; }" +
    "#receipt { box-shadow: none !important; width: " + pw + "mm !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }" +
    "}";
  document.head.appendChild(style);

  // Remove the injected stylesheet once printing is done.
  const cleanup = () => {
    window.removeEventListener("afterprint", cleanup);
    const s = document.getElementById("print-size");
    if (s) s.remove();
  };
  window.addEventListener("afterprint", cleanup);

  // Synchronous — must run within the user gesture so the dialog opens.
  window.print();
}