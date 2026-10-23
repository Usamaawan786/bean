import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import VoucherCard from "@/components/vouchers/VoucherCard";
import { Button } from "@/components/ui/button";
import { downloadVoucherPdf } from "@/lib/generateVoucherPdf";

// On-screen preview of the voucher a customer receives, plus the same design as
// a downloadable, card-sized PDF.
export default function VoucherDesignPreview({ voucher, logoDataUrl }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!voucher?.code) return;
    QRCode.toDataURL(String(voucher.code), { width: 320, margin: 1, color: { dark: "#000000", light: "#FFFFFF" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [voucher?.code]);

  const handleDownload = () => {
    setDownloading(true);
    const res = downloadVoucherPdf(voucher, { qrDataUrl, logoDataUrl });
    setDownloading(false);
    if (!res.ok) toast.error("PDF generation failed: " + res.error);
    else toast.success(`Design downloaded — ${voucher.code}`);
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8DED8] p-5">
      <h3 className="font-bold text-[#5C4A3A] mb-3">The design</h3>
      <div className="overflow-x-auto pb-1">
        <VoucherCard id="voucher-preview" voucher={voucher} qrDataUrl={qrDataUrl} logoDataUrl={logoDataUrl} />
      </div>
      <p className="text-xs text-[#8B7355] mt-3 leading-relaxed">
        Printed at 100% this is 85.6 × 54 mm — exactly the size of an ID or bank card, so it slips straight into a
        wallet. Tell the printer not to scale it, and to cut along the faint guide.
      </p>
      <Button onClick={handleDownload} disabled={downloading}
        className="w-full mt-4 bg-[#8B7355] hover:bg-[#6B5744] rounded-xl gap-2">
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Download this design (PDF)
      </Button>
    </div>
  );
}