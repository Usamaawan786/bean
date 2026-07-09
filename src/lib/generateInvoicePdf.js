import { jsPDF } from "jspdf";
import { format } from "date-fns";

// The A4 invoice PDF — a separate downloadable document (NOT the thermal
// receipt). The thermal receipt is never converted to a PDF; it is printed
// directly via printReceipt.js. This is the only download the app produces.
//
// Returns { ok: true } on success or { ok: false, error } on failure; the
// caller is responsible for surfacing the error to the user.

export function generateInvoicePdf(bill, qrUrl, iosUrl, androidUrl, logoUrl) {
  try {
    // Branded A4 invoice matching the on-screen POS design (beige / brown).
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210, pageH = 297;
    const margin = 18;
    const left = margin;
    const right = pageW - margin;
    const contentW = right - left;
    const center = pageW / 2;

    const brown = [92, 74, 58];       // #5C4A3A
    const brownSec = [139, 115, 85]; // #8B7355
    const border = [232, 222, 216];  // #E8DED8
    const accent = [245, 235, 232];  // #F5EBE8

    let y = margin;
    const ensureSpace = (need) => {
      if (y + need > pageH - margin) { doc.addPage(); y = margin; }
    };

    // --- Header: logo + brand ---
    if (logoUrl) {
      try { doc.addImage(logoUrl, "PNG", center - 11, y, 22, 22); } catch (e) {}
      y += 26;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...brown);
    doc.text("Bean", center, y, { align: "center" });
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...brownSec);
    doc.text("More than just coffee, it's a community!", center, y, { align: "center" });
    y += 8;

    // --- Invoice meta band ---
    const bandH = 18;
    doc.setFillColor(...accent);
    doc.roundedRect(left, y, contentW, bandH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...brown);
    doc.text("INVOICE", left + 5, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...brownSec);
    doc.text(`No. ${bill.billNumber}`, right - 5, y + 7, { align: "right" });
    doc.text(format(new Date(bill.date), "MMM dd, yyyy HH:mm"), right - 5, y + 14, { align: "right" });
    y += bandH + 6;

    // --- Customer info ---
    if (bill.customerInfo?.name || bill.customerInfo?.phone) {
      doc.setFontSize(9);
      if (bill.customerInfo.name) {
        doc.setTextColor(...brownSec); doc.text("Customer", left, y);
        doc.setTextColor(...brown); doc.setFont("helvetica", "bold");
        doc.text(String(bill.customerInfo.name), left + 25, y);
        doc.setFont("helvetica", "normal");
        y += 6;
      }
      if (bill.customerInfo.phone) {
        doc.setTextColor(...brownSec); doc.text("Phone", left, y);
        doc.setTextColor(...brown); doc.setFont("helvetica", "bold");
        doc.text(String(bill.customerInfo.phone), left + 25, y);
        doc.setFont("helvetica", "normal");
        y += 6;
      }
      y += 4;
    }

    // --- Items table ---
    const colQty = left + contentW - 78;
    const colPrice = left + contentW - 44;
    const colTotal = right - 5;
    doc.setFillColor(...accent);
    doc.rect(left, y, contentW, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...brown);
    doc.text("Item", left + 4, y + 6);
    doc.text("Qty", colQty + 8, y + 6, { align: "center" });
    doc.text("Price", colPrice, y + 6, { align: "right" });
    doc.text("Total", colTotal, y + 6, { align: "right" });
    y += 9;
    bill.items.forEach((item) => {
      ensureSpace(11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...brown);
      doc.text(String(item.name).slice(0, 42), left + 4, y + 6);
      doc.setTextColor(...brownSec);
      doc.text(String(item.quantity), colQty + 8, y + 6, { align: "center" });
      doc.text(`PKR ${item.price.toFixed(2)}`, colPrice, y + 6, { align: "right" });
      doc.setTextColor(...brown);
      doc.setFont("helvetica", "bold");
      doc.text(`PKR ${(item.price * item.quantity).toFixed(2)}`, colTotal, y + 6, { align: "right" });
      doc.setDrawColor(...border); doc.setLineWidth(0.2);
      doc.line(left, y + 9, right, y + 9);
      y += 9;
    });
    y += 6;

    // --- Totals (right-aligned column) ---
    const labelX = right - 60;
    const valueX = right - 4;
    const totalsRow = (label, value, opts = {}) => {
      ensureSpace(9);
      doc.setFont("helvetica", opts.bold ? "bold" : "normal");
      doc.setFontSize(opts.size || 9);
      doc.setTextColor(...(opts.color || brownSec));
      doc.text(label, labelX, y + 5);
      doc.setTextColor(...(opts.valueColor || brown));
      doc.text(value, valueX, y + 5, { align: "right" });
      y += (opts.size || 9) > 11 ? 8 : 6;
    };
    if (bill.discountPct > 0) {
      totalsRow("Subtotal", `PKR ${(bill.originalSubtotal ?? bill.subtotal).toFixed(2)}`);
      totalsRow(`Discount (${bill.discountPct}%)`, `- PKR ${(bill.discountAmount ?? 0).toFixed(2)}`, { color: [220, 38, 38], valueColor: [220, 38, 38] });
    } else {
      totalsRow("Subtotal", `PKR ${bill.subtotal.toFixed(2)}`);
    }
    const gstLabel = bill.paymentMethod === "Card" ? "5%" : "17%";
    totalsRow(`GST (${gstLabel})`, `PKR ${bill.tax.toFixed(2)}`);
    ensureSpace(8);
    doc.setDrawColor(...brown); doc.setLineWidth(0.5);
    doc.line(labelX, y, valueX, y);
    y += 4;
    totalsRow("TOTAL", `PKR ${bill.total.toFixed(2)}`, { bold: true, size: 13, color: brown, valueColor: brown });
    y += 4;

    // --- Reward points pill ---
    ensureSpace(12);
    const pts = bill.pointsToAward ?? Math.floor(bill.subtotal / 100);
    doc.setFillColor(...accent);
    doc.roundedRect(labelX, y, valueX - labelX, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...brown);
    doc.text("Reward Points Earned", labelX + 4, y + 6.5);
    doc.setFontSize(11);
    doc.text(`${pts} pts`, valueX - 4, y + 6.5, { align: "right" });
    y += 12;

    // --- Rewards QR section ---
    if (qrUrl) {
      ensureSpace(50);
      doc.setDrawColor(...border); doc.setLineWidth(0.3);
      doc.line(left, y, right, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...brown);
      doc.text("Earn Rewards", center, y, { align: "center" });
      y += 4;
      const qrSize = 34;
      try { doc.addImage(qrUrl, "PNG", center - qrSize / 2, y, qrSize, qrSize); } catch (e) {}
      y += qrSize + 3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...brownSec);
      doc.text("Scan in the Bean Pakistan App to add points", center, y, { align: "center" });
      y += 5;
      if (bill.qrCodeId) {
        doc.setFontSize(7);
        doc.text("or enter code manually:", center, y, { align: "center" });
        y += 4;
        const codeW = Math.min(contentW, 14 + bill.qrCodeId.length * 2.6);
        doc.setFillColor(...accent);
        doc.roundedRect(center - codeW / 2, y, codeW, 8, 2, 2, "F");
        doc.setFont("courier", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...brown);
        doc.text(bill.qrCodeId, center, y + 5.5, { align: "center" });
        y += 12;
      }
    }

    // --- App download QRs + footer (all on same page) ---
    const qrSm = 24, gapSm = 10;
    const appSectionH = 6 + 5 + qrSm + 4 + 6 + 5 + 5;
    ensureSpace(appSectionH);
    doc.setDrawColor(...border); doc.setLineWidth(0.3);
    doc.line(left, y, right, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...brown);
    doc.text("Don't have the app? Download & scan", center, y, { align: "center" });
    y += 4;
    const startX = center - (qrSm * 2 + gapSm) / 2;
    if (iosUrl) { try { doc.addImage(iosUrl, "PNG", startX, y, qrSm, qrSm); } catch (e) {} }
    if (androidUrl) { try { doc.addImage(androidUrl, "PNG", startX + qrSm + gapSm, y, qrSm, qrSm); } catch (e) {} }
    y += qrSm + 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...brownSec);
    if (iosUrl) doc.text("iOS", startX + qrSm / 2, y, { align: "center" });
    if (androidUrl) doc.text("Android", startX + qrSm + gapSm + qrSm / 2, y, { align: "center" });
    y += 6;

    // --- Footer ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...brown);
    doc.text("Thank you for your purchase!", center, y, { align: "center" });
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...brownSec);
    doc.text("Bean — More than just coffee, it's a community!", center, y, { align: "center" });

    doc.save(`invoice-${bill.billNumber}.pdf`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}