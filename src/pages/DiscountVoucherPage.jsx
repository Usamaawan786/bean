import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Printer, Sparkles, Ticket } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import VoucherDesignPreview from "@/components/vouchers/VoucherDesignPreview";
import VoucherCodeList from "@/components/vouchers/VoucherCodeList";
import { buildVoucherQrMap, downloadVoucherBatchPdf, loadBrandLogo } from "@/lib/generateVoucherPdf";

const STAFF_ROLES = ["manager", "admin", "super_admin"];
const NUMERIC_CODE = /^\d{7}$/;
const SPECS = [
  { label: "Card size", value: "85.6 × 54 mm (ID / bank card)" },
  { label: "Pages", value: "One voucher per page" },
  { label: "Codes", value: "7 digits, unique, single-use" },
  { label: "Verify at", value: "Rewards & Redemptions" },
];

export default function DiscountVoucherPage() {
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(true);
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [batchCount, setBatchCount] = useState(100);
  const [batchPct, setBatchPct] = useState(15);
  const [batchDays, setBatchDays] = useState(365);
  const [generating, setGenerating] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        if (!u) { base44.auth.redirectToLogin("/DiscountVoucherPage"); return; }
        if (!STAFF_ROLES.includes(u.role)) { window.location.replace("/StaffPortal"); return; }
        setChecking(false);
      })
      .catch(() => base44.auth.redirectToLogin("/DiscountVoucherPage"));
    loadBrandLogo().then(setLogoDataUrl);
  }, []);

  const { data: stock = [], isLoading } = useQuery({
    queryKey: ["voucher-stock"],
    queryFn: async () => {
      const page = await base44.entities.DiscountVoucher.filter({}, { sort: "-created_date", limit: 300 });
      const items = page.items || page;
      return items.filter(v => NUMERIC_CODE.test(String(v.code || ""))).sort((a, b) => String(a.code).localeCompare(String(b.code)));
    },
    refetchInterval: 60000,
  });

  const sample = stock[0] || {
    code: "4820391",
    discount_pct: 15,
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateVoucherBatch", {
        count: Number(batchCount) || 100,
        discount_pct: Number(batchPct) || 15,
        valid_days: Number(batchDays) || 365,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      toast.success(`${res.data.created} vouchers created — ${res.data.discount_pct}% off, unique 7-digit codes`);
      queryClient.invalidateQueries({ queryKey: ["voucher-stock"] });
      queryClient.invalidateQueries({ queryKey: ["discount-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["voucher-stats"] });
    } catch (e) {
      toast.error("Could not create vouchers: " + (e?.message || "unknown"));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    if (stock.length === 0) { toast.error("Create the voucher batch first"); return; }
    setDownloadingAll(true);
    try {
      const qrDataUrls = await buildVoucherQrMap(stock.map(v => v.code));
      const res = downloadVoucherBatchPdf(stock, { qrDataUrls, logoDataUrl });
      if (!res.ok) toast.error("PDF generation failed: " + res.error);
      else toast.success(`${stock.length} card designs downloaded — send this one file to your printer`);
    } finally {
      setDownloadingAll(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#D4C4B0] border-t-[#8B7355] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      <div className="bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white">
        <div className="max-w-4xl mx-auto px-5 pt-8 pb-7">
          <Link to="/StaffPortal" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Staff Portal
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-white/15 rounded-2xl p-3"><Ticket className="h-6 w-6" /></div>
            <div>
              <h1 className="text-xl font-bold">Discount Voucher Page</h1>
              <p className="text-white/70 text-sm">The card design, ready to download and print — with every code in one place.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 pb-24 space-y-5">
        <div className="grid md:grid-cols-2 gap-5">
          <VoucherDesignPreview voucher={sample} logoDataUrl={logoDataUrl} />

          <div className="space-y-5">
            <div className="bg-white rounded-3xl border border-[#E8DED8] p-5">
              <h3 className="font-bold text-[#5C4A3A] mb-3 flex items-center gap-2">
                <Printer className="h-5 w-5 text-[#8B7355]" /> Print specification
              </h3>
              <div className="space-y-2.5">
                {SPECS.map(s => (
                  <div key={s.label} className="flex justify-between gap-4 text-sm border-b border-[#F5EBE8] last:border-0 pb-2 last:pb-0">
                    <span className="text-[#8B7355]">{s.label}</span>
                    <span className="font-semibold text-[#5C4A3A] text-right">{s.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#8B7355] mt-4 leading-relaxed">
                Print at 100% on card stock, then cut. Each card carries one code — the same code a cashier types into
                Rewards & Redemptions, where it can be honoured once and never again.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-[#E8DED8] p-5">
              <h3 className="font-bold text-[#5C4A3A] mb-1 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#8B7355]" /> Voucher batch
              </h3>
              <p className="text-xs text-[#8B7355] mb-4">
                {isLoading ? "Checking your stock…" : `${stock.length} pre-printed code${stock.length === 1 ? "" : "s"} ready to download.`}
              </p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="text-[10px] font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">How many</label>
                  <Input type="number" min="1" max="200" value={batchCount} onChange={e => setBatchCount(e.target.value)} className="border-[#E8DED8] text-center" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Discount %</label>
                  <Input type="number" min="1" max="50" value={batchPct} onChange={e => setBatchPct(e.target.value)} className="border-[#E8DED8] text-center" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#8B7355] uppercase tracking-wide mb-1 block">Valid (days)</label>
                  <Input type="number" min="1" max="365" value={batchDays} onChange={e => setBatchDays(e.target.value)} className="border-[#E8DED8] text-center" />
                </div>
              </div>
              <Button onClick={handleGenerate} disabled={generating} variant="outline"
                className="w-full rounded-xl border-[#E8DED8] text-[#8B7355] gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                {generating ? "Creating codes…" : "Create new codes for printing"}
              </Button>
            </div>

            <Button onClick={handleDownloadAll} disabled={downloadingAll || stock.length === 0}
              className="w-full bg-[#5C4A3A] hover:bg-[#4A3829] rounded-2xl py-6 text-base font-bold shadow-lg gap-2">
              {downloadingAll ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              {downloadingAll ? "Preparing 100 designs…" : `Download all ${stock.length || ""} designs (PDF)`}
            </Button>
          </div>
        </div>

        <VoucherCodeList vouchers={stock} logoDataUrl={logoDataUrl} />
      </div>
    </div>
  );
}