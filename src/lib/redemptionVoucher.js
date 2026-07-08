import { jsPDF } from "jspdf";

// Generates an 80mm thermal-style PDF voucher with the redemption code, so a
// customer can save/print it and show the barista. The code is the source of
// truth — the barista verifies it at the counter (verifyRewardCode backend fn).
export function printRedemptionVoucher({
  reward_name,
  points_spent,
  redemption_code,
  customer_email,
  date
}) {
  const doc = new jsPDF({ unit: "mm", format: [80, 130], orientation: "portrait" });
  const W = 80;
  const cx = W / 2;
  let y = 9;

  const center = (text, size, bold = false) => {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, cx, y, { align: "center" });
  };
  const line = () => {
    doc.setLineWidth(0.2);
    doc.line(6, y, W - 6, y);
  };

  center("BEAN", 18, true); y += 7;
  center("More than just coffee, it's a community!", 7); y += 6;
  line(); y += 5;

  center("REWARD VOUCHER", 11, true); y += 7;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  const nameLines = doc.splitTextToSize(reward_name || "Reward", W - 12);
  doc.text(nameLines, cx, y, { align: "center" }); y += nameLines.length * 4 + 3;

  line(); y += 5;
  center("REDEMPTION CODE", 8, true); y += 6;
  center(redemption_code || "—", 18, true); y += 9;
  center(`${points_spent || 0} points`, 9); y += 6;
  line(); y += 5;

  center("Show this code to our barista", 7); y += 5;
  center("Valid for ONE redemption only", 7.5, true); y += 5;
  if (date) { center(date, 7); y += 5; }
  if (customer_email) {
    doc.setFontSize(7);
    const eLines = doc.splitTextToSize(customer_email, W - 12);
    doc.text(eLines[0] || "", cx, y, { align: "center" }); y += 5;
  }
  y += 3;
  line(); y += 5;
  center("Bean — Thank you! \u2615", 8);

  doc.save(`Bean-Voucher-${redemption_code || "code"}.pdf`);
}