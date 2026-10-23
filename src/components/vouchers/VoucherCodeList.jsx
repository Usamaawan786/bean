import { useState } from "react";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildVoucherQrMap, downloadVoucherPdf } from "@/lib/generateVoucherPdf";

const STATUS = {
  issued: "bg-green-100 text-green-700 border-green-200",
  redeemed: "bg-gray-100 text-gray-500 border-gray-200",
  expired: "bg-red-100 text-red-600 border-red-200",
  voided: "bg-red-900 text-white border-red-800",
};

const LABEL = {
  issued: "Valid",
  redeemed: "Redeemed",
  expired: "Expired",
  voided: "Voided",
};

// Every pre-printed voucher code, each downloadable on its own.
export default function VoucherCodeList({ vouchers, logoDataUrl }) {
  const [busy, setBusy] = useState(null);

  const downloadOne = async (voucher) => {
    setBusy(voucher.id);
    try {
      const qrDataUrls = await buildVoucherQrMap([voucher.code]);
      const res = downloadVoucherPdf(voucher, { qrDataUrl: qrDataUrls[voucher.code] || "", logoDataUrl });
      if (!res.ok) toast.error("PDF generation failed: " + res.error);
    } finally {
      setBusy(null);
    }
  };

  if (vouchers.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-[#E8DED8] p-10 text-center text-[#8B7355]">
        <p className="font-medium text-[#5C4A3A]">No pre-printed vouchers yet</p>
        <p className="text-sm">Create the batch above and every code will appear here, ready to download.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-[#E8DED8] p-5">
      <h3 className="font-bold text-[#5C4A3A] mb-4">All codes ({vouchers.length})</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {vouchers.map(v => {
          const lapsed = v.status === "issued" && v.expires_at && new Date(v.expires_at).getTime() < Date.now();
          const cls = lapsed ? STATUS.expired : (STATUS[v.status] || STATUS.issued);
          return (
            <div key={v.id} className="flex items-center gap-3 bg-[#FDF9F7] border border-[#E8DED8] rounded-2xl px-3 py-2.5">
              <span className="font-mono font-bold text-[#5C4A3A] tracking-wider">{v.code}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>
                {lapsed ? "Lapsed" : (LABEL[v.status] || v.status)}
              </span>
              <span className="text-[11px] text-[#C9B8A6] ml-auto hidden sm:block">
                {v.expires_at ? format(new Date(v.expires_at), "d MMM yyyy") : ""}
              </span>
              <button onClick={() => downloadOne(v)} disabled={busy === v.id}
                className="p-2 rounded-xl bg-[#F5EBE8] hover:bg-[#EDE3DF] text-[#8B7355] transition-colors disabled:opacity-50 flex-shrink-0"
                title="Download this design">
                {busy === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}