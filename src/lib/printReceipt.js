// Native thermal print: inject a print stylesheet sized to the chosen paper
// width, then call window.print() synchronously inside the click gesture.
// No html2canvas / no iframe / no async work — the browser prints the native
// target element, so text and QR codes stay vector-crisp and the document
// lands on a single page sized to its content (the DOM flows, unlike a bitmap).
// elementId lets callers print any #id'd document staged under
// [data-receipt-stage] (receipts, shift reports, ...).
//
// copies: 1 (default) prints once; 2 prints the store copy then an identical
// customer copy automatically — used only from the BillGenerator print button.
export function printThermalDocument(elementId, paperWidth = 80, copies = 1) {
  const pw = paperWidth === 58 ? 58 : 80;
  const copyCount = Math.max(1, Math.min(2, Number(copies) || 1));

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
    "#" + elementId + " { box-shadow: none !important; width: " + pw + "mm !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }" +
    "}";
  document.head.appendChild(style);

  // When copies=2, the first afterprint triggers the customer-copy print, and
  // the second afterprint tears down the injected stylesheet.
  let remaining = copyCount;

  const cleanup = () => {
    window.removeEventListener("afterprint", handleAfterPrint);
    const s = document.getElementById("print-size");
    if (s) s.remove();
  };

  const handleAfterPrint = () => {
    remaining -= 1;
    if (remaining >= 1) {
      window.print();
    } else {
      cleanup();
    }
  };

  window.addEventListener("afterprint", handleAfterPrint);

  // Synchronous — must run within the user gesture so the dialog opens.
  window.print();
}

export function printReceipt(paperWidth = 80, copies = 1) {
  return printThermalDocument("receipt", paperWidth, copies);
}