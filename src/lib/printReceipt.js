import html2canvas from "html2canvas";

// ─────────────────────────────────────────────────────────────────────────
// THE one and only print path in the application.
// (DEBUG BUILD — verbose logging at every stage; html2canvas scale fixed at 2
//  to test for canvas memory limits. Revert scale to native once the exact
//  failure step is identified.)
// ─────────────────────────────────────────────────────────────────────────
const DOTS_PER_MM = 8;

export async function printReceipt(paperWidth = 80) {
  const pw = paperWidth === 58 ? 58 : 80;
  console.log("[printReceipt] START — paperWidth:", paperWidth, "pw:", pw);

  const node = document.getElementById("receipt");
  if (!node) {
    console.error("[printReceipt] FAIL — #receipt element NOT found");
    throw new Error("Receipt not found");
  }
  console.log("[printReceipt] Receipt element found — offsetWidth:", node.offsetWidth, "offsetHeight:", node.offsetHeight);

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);
  console.log("[printReceipt] Hidden iframe created");

  let printed = false;
  try {
    console.log("[printReceipt] Waiting for fonts...");
    try { await document.fonts.ready; } catch (e) { console.warn("[printReceipt] document.fonts.ready threw:", e); }
    console.log("[printReceipt] Fonts ready");

    console.log("[printReceipt] Waiting for 2 RAF cycles...");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    console.log("[printReceipt] RAF cycles complete");

    console.log("[printReceipt] Waiting for images...");
    const imgs = Array.from(node.querySelectorAll("img"));
    console.log("[printReceipt] Images expected:", imgs.length);
    let loaded = 0;
    await Promise.all(imgs.map((img, i) => {
      console.log("[printReceipt] image[" + i + "] complete:", img.complete, "naturalWidth:", img.naturalWidth, "src:", (img.src || "").slice(0, 48));
      if (img.complete && img.naturalWidth > 0) { loaded++; return Promise.resolve(); }
      return new Promise((res) => {
        img.addEventListener("load", () => { loaded++; console.log("[printReceipt] image[" + i + "] LOADED — loaded/expected:", loaded + "/" + imgs.length); res(); }, { once: true });
        img.addEventListener("error", () => { console.error("[printReceipt] image[" + i + "] FAILED to load — src:", (img.src || "").slice(0, 48)); res(); }, { once: true });
      });
    }));
    console.log("[printReceipt] Images done — loaded:", loaded, "of expected:", imgs.length);

    // TEMPORARY DEBUG: fixed scale 2 (native ≈ 2.12 for 80mm). If scale 2 succeeds
    // where a higher scale failed, the cause is canvas memory limits.
    const scale = 2;
    const options = { scale, useCORS: true, allowTaint: false, backgroundColor: "#ffffff", logging: false };
    console.log("[printReceipt] Calling html2canvas... options:", JSON.stringify(options));

    const prevShadow = node.style.boxShadow;
    node.style.boxShadow = "none";
    let canvas;
    try {
      canvas = await html2canvas(node, options);
    } catch (err) {
      console.error("[printReceipt] html2canvas THREW:", err);
      console.error("[printReceipt] error message:", err && err.message);
      console.error("[printReceipt] error stack:", err && err.stack);
      node.style.boxShadow = prevShadow;
      throw err;
    }
    node.style.boxShadow = prevShadow;

    console.log("[printReceipt] html2canvas SUCCESS — canvas.width:", canvas.width, "canvas.height:", canvas.height);

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      console.error("[printReceipt] FAIL — blank canvas:", canvas && canvas.width, "x", canvas && canvas.height);
      throw new Error("Blank canvas");
    }

    let png;
    try {
      png = canvas.toDataURL("image/png");
    } catch (err) {
      console.error("[printReceipt] toDataURL THREW:", err, err && err.stack);
      throw err;
    }
    console.log("[printReceipt] toDataURL length:", png.length);
    if (!png || png === "data:,") {
      console.error("[printReceipt] FAIL — empty PNG data URL");
      throw new Error("Blank canvas");
    }
    console.log("[printReceipt] PNG ready — printing via iframe");

    printed = await printPngInIframe(iframe, png, pw);
    console.log("[printReceipt] printPngInIframe returned:", printed);
  } finally {
    if (!printed) {
      console.log("[printReceipt] finally — removing orphan iframe (printed=false)");
      try { iframe.remove(); } catch (e) {}
    } else {
      console.log("[printReceipt] finally — iframe already removed by afterprint");
    }
  }
}

function printPngInIframe(iframe, png, pw) {
  console.log("[printPngInIframe] start — pw:", pw, "png length:", png.length);
  return new Promise((resolve) => {
    const w = iframe.contentWindow;
    if (!w) { console.error("[printPngInIframe] FAIL — no contentWindow"); return resolve(false); }
    console.log("[printPngInIframe] contentWindow OK");

    let done = false;
    const cleanup = () => {
      if (done) return; done = true;
      console.log("[printPngInIframe] cleanup fired (afterprint or 60s timeout)");
      try { iframe.remove(); } catch (e) {}
      resolve(true);
    };
    w.onafterprint = cleanup;
    setTimeout(cleanup, 60000);

    w.document.open();
    w.document.write(
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>" +
      "@page{size:" + pw + "mm auto;margin:0;}" +
      "html,body{margin:0;padding:0;width:" + pw + "mm;overflow:hidden;background:#fff;}" +
      "img{display:block;width:" + pw + "mm;max-width:" + pw + "mm;height:auto;margin:0;padding:0;}" +
      "</style></head><body><img id=\"r\" src=\"" + png + "\"></body></html>"
    );
    w.document.close();
    console.log("[printPngInIframe] iframe document written");

    const img = w.document.getElementById("r");
    const go = () => {
      console.log("[printPngInIframe] PNG image loaded inside iframe — calling iframe.contentWindow.print() NOW");
      w.focus();
      w.print();
    };
    if (img && img.complete) {
      console.log("[printPngInIframe] img already complete");
      go();
    } else if (img) {
      console.log("[printPngInIframe] waiting for img.onload...");
      img.onload = go;
      img.onerror = () => { console.error("[printPngInIframe] img FAILED to load"); resolve(false); };
    } else {
      console.error("[printPngInIframe] FAIL — #r img element not found");
      resolve(false);
    }
  });
}