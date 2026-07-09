import { useEffect, useRef, useState } from "react";
import ReceiptTemplate from "@/components/admin/ReceiptTemplate";

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
//  • window.print() fires only after: document.fonts.ready AND every tracked
//    image onLoad/onError, then 300ms settle + two requestAnimationFrame cycles
//    (after measuring + setting @page). Then window.close() after 1200ms.
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
    return <div style={{ padding: 20, fontFamily: "'Courier New', monospace" }}>Loading receipt…</div>;
  }

  // THE receipt markup lives in ReceiptTemplate — identical to the preview.
  return (
    <ReceiptTemplate
      bill={data.bill}
      qrCodeUrl={data.qrCodeUrl}
      iosQrUrl={data.iosQrUrl}
      androidQrUrl={data.androidQrUrl}
      logoDataUrl={data.logoDataUrl}
      paperWidth={data.paperWidth}
      onImageLoad={markLoaded}
    />
  );
}