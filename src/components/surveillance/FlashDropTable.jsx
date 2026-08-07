import { Zap, CheckCircle, Clock } from "lucide-react";
import { utcToPktDisplay } from "@/lib/pktTime";

export default function FlashDropTable({ claims }) {
  if (!claims.length) {
    return (
      <div className="text-center py-12 text-[#8B7355]">
        <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No flash drop claims in this range</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#F5EBE8]">
          <tr>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Flash Drop</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Claimant</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">QR Code</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Claimed At (PKT)</th>
            <th className="text-left px-3 py-3 text-[#8B7355] font-semibold">Expires (PKT)</th>
            <th className="text-center px-3 py-3 text-[#8B7355] font-semibold">Redeemed</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => (
            <tr key={c.id} className="border-t border-[#F5EBE8] hover:bg-[#FDF9F7]">
              <td className="px-3 py-2.5 text-[#5C4A3A] truncate max-w-[160px]">{c.drop_title || "—"}</td>
              <td className="px-3 py-2.5 text-[#5C4A3A] truncate max-w-[180px]">{c.user_email}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-[#8B7355]">{c.qr_code}</td>
              <td className="px-3 py-2.5 text-[#8B7355] whitespace-nowrap">{utcToPktDisplay(c.created_date)}</td>
              <td className="px-3 py-2.5 text-[#8B7355] whitespace-nowrap">{utcToPktDisplay(c.expires_at)}</td>
              <td className="px-3 py-2.5 text-center">
                {c.is_redeemed ? (
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3" /> Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <Clock className="h-3 w-3" /> Pending
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}