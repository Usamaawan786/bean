import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { utcToPktDisplay } from "@/lib/pktTime";

// ─────────────────────────────────────────────────────────────────────────
// THE discount-voucher card design, as a print-ready PDF.
//
// Page size is fixed to the ID-1 card standard: 85.6 × 54 mm — the same as a
// bank card, driving licence or ID card, so the printed voucher slips into a
// wallet. Print at 100% (no scaling) and cut along the faint guide.
//
// One page = one voucher. The batch download puts all 100 designs in a single
// PDF, one card per page, which is what a print shop can run straight off.
// ─────────────────────────────────────────────────────────────────────────

export const CARD_W = 85.6;
export const CARD_H = 54;
export const BRAND_LOGO_URL = "https://media.base44.com/images/public/6976cd7fe6e4b20fcb30cf61/f3d3c0edf_Group1302.png";

const BROWN = [139, 115, 85];      // #8B7355
const BROWN_DEEP = [92, 74, 58];   // #5C4A3A
const CREAM = [232, 222, 216];     // #E8DED8
const SAND = [212, 196, 176];      // #D4C4B0
const ACCENT = [244, 211, 94];     // #F4D35E
const INK = [92, 74, 58];

function gradientBand(doc, x, y, w, h, from, to, slices = 64) {
  const step = w / slices;
  for (let i = 0; i < slices; i++) {
    const t = i / (slices - 1);
    doc.setFillColor(
      Math.round(from[0] + (to[0] - from[0]) * t),
      Math.round(from[1] + (to[1] - from[1]) * t),
      Math.round(from[2] + (to[2] - from[2]) * t)
    );
    doc.rect(x + i * step, y, step + 0.15, h, "F");
  }
}

function dashed(doc, on) {
  if (typeof doc.setLineDashPattern === "function") {
    doc.setLineDashPattern(on ? [0.9, 0.9] : [], 0);
  }
}

export function drawVoucherCard(doc, voucher, assets = {}, ox = 0, oy = 0) {
  const pct = Number(voucher?.discount_pct || 0);
  const code = String(voucher?.code || "");
  const validTill = voucher?.expires_at
    ? utcToPktDisplay(voucher.expires_at).split(" ").slice(0, 3).join(" ")
    : "";
  const { qrDataUrl, logoDataUrl } = assets;

  // Card face
  doc.setFillColor(255, 255, 255);
  doc.rect(ox, oy, CARD_W, CARD_H, "F");

  // Brand header band (drawn as fine slices → a real gradient)
  gradientBand(doc, ox, oy, CARD_W, 9.5, BROWN, BROWN_DEEP);

  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", ox + 3.2, oy + 1.6, 6.3, 6.3); } catch (e) { /* text wordmark still lands */ }
  }
  const wordX = logoDataUrl ? ox + 11 : ox + 4.2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("BEAN", wordX, oy + 5.1, { charSpace: 0.5 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.4);
  doc.setTextColor(CREAM[0], CREAM[1], CREAM[2]);
  doc.text("More than just coffee, it's a community!", wordX, oy + 7.9);

  // Title pill
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.6);
  const pillText = "DISCOUNT VOUCHER";
  const pillW = doc.getTextWidth(pillText) + 4.6;
  const pillX = ox + CARD_W - 3.4 - pillW;
  doc.setDrawColor(SAND[0], SAND[1], SAND[2]);
  doc.setLineWidth(0.25);
  doc.roundedRect(pillX, oy + 2.5, pillW, 4.6, 1.4, 1.4, "S");
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.text(pillText, pillX + 2.3, oy + 5.7, { charSpace: 0.25 });

  // Offer
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.6);
  doc.setTextColor(BROWN[0], BROWN[1], BROWN[2]);
  doc.text("COMPLIMENTS FROM BEAN", ox + 3.6, oy + 14.4, { charSpace: 0.4 });

  doc.setFontSize(26);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(`${pct}%`, ox + 3.3, oy + 24.6);
  const bigW = doc.getTextWidth(`${pct}%`);
  doc.setFontSize(11);
  doc.setTextColor(BROWN[0], BROWN[1], BROWN[2]);
  doc.text("OFF", ox + 3.3 + bigW + 1.6, oy + 24.6);

  doc.setFontSize(7.4);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text("on your next visit", ox + 3.6, oy + 28.8);

  // Single-use badge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  const useText = "SINGLE USE ONLY";
  const useW = doc.getTextWidth(useText) + 5;
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.roundedRect(ox + 3.6, oy + 30.8, useW, 4.6, 2.3, 2.3, "F");
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(useText, ox + 6.1, oy + 34, { charSpace: 0.3 });

  // Terms
  doc.setDrawColor(CREAM[0], CREAM[1], CREAM[2]);
  doc.setLineWidth(0.3);
  dashed(doc, true);
  doc.line(ox + 3.6, oy + 38.4, ox + 48.8, oy + 38.4);
  dashed(doc, false);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);
  doc.setTextColor(BROWN[0], BROWN[1], BROWN[2]);
  doc.text(`Valid until ${validTill}`, ox + 3.6, oy + 42.6);
  doc.setFontSize(4.2);
  doc.text("One voucher per visit · Not valid with other offers", ox + 3.6, oy + 46.6);

  // Perforation + notches between offer and code
  doc.setDrawColor(SAND[0], SAND[1], SAND[2]);
  doc.setLineWidth(0.3);
  dashed(doc, true);
  doc.line(ox + 51.8, oy + 11, ox + 51.8, oy + CARD_H);
  dashed(doc, false);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(CREAM[0], CREAM[1], CREAM[2]);
  doc.circle(ox + 51.8, oy, 1.7, "FD");
  doc.circle(ox + 51.8, oy + CARD_H, 1.7, "FD");

  // QR + code
  const qrSize = 20;
  const colCenter = ox + 67.6;
  if (qrDataUrl) {
    try { doc.addImage(qrDataUrl, "PNG", colCenter - qrSize / 2, oy + 13.4, qrSize, qrSize); } catch (e) { /* code below still identifies it */ }
  } else {
    doc.setDrawColor(CREAM[0], CREAM[1], CREAM[2]);
    doc.setLineWidth(0.3);
    doc.rect(colCenter - qrSize / 2, oy + 13.4, qrSize, qrSize, "S");
  }
  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(code, colCenter, oy + 39.6, { align: "center", charSpace: 0.5 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.2);
  doc.setTextColor(BROWN[0], BROWN[1], BROWN[2]);
  doc.text("Show at the counter", colCenter, oy + 43.8, { align: "center" });

  // Cut guide
  doc.setDrawColor(CREAM[0], CREAM[1], CREAM[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(ox + 0.3, oy + 0.3, CARD_W - 0.6, CARD_H - 0.6, 2.4, 2.4, "S");
}

function newCardDoc() {
  return new jsPDF({ orientation: "landscape", unit: "mm", format: [CARD_W, CARD_H] });
}

// One voucher → one card-sized PDF.
export function downloadVoucherPdf(voucher, assets) {
  try {
    const doc = newCardDoc();
    drawVoucherCard(doc, voucher, assets);
    doc.save(`Bean-Voucher-${voucher.code}.pdf`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// All vouchers → a single PDF, one card per page (what the printer runs off).
export function downloadVoucherBatchPdf(vouchers, assets) {
  try {
    const doc = newCardDoc();
    vouchers.forEach((v, i) => {
      if (i > 0) doc.addPage([CARD_W, CARD_H], "landscape");
      drawVoucherCard(doc, v, { ...assets, qrDataUrl: assets?.qrDataUrls?.[v.code] || "" });
    });
    doc.save(`Bean-Discount-Vouchers-${vouchers.length}-cards.pdf`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// QR payload is the code itself, so the printed code and the QR always agree.
export async function buildVoucherQrMap(codes) {
  const map = {};
  await Promise.all(codes.map(async (code) => {
    try {
      map[code] = await QRCode.toDataURL(String(code), {
        width: 320, margin: 1, color: { dark: "#000000", light: "#FFFFFF" },
      });
    } catch (e) {
      map[code] = "";
    }
  }));
  return map;
}

export async function loadBrandLogo() {
  try {
    const res = await fetch(BRAND_LOGO_URL);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return "";
  }
}