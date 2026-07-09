import { useEffect, useRef, useState } from "react";
import ReceiptTemplate from "@/components/admin/ReceiptTemplate";
import { generateReceiptAssets } from "@/lib/receiptAssets";

// ─────────────────────────────────────────────────────────────────────────
// Thermal receipt PRINT page — opened in a NEW TAB by BillGenerator's
// "Print Receipt" (window.open("/thermal-receipt", "_blank")).
//
// ARCHITECTURE:
//  • ONE receipt template (ReceiptTemplate.jsx). This page renders it in
//    print mode and owns ONLY: reading sessionStorage, the @page measurement,
//    body/html styling (screen vs print), and the auto-print gate.
//  • @page is the ONLY stylesheet. CRITICAL FIX: `@page { size: 80mm auto }`
//    is INVALID CSS (length + `auto` is not in the Paged Media grammar) and
//    Chrome silently drops it → page falls back to A4 → the driver scales and
//    fonts shrink. Instead we measure the rendered receipt height AFTER all
//    images/fonts are ready and inject `@page { size: <w>mm <h>mm; margin: 0 }`
//    so the page exactly fits the content: one page, no A4 fallback.
//  • window.print() fires only after: assets generated, document.fonts.ready
//    AND every tracked image onLoad/onError, then 300ms settle + two
//    requestAnimationFrame cycles (after measuring + setting @page). Then
//    window.close() after 1200ms.
//  • SELF-CONTAINED: generates its OWN QR codes + logo from the bill — the print
//    flow does NOT depend on the invoice modal, jsPDF, or any caller-supplied
//    assets. The caller passes only { bill, paperWidth } in sessionStorage.
//  • NEVER imports jsPDF, NEVER creates a Blob, NEVER downloads. The A4 invoice
//    PDF is a fully independent path (BillGenerator "Download Invoice").
// ─────────────────────────────────────────────────────────────────────────

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
  const [assets, setAssets] = useState(null);
  const [loaded, setLoaded] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);
  const loadedRef = useRef(0);
  const lastLoadAtRef = useRef(0);
  const printedRef = useRef(false);
  const pageStyleRef = useRef(null); // dedicated <style> element for @page

  // Load receipt data + wait for fonts
  useEffect(() => {
    const d = readData() || {};
    setData(d);
    console.log("[RECEIPT-PIPE] 1. Receipt data loaded from sessionStorage", {
      hasBill: !!d.bill, paperWidth: d.paperWidth,
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready
        .then(() => { console.log("[RECEIPT-PIPE] 3. Fonts ready"); setFontsReady(true); })
        .catch(() => { console.log("[RECEIPT-PIPE] 3. Fonts ready (catch)"); setFontsReady(true); });
    } else {
      console.log("[RECEIPT-PIPE] 3. Fonts ready (no document.fonts API)");
      setFontsReady(true);
    }
  }, []);

  // SELF-CONTAINED: this page builds its OWN QR codes + logo from the bill, so the
  // print flow never depends on the invoice modal (BillGenerator) or jsPDF. The
  // caller only needs to pass { bill, paperWidth } in sessionStorage.
  useEffect(() => {
    if (!data?.bill) return;
    let cancelled = false;
    console.log("[RECEIPT-PIPE] 1b. Generating receipt assets (self-contained)");
    generateReceiptAssets(data.bill).then((a) => {
      if (cancelled) return;
      console.log("[RECEIPT-PIPE] 1c. Receipt assets generated", {
        hasLogo: !!a.logoDataUrl, hasQr: !!a.qrCodeUrl, hasIos: !!a.iosQrUrl, hasAndroid: !!a.androidQrUrl,
      });
      setAssets(a);
    });
    return () => { cancelled = true; };
  }, [data]);

  // Expected tracked images: logo + rewards QR + 2 app QRs (only the ones we
  // generated / that are present). Counted from `assets`, not from caller data.
  const expected =
    (assets?.logoDataUrl ? 1 : 0) +
    (assets?.qrCodeUrl ? 1 : 0) +
    (assets?.iosQrUrl ? 1 : 0) +
    (assets?.androidQrUrl ? 1 : 0);

  const markLoaded = (e) => {
    const alt = e?.target?.alt || "unknown";
    loadedRef.current += 1;
    lastLoadAtRef.current = Date.now();
    console.log(`[RECEIPT-PIPE] 2. Image loaded: "${alt}" (${loadedRef.current}/${expected})`);
    setLoaded(loadedRef.current);
  };

  // Serialize the computed layout of every label/value receipt row so the audit
  // can distinguish a DOM-layout bug from a print-engine / printer-driver collapse.
  // ReceiptTemplate uses pure inline styles (no classes), so we find rows by
  // structure: a flex + space-between div with exactly two children.
  const serializeReceiptRows = (tag) => {
    const root = document.getElementById("receipt");
    if (!root) { console.log(`[RECEIPT-PIPE] ${tag} — no #receipt element`); return; }
    const rootRect = root.getBoundingClientRect();
    const rows = Array.from(root.querySelectorAll("div")).filter((n) => {
      if (n.children.length !== 2) return false;
      const cs = getComputedStyle(n);
      return cs.display === "flex" && cs.justifyContent === "space-between";
    });
    console.log(`[RECEIPT-PIPE] ${tag} — receipt width: ${root.clientWidth}px, rows found: ${rows.length}`);
    rows.forEach((r, i) => {
      const cs = getComputedStyle(r);
      const kids = Array.from(r.children);
      const labelEl = kids[0];
      const valueEl = kids[1];
      const lr = labelEl.getBoundingClientRect();
      const vr = valueEl.getBoundingClientRect();
      console.log(`[RECEIPT-PIPE] ${tag} Row ${i + 1}`, {
        label: (labelEl.textContent || "").trim().slice(0, 32),
        value: (valueEl.textContent || "").trim().slice(0, 32),
        display: cs.display,
        position: cs.position,
        justifyContent: cs.justifyContent,
        width: cs.width,
        left: cs.left,
        right: cs.right,
        clientWidth: r.clientWidth,
        rowRect: r.getBoundingClientRect(),
        labelX: Math.round(lr.left - rootRect.left),
        labelRight: Math.round(lr.right - rootRect.left),
        valueX: Math.round(vr.left - rootRect.left),
        valueRight: Math.round(vr.right - rootRect.left),
      });
    });
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

  // Confirm the shared ReceiptTemplate actually mounted into the DOM
  useEffect(() => {
    if (!data) return;
    requestAnimationFrame(() => {
      const el = document.getElementById("receipt");
      console.log("[RECEIPT-PIPE] 0. ReceiptTemplate rendered in DOM:", !!el,
        el ? `(${el.children.length} top-level children, ${Math.round(el.getBoundingClientRect().height)}px tall)` : ">>> MISSING <<<");
    });
  }, [data, assets]);

  // Print gate: all images loaded + fonts ready + 300ms since last load.
  const doPrint = () => {
    if (printedRef.current) return;
    printedRef.current = true;
    console.log("[RECEIPT-PIPE] 4. doPrint() fired — images + fonts ready");
    const pw = data.paperWidth === 58 ? 58 : 80;
    const el = document.getElementById("receipt");
    // STEP 1: confirm which URL receives window.print()
    console.log("[RECEIPT-PIPE] 5. Printing URL:", window.location.pathname);
    // STEP 2 + 7: dump the exact DOM being printed + verify it is the new shared template
    console.log("[RECEIPT-PIPE] 6. outerHTML being printed (#receipt):", el ? el.outerHTML : "NOT FOUND");
    const txt = el ? el.textContent || "" : "";
    const hasNewTemplate = /Invoice No\.|Reward Points|TOTAL|Earn Rewards/.test(txt);
    console.log("[RECEIPT-PIPE] 7. New shared ReceiptTemplate present in print DOM:", hasNewTemplate,
      hasNewTemplate ? "" : ">>> STALE/CACHED BUNDLE SUSPECTED — the print tab is NOT running the new code <<<");
    // Measure the fully-laid-out receipt and fit the @page to it (the fix for
    // the A4 fallback — `size: Wmm auto` is invalid and was being dropped).
    if (el && pageStyleRef.current) {
      const mmH = el.scrollHeight * MM_PER_PX;
      console.log("[RECEIPT-PIPE] 8. Receipt measured:", el.scrollHeight, "px ->", Math.ceil(mmH) + 1, "mm");
      pageStyleRef.current.textContent =
        `@page { size: ${pw}mm ${Math.ceil(mmH) + 1}mm; margin: 0; }`;
    } else {
      console.log("[RECEIPT-PIPE] 8. Receipt measured: SKIPPED (no #receipt or no @page style)");
    }
    // Two rAF so the browser applies the measured page size before printing.
    console.log("[RECEIPT-PIPE] 9. Awaiting 2x requestAnimationFrame before window.print()...");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        console.log("[RECEIPT-PIPE] 10. Calling window.print() — the ONLY print call in the pipeline");
        // Serialize computed layout of every receipt row IMMEDIATELY before print.
        // If labelX≈0 and valueRight≈receipt width here, the flex layout is already
        // correct on screen — any paper collapse is the print engine / driver.
        serializeReceiptRows("BEFORE PRINT");
        try { window.print(); } catch (e) { console.log("[RECEIPT-PIPE] window.print() threw:", e?.message || e); }
        setTimeout(() => { console.log("[RECEIPT-PIPE] 12. window.close() after 1200ms"); try { window.close(); } catch (e) {} }, 1200);
      })
    );
  };

  useEffect(() => {
    if (printedRef.current || !data) return;
    if (!assets) return;
    console.log("[RECEIPT-PIPE] gate check:", { loaded, expected, fontsReady, assetsReady: true, ready: loaded >= expected && fontsReady });
    if (loaded < expected || !fontsReady) return;
    const wait = Math.max(0, 300 - (Date.now() - lastLoadAtRef.current));
    console.log("[RECEIPT-PIPE] gate passed — scheduling doPrint in", wait, "ms");
    const timer = setTimeout(doPrint, wait);
    return () => clearTimeout(timer);
  }, [loaded, expected, fontsReady, data, assets]);

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
    const onAfterPrint = () => {
      console.log("[RECEIPT-PIPE] 11. window.afterprint fired");
      // Re-serialize after print. If it matches BEFORE PRINT, the DOM layout was
      // NOT mutated by the print cycle — divergence is print-engine / driver.
      serializeReceiptRows("AFTER PRINT");
    };
    window.addEventListener("beforeprint", print);
    window.addEventListener("afterprint", screen);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", print);
      window.removeEventListener("afterprint", screen);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [data]);

  if (!data) {
    return <div style={{ padding: 20, fontFamily: "'Courier New', monospace" }}>Loading receipt…</div>;
  }

  // THE receipt markup lives in ReceiptTemplate — identical to the preview.
  return (
    <ReceiptTemplate
      bill={data.bill}
      qrCodeUrl={assets?.qrCodeUrl || ""}
      iosQrUrl={assets?.iosQrUrl || ""}
      androidQrUrl={assets?.androidQrUrl || ""}
      logoDataUrl={assets?.logoDataUrl || ""}
      paperWidth={data.paperWidth}
      onImageLoad={markLoaded}
    />
  );
}