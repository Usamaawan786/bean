import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";
import Receipt from "@/components/admin/Receipt";
import { printReceipt } from "@/lib/printReceipt";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";

const PAPER_WIDTH_KEY = "thermalPaperWidth";

const IOS_APP_URL = "https://apps.apple.com/pk/app/bean-pakistan/id6758788396";
const ANDROID_APP_URL = "https://play.google.com/store/apps/details?id=com.base6976cd7fe6e4b20fcb30cf61.app";
const LOGO_URL = "https://media.base44.com/images/public/6976cd7fe6e4b20fcb30cf61/f3d3c0edf_Group1302.png";

export default function BillGenerator({ bill, onClose }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [iosQrUrl, setIosQrUrl] = useState("");
  const [androidQrUrl, setAndroidQrUrl] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [paperWidth, setPaperWidth] = useState(() => {
    const saved = localStorage.getItem(PAPER_WIDTH_KEY);
    return saved === "58" ? 58 : 80;
  });

  const setWidth = (w) => {
    setPaperWidth(w);
    localStorage.setItem(PAPER_WIDTH_KEY, String(w));
  };

  // Shared receipt assets (QR codes + logo) for the on-screen <Receipt> preview
  // and the A4 invoice PDF. The thermal print itself needs no assets here —
  // it prints the already-rendered #receipt element directly.
  useEffect(() => {
    if (bill.qrCodeId) {
      QRCode.toDataURL(bill.qrCodeId, { width: 200, margin: 1 })
        .then(setQrCodeUrl)
        .catch(() => setQrCodeUrl(""));
    }
    QRCode.toDataURL(IOS_APP_URL, { width: 160, margin: 1 }).then(setIosQrUrl).catch(() => {});
    QRCode.toDataURL(ANDROID_APP_URL, { width: 160, margin: 1 }).then(setAndroidQrUrl).catch(() => {});
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(LOGO_URL);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => { if (!cancelled && reader.result) setLogoDataUrl(reader.result); };
        reader.readAsDataURL(blob);
      } catch (e) { /* logo stays empty — receipt continues without image */ }
    })();
    return () => { cancelled = true; };
  }, [bill.qrCodeId]);

  const assetsReady = !!(iosQrUrl && androidQrUrl && logoDataUrl);

  // Print: open the browser print dialog on the current page. printReceipt
  // isolates #receipt (this very element) via @media print — no separate page.
  const handlePrint = () => printReceipt(paperWidth);

  // Download: the A4 invoice PDF (a separate document, not the thermal receipt).
  const handleDownload = () => {
    const res = generateInvoicePdf(bill, qrCodeUrl, iosQrUrl, androidQrUrl, logoDataUrl);
    if (!res.ok) toast.error(`PDF generation failed: ${res.error}`);
  };

  // Portaled to <body> so #receipt lives OUTSIDE #root — printReceipt hides
  // #root and the overlay chrome, leaving #receipt as the only printed content.
  return createPortal(
    <>
      <div data-receipt-backdrop className="fixed inset-0 bg-black/50 z-40" />

      <div data-receipt-stage
        className="fixed inset-0 z-50 overflow-auto flex flex-col items-center p-4"
        style={{ background: "#eeeeee" }}>

        <div data-receipt-toolbar
          className="sticky top-0 z-10 mb-4 flex items-center gap-2 flex-wrap justify-center bg-white rounded-2xl shadow-lg p-3 max-w-2xl w-full">
          <h2 className="text-lg font-bold text-[#5C4A3A] mr-1">Receipt</h2>
          <Button size="sm" variant="outline" onClick={handlePrint} disabled={!assetsReady} className="rounded-xl">
            {assetsReady
              ? <><Printer className="h-4 w-4 mr-2" />Print Receipt</>
              : <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Preparing…</>}
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload} disabled={!assetsReady} className="rounded-xl">
            <Download className="h-4 w-4 mr-2" />Download Invoice
          </Button>
          <div className="flex bg-[#F5EBE8] rounded-full p-0.5 border border-[#E8DED8]">
            <button onClick={() => setWidth(58)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${paperWidth === 58 ? "bg-[#5C4A3A] text-white" : "text-[#8B7355]"}`}>
              58mm
            </button>
            <button onClick={() => setWidth(80)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${paperWidth === 80 ? "bg-[#5C4A3A] text-white" : "text-[#8B7355]"}`}>
              80mm
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F5EBE8] rounded-full transition-colors ml-auto">
            <X className="h-5 w-5 text-[#8B7355]" />
          </button>
        </div>

        {/* The receipt preview — the SAME #receipt element that prints. */}
        <Receipt
          bill={bill}
          paperWidth={paperWidth}
          qrCodeUrl={qrCodeUrl}
          iosQrUrl={iosQrUrl}
          androidQrUrl={androidQrUrl}
          logoDataUrl={logoDataUrl}
        />
      </div>
    </>,
    document.body
  );
}