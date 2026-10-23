import { utcToPktDisplay } from "@/lib/pktTime";

// THE discount voucher card — the single element shown on screen and printed.
// Sized 80mm × 50mm (the thermal roll width × a wallet-friendly height), so what
// the customer keeps matches what the cashier previewed.
//
// Pure inline styles + mm units, exactly like Receipt.jsx, so Tailwind classes
// and global resets can never distort the card at print time.
const SANS = "Arial, Helvetica, sans-serif";
const MONO = "'Courier New', Courier, monospace";
const BROWN = "#8B7355";
const BROWN_DEEP = "#6B5744";
const INK = "#5C4A3A";
const CREAM = "#E8DED8";
const SAND = "#D4C4B0";
const ACCENT = "#F4D35E";

export default function VoucherCard({ voucher, qrDataUrl, logoDataUrl }) {
  const pct = Number(voucher?.discount_pct || 0);
  const validTill = voucher?.expires_at
    ? utcToPktDisplay(voucher.expires_at).split(" ").slice(0, 3).join(" ")
    : "";

  return (
    <div id="voucher" style={{
      position: "relative",
      width: "80mm",
      height: "50mm",
      boxSizing: "border-box",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      background: "#FFFFFF",
      border: `0.4mm solid ${CREAM}`,
      borderRadius: "3mm",
      fontFamily: SANS,
      color: INK,
      boxShadow: "0 4px 18px rgba(0,0,0,0.15)",
    }}>
      {/* Brand header */}
      <div style={{
        height: "9mm",
        flexShrink: 0,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: "2mm",
        padding: "0 3mm",
        background: `linear-gradient(135deg, ${BROWN} 0%, ${BROWN_DEEP} 55%, ${INK} 100%)`,
      }}>
        {logoDataUrl ? (
          <img src={logoDataUrl} alt="" style={{ width: "5.5mm", height: "5.5mm", objectFit: "contain", display: "block" }} />
        ) : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "9pt", fontWeight: 700, letterSpacing: "0.6mm", color: "#FFFFFF", lineHeight: 1 }}>BEAN</div>
          <div style={{ fontSize: "4.4pt", color: CREAM, lineHeight: 1.2, marginTop: "0.4mm" }}>More than just coffee, it's a community!</div>
        </div>
        <div style={{
          fontSize: "5.2pt", fontWeight: 700, letterSpacing: "0.45mm", color: ACCENT,
          border: "0.25mm solid rgba(255,255,255,0.4)", borderRadius: "1.2mm", padding: "0.7mm 1.6mm",
        }}>VOUCHER</div>
      </div>

      {/* Body: offer + tear-off code */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, boxSizing: "border-box" }}>
        <div style={{ flex: 1, minWidth: 0, padding: "3mm 2.5mm 2.4mm 3mm", boxSizing: "border-box" }}>
          <div style={{ fontSize: "4.8pt", fontWeight: 700, letterSpacing: "0.45mm", color: BROWN }}>ONE-TIME DISCOUNT</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "1.2mm", marginTop: "0.5mm" }}>
            <span style={{ fontSize: "24pt", fontWeight: 700, color: INK, lineHeight: 1, letterSpacing: "-0.3mm" }}>{pct}%</span>
            <span style={{ fontSize: "10pt", fontWeight: 700, color: BROWN }}>OFF</span>
          </div>
          <div style={{ fontSize: "7pt", fontWeight: 700, color: INK, marginTop: "0.5mm" }}>on your next visit</div>
          <div style={{
            display: "inline-block", background: ACCENT, color: INK, fontSize: "4.8pt", fontWeight: 700,
            letterSpacing: "0.4mm", borderRadius: "3mm", padding: "0.9mm 2mm", marginTop: "1.8mm",
          }}>SINGLE USE ONLY</div>
          <div style={{ marginTop: "2mm", borderTop: `0.3mm dashed ${CREAM}`, paddingTop: "1.5mm" }}>
            <div style={{ fontSize: "5.4pt", color: BROWN }}>
              Valid until <span style={{ color: INK, fontWeight: 700 }}>{validTill}</span>
            </div>
            <div style={{ fontSize: "4.4pt", color: BROWN, marginTop: "0.5mm" }}>
              One voucher per visit · Not valid with other offers
            </div>
          </div>
        </div>

        {/* Perforation */}
        <div style={{ width: "0.3mm", borderLeft: `0.3mm dashed ${SAND}` }} />

        {/* Code + QR */}
        <div style={{
          width: "32mm", boxSizing: "border-box", padding: "2.6mm 2mm",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
        }}>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Voucher QR" style={{ width: "20mm", height: "20mm", display: "block" }} />
          ) : (
            <div style={{ width: "20mm", height: "20mm", border: `0.3mm solid ${CREAM}` }} />
          )}
          <div style={{
            fontFamily: MONO, fontSize: "5.4pt", fontWeight: 700, letterSpacing: "0.1mm",
            color: INK, marginTop: "1.3mm", whiteSpace: "nowrap",
          }}>{voucher?.code}</div>
          <div style={{ fontSize: "4.2pt", color: BROWN, marginTop: "0.7mm" }}>Show at the counter</div>
        </div>
      </div>

      {/* Perforation notches (clipped by overflow, giving the tear-off bite) */}
      <div style={{ position: "absolute", left: "45.8mm", top: "-1.5mm", width: "3mm", height: "3mm", borderRadius: "50%", border: `0.25mm solid ${SAND}` }} />
      <div style={{ position: "absolute", left: "45.8mm", bottom: "-1.5mm", width: "3mm", height: "3mm", borderRadius: "50%", border: `0.25mm solid ${SAND}` }} />
    </div>
  );
}