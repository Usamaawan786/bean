import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import VoucherCard from "@/components/vouchers/VoucherCard";
import { printVoucher } from "@/lib/printVoucher";

// The 80mm logo used on receipts — loaded as a data URL so it is always ready
// when the card prints.
const LOGO_URL = "https://media.base44.com/images/public/6976cd7fe6e4b20fcb30cf61/f3d3c0edf_Group1302.png";

export default function VoucherPrintStage({ voucher, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");

  useEffect(() => {
    if (!voucher?.code) return;
    QRCode.toDataURL(voucher.code, { width: 260, margin: 1, color: { dark: "#000000", light: "#FFFFFF" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(LOGO_URL);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => { if (!cancelled && reader.result) setLogoDataUrl(reader.result); };
        reader.readAsDataURL(blob);
      } catch (e) { /* the card still prints without the logo */ }
    })();
    return () => { cancelled = true; };
  }, [voucher?.code]);

  // Safety net: never leave the injected print stylesheet behind (mobile WebViews
  // don't reliably fire afterprint).
  useEffect(() => () => {
    const s = document.getElementById("print-size");
    if (s) s.remove();
  }, []);

  // Portaled to <body> so #voucher lives outside #root — the print stylesheet
  // hides everything except this stage.
  return createPortal(
    <>
      <div data-receipt-backdrop className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div data-receipt-stage
        className="fixed inset-0 z-50 overflow-auto flex flex-col items-center p-4"
        style={{ background: "#eeeeee" }}>

        <div data-receipt-toolbar
          className="sticky top-0 z-10 mb-4 flex items-center gap-2 flex-wrap justify-center bg-white rounded-2xl shadow-lg p-3 max-w-2xl w-full">
          <h2 className="text-lg font-bold text-[#5C4A3A] mr-1">Discount Voucher</h2>
          <Button size="sm" variant="outline" onClick={() => printVoucher()} disabled={!qrDataUrl} className="rounded-xl border-[#E8DED8]">
            {qrDataUrl
              ? <><Printer className="h-4 w-4 mr-2" />Print Voucher</>
              : <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Preparing…</>}
          </Button>
          <button type="button" onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 hover:bg-[#F5EBE8] rounded-full transition-colors ml-auto text-[#5C4A3A] font-medium text-sm">
            <X className="h-5 w-5 text-[#8B7355]" /> Close
          </button>
        </div>

        <VoucherCard voucher={voucher} qrDataUrl={qrDataUrl} logoDataUrl={logoDataUrl} />

        <p data-receipt-toolbar className="text-xs text-[#8B7355] mt-3 text-center max-w-xs">
          Cut along the line and hand the card to the customer — it can be honoured once, before the expiry date.
        </p>
      </div>
    </>,
    document.body
  );
}