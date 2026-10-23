import { Printer, Ban, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

const STATUS = {
  issued: { label: "Valid", cls: "bg-green-100 text-green-700 border-green-200" },
  redeemed: { label: "Redeemed", cls: "bg-gray-100 text-gray-500 border-gray-200" },
  expired: { label: "Expired", cls: "bg-red-100 text-red-600 border-red-200" },
  voided: { label: "Voided", cls: "bg-red-900 text-white border-red-800" },
};

export default function VoucherRow({ voucher, onPrint, onRedeem, onVoid, canVoid, redeeming }) {
  const cfg = STATUS[voucher.status] || STATUS.issued;
  const lapsed = voucher.status === "issued" && voucher.expires_at && new Date(voucher.expires_at).getTime() < Date.now();
  const when = (iso) => (iso ? format(new Date(iso), "d MMM yyyy, h:mm a") : "—");
  const customer = voucher.customer_name || voucher.customer_email || voucher.customer_phone || "Walk-in";

  return (
    <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[190px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-[#5C4A3A] tracking-wider">{voucher.code}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F5EBE8] text-[#8B7355]">{voucher.discount_pct}% off</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${lapsed ? STATUS.expired.cls : cfg.cls}`}>
            {lapsed ? "Lapsed" : cfg.label}
          </span>
        </div>
        <p className="text-xs text-[#8B7355] mt-1 truncate">
          {customer} · issued {when(voucher.issued_at)} by {voucher.issued_by_name || "—"}
        </p>
        <p className="text-xs text-[#C9B8A6] mt-0.5">
          {voucher.status === "redeemed"
            ? `Redeemed ${when(voucher.redeemed_at)} by ${voucher.redeemed_by_name || "—"}`
            : voucher.status === "voided"
              ? `Voided ${when(voucher.voided_at)} — ${voucher.void_reason || "no reason recorded"}`
              : `Valid until ${when(voucher.expires_at)}`}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => onPrint(voucher)}
          className="rounded-lg h-8 text-xs px-3 border-[#E8DED8] text-[#8B7355] gap-1">
          <Printer className="h-3.5 w-3.5" /> Card
        </Button>
        {voucher.status === "issued" && !lapsed && (
          <Button size="sm" onClick={() => onRedeem(voucher)} disabled={redeeming === voucher.id}
            className="bg-green-600 hover:bg-green-700 rounded-lg h-8 text-xs px-3 gap-1">
            {redeeming === voucher.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Redeem
          </Button>
        )}
        {voucher.status === "issued" && canVoid && (
          <Button size="sm" onClick={() => onVoid(voucher)}
            className="bg-red-700 hover:bg-red-800 text-white rounded-lg h-8 text-xs px-3 gap-1">
            <Ban className="h-3.5 w-3.5" /> Void
          </Button>
        )}
      </div>
    </div>
  );
}