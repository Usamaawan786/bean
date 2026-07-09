import html2canvas from "html2canvas";

// ─────────────────────────────────────────────────────────────────────────
// THE one and only print path in the application.
//
// The receipt (#receipt, rendered once by <Receipt> in BillGenerator) is
// rasterized to a PNG at the printer's NATIVE resolution, then printed through
// a hidden iframe whose page, body, and image are all fixed to the exact paper
// width. The thermal printer therefore receives a 1:1 bitmap — never HTML,
// extracted text, or a DOM — that fills the full paper width with crisp text.
// ─────────────────────────────────────────────────────────────────────────
const DOTS_PER_MM = 8; // 203 dpi thermal print head ≈ 8 dots/mm (80mm → 640px)

export async function printReceipt(paperWidth = 80) {
  const pw = paperWidth === 58 ? 58 : 80;
  const node = document.getElementById("receipt");
  if (!node) throw new Error("Receipt not found");

  // Pre-create the hidden iframe synchronously (within the click gesture) so
  // the later print() call is not treated as a non-user-initiated popup.
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  let printed = false;
  try {
    // Wait until fonts + a paint cycle are settled so the capture is complete.
    try { await document.fonts.ready; } catch (e) {}
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    // Ensure every inline image (logo, QR codes) is fully decoded.
    await Promise.all(
      Array.from(node.querySelectorAll("img")).map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise((res) => {
              img.addEventListener("load", res, { once: true });
              img.addEventListener("error", res, { once: true });
            })
      )
    );

    // Render the bitmap at the printer's NATIVE width (80mm → 640px, 58mm → 464px),
    // not an arbitrary scale — so Chrome never shrinks thousands of px down to the
    // paper width and every bitmap pixel maps 1:1 to a print dot.
    const targetWidth = pw * DOTS_PER_MM;
    const scale = targetWidth / node.offsetWidth;

    // Drop the on-screen drop shadow so it never bleeds into the printed bitmap.
    const prevShadow = node.style.boxShadow;
    node.style.boxShadow = "none";
    let canvas;
    try {
      canvas = await html2canvas(node, {
        scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
      });
    } finally {
      node.style.boxShadow = prevShadow;
    }

    if (!canvas || canvas.width === 0 || canvas.height === 0) throw new Error("Blank canvas");
    const png = canvas.toDataURL("image/png");
    if (!png || png === "data:,") throw new Error("Blank canvas");

    // Verify the bitmap is at the printer's native resolution (≈ 640 x XXXX).
    console.log("[printReceipt] canvas    :", canvas.width, "x", canvas.height);
    console.log("[printReceipt] paper px  :", targetWidth, "x", canvas.height, "(" + pw + "mm @ " + DOTS_PER_MM + " dots/mm)");

    printed = await printPngInIframe(iframe, png, pw);
  } finally {
    if (!printed) {
      // Capture/print failed or never completed — remove the orphaned iframe.
      try { iframe.remove(); } catch (e) {}
    }
  }
}

function printPngInIframe(iframe, png, pw) {
  return new Promise((resolve) => {
    const w = iframe.contentWindow;
    if (!w) return resolve(false);

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      try { iframe.remove(); } catch (e) {}
      resolve(true);
    };
    w.onafterprint = cleanup;
    setTimeout(cleanup, 60000); // safety net if afterprint never fires

    // Page, body, and image are ALL fixed to the exact paper width (never
    // width:100%), so the print renders at 1:1 with no "fit to page" shrink.
    // overflow:hidden + auto page height crop the bitmap to the receipt only —
    // no blank paper underneath.
    w.document.open();
    w.document.write(
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>" +
      "@page{size:" + pw + "mm auto;margin:0;}" +
      "html,body{margin:0;padding:0;width:" + pw + "mm;overflow:hidden;background:#fff;}" +
      "img{display:block;width:" + pw + "mm;max-width:" + pw + "mm;height:auto;margin:0;padding:0;}" +
      "</style></head><body><img id=\"r\" src=\"" + png + "\"></body></html>"
    );
    w.document.close();

    const img = w.document.getElementById("r");
    const go = () => { w.focus(); w.print(); };
    if (img && img.complete) go();
    else if (img) { img.onload = go; img.onerror = () => resolve(false); }
    else resolve(false);
  });
}