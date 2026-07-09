import html2canvas from "html2canvas";

// Bitmap print pipeline with detailed step logging. Each step is wrapped in
// its own try/catch so the EXACT failing operation — and its full stack trace —
// is logged to the console. On failure a descriptive Error (naming the step)
// is thrown, so the UI can surface the real reason instead of a generic toast.
export async function printReceipt(paperWidth = 80) {
  const pw = paperWidth === 58 ? 58 : 80;
  console.log("1. Start print", { paperWidth: pw });

  // ── Step 2: locate the receipt element ────────────────────────────────
  let node;
  try {
    node = document.getElementById("receipt");
    if (!node) throw new Error("document.getElementById('receipt') returned null");
    console.log("2. Receipt element found", { w: node.offsetWidth, h: node.offsetHeight });
  } catch (e) {
    console.error("Step 2 (find receipt) FAILED:", e, "\nStack:", e.stack);
    throw new Error(`Step 2 (find receipt): ${e.message}`);
  }

  // Settle fonts + paint + inline images before capture.
  try { await document.fonts.ready; } catch (e) { console.warn("document.fonts.ready threw (non-fatal):", e); }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
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

  // ── Step 3: html2canvas capture ──────────────────────────────────────
  let canvas;
  try {
    const prevShadow = node.style.boxShadow;
    node.style.boxShadow = "none";
    try {
      canvas = await html2canvas(node, {
        scale: 4,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
      });
    } finally {
      node.style.boxShadow = prevShadow;
    }
    if (!canvas || canvas.width === 0 || canvas.height === 0)
      throw new Error(`blank canvas (${canvas ? canvas.width + "x" + canvas.height : "null"})`);
    console.log("3. html2canvas finished", { w: canvas.width, h: canvas.height });
  } catch (e) {
    console.error("Step 3 (html2canvas) FAILED:", e, "\nStack:", e.stack);
    throw new Error(`Step 3 (html2canvas): ${e.message}`);
  }

  // ── Step 4: PNG data URL ─────────────────────────────────────────────
  let png;
  try {
    png = canvas.toDataURL("image/png");
    if (!png || png === "data:,") throw new Error("toDataURL returned a blank data URL");
    console.log("4. PNG created", { bytes: png.length });
  } catch (e) {
    console.error("Step 4 (PNG) FAILED:", e, "\nStack:", e.stack);
    throw new Error(`Step 4 (PNG): ${e.message}`);
  }

  // ── Step 5: create + append iframe ───────────────────────────────────
  let iframe;
  try {
    iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);
    if (!document.body.contains(iframe)) throw new Error("iframe was not appended to document.body");
    console.log("5. iframe created", { contentWindow: !!iframe.contentWindow });
  } catch (e) {
    console.error("Step 5 (iframe create) FAILED:", e, "\nStack:", e.stack);
    throw new Error(`Step 5 (iframe create): ${e.message}`);
  }

  // ── Step 6: write the iframe document ────────────────────────────────
  try {
    const w = iframe.contentWindow;
    if (!w) throw new Error("iframe.contentWindow is null");
    w.document.open();
    w.document.write(
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>" +
      "@page{size:" + pw + "mm auto;margin:0;}" +
      "html,body{margin:0;padding:0;background:#fff;}" +
      "img{display:block;width:100%;height:auto;}" +
      "</style></head><body><img id=\"r\" src=\"" + png + "\"></body></html>"
    );
    w.document.close();
    console.log("6. iframe document written");
  } catch (e) {
    console.error("Step 6 (iframe write) FAILED:", e, "\nStack:", e.stack);
    try { iframe.remove(); } catch (e2) {}
    throw new Error(`Step 6 (iframe write): ${e.message}`);
  }

  // ── Step 7: wait for the image to load inside the iframe ─────────────
  try {
    const w = iframe.contentWindow;
    const img = w && w.document.getElementById("r");
    if (!img) throw new Error("img#r not found in iframe document");
    await new Promise((resolve, reject) => {
      let settled = false;
      const ok = () => { if (!settled) { settled = true; resolve(); } };
      const bad = (why) => { if (!settled) { settled = true; reject(new Error(why)); } };
      if (img.complete && img.naturalWidth > 0) return ok();
      img.onload = ok;
      img.onerror = () => bad("img.onerror fired — PNG failed to load inside the iframe");
      setTimeout(() => bad("img.onload/onerror did not fire within 10s"), 10000);
    });
    console.log("7. image loaded", { nw: img.naturalWidth, nh: img.naturalHeight });
  } catch (e) {
    console.error("Step 7 (image load) FAILED:", e, "\nStack:", e.stack);
    try { iframe.remove(); } catch (e2) {}
    throw new Error(`Step 7 (image load): ${e.message}`);
  }

  // ── Step 8 + 9: verify + invoke print() ──────────────────────────────
  try {
    const w = iframe.contentWindow;
    if (!w) throw new Error("iframe.contentWindow is null before print()");
    if (typeof w.print !== "function")
      throw new Error("iframe.contentWindow.print is not a function (blocked/unavailable)");
    const ua = navigator.userActivation
      ? { isActive: navigator.userActivation.isActive, hasBeenActive: navigator.userActivation.hasBeenActive }
      : "unavailable";
    console.log("8. calling iframe.contentWindow.print()", { hasPrint: typeof w.print, userActivation: ua });
    w.focus();
    w.print();
    console.log("9. print() returned");
  } catch (e) {
    console.error("Step 8/9 (print call) FAILED:", e, "\nStack:", e.stack);
    try { iframe.remove(); } catch (e2) {}
    throw new Error(`Step 8/9 (print call): ${e.message}`);
  }

  // ── Step 10: wait for afterprint ─────────────────────────────────────
  await new Promise((resolve) => {
    const w = iframe.contentWindow;
    let fired = false;
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      try { if (w) w.onafterprint = null; } catch (e) {}
      try { iframe.remove(); } catch (e) {}
      resolve();
    };
    try {
      w.onafterprint = () => {
        fired = true;
        console.log("10. afterprint fired");
        cleanup();
      };
    } catch (e) {
      console.warn("could not attach onafterprint:", e);
    }
    // If afterprint never fires the print dialog almost certainly never
    // opened — typically because print() ran outside the original user
    // gesture. Last known-good step in that case: 9 (print() returned).
    timer = setTimeout(() => {
      if (!fired) {
        console.error("Step 10: afterprint did NOT fire within 30s — the print dialog likely never opened (possible user-gesture block). Last logged step: 9 (print() returned without throwing).");
      }
      cleanup();
    }, 30000);
  });
}