import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Ticket, Plus, Search, Loader2, Ban, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import IssueVoucherDialog from "@/components/vouchers/IssueVoucherDialog";
import VoucherVerifyPanel from "@/components/vouchers/VoucherVerifyPanel";
import VoucherPrintStage from "@/components/vouchers/VoucherPrintStage";
import VoucherRow from "@/components/vouchers/VoucherRow";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "issued", label: "Valid" },
  { id: "redeemed", label: "Redeemed" },
  { id: "expired", label: "Expired" },
  { id: "voided", label: "Voided" },
];

const VOID_ROLES = ["manager", "admin", "super_admin"];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The whole discount-voucher section: issue a card at the end of a meal, verify
// and redeem it at the counter, and keep the audit trail of every voucher.
export default function DiscountVouchersPanel() {
  const queryClient = useQueryClient();
  const [me, setMe] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [printing, setPrinting] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [redeemingId, setRedeemingId] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const nowIso = useMemo(() => new Date().toISOString(), []);

  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: stats } = useQuery({
    queryKey: ["voucher-stats", nowIso],
    queryFn: async () => {
      const [active, redeemed, expired, voided] = await Promise.all([
        base44.entities.DiscountVoucher.count({ status: "issued", expires_at: { $gt: nowIso } }),
        base44.entities.DiscountVoucher.count({ status: "redeemed" }),
        base44.entities.DiscountVoucher.count({ status: "expired" }),
        base44.entities.DiscountVoucher.count({ status: "voided" }),
      ]);
      return { active, redeemed, expired, voided };
    },
    refetchInterval: 30000,
  });

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ["discount-vouchers", statusFilter, search],
    queryFn: async () => {
      const query = {};
      if (statusFilter !== "all") query.status = statusFilter;
      if (search) {
        const q = escapeRegex(search);
        query.$or = [
          { code: { $regex: q, $options: "i" } },
          { customer_name: { $regex: q, $options: "i" } },
          { customer_email: { $regex: q, $options: "i" } },
          { customer_phone: { $regex: q, $options: "i" } },
        ];
      }
      const page = await base44.entities.DiscountVoucher.filter(query, { sort: "-created_date", limit: 100 });
      return page.items || page;
    },
    refetchInterval: 30000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["discount-vouchers"] });
    queryClient.invalidateQueries({ queryKey: ["voucher-stats"] });
  };

  const handleRedeem = async (voucher) => {
    setRedeemingId(voucher.id);
    try {
      const res = await base44.functions.invoke("redeemDiscountVoucher", { code: voucher.code, action: "redeem" });
      if (res?.data?.error) throw new Error(res.data.error);
      if (res.data.redeemed) {
        toast.success(`${voucher.discount_pct}% voucher honoured — code is now used`);
      } else {
        toast.error(res.data.reason === "already_redeemed" ? "Already redeemed — do not honour again" : "Could not redeem this voucher");
      }
      invalidate();
    } catch (e) {
      toast.error("Redeem failed: " + (e?.message || "unknown"));
    } finally {
      setRedeemingId(null);
    }
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) { toast.error("Please give a reason for voiding"); return; }
    setVoiding(true);
    try {
      await base44.entities.DiscountVoucher.update(voidTarget.id, {
        status: "voided",
        void_reason: voidReason.trim(),
        voided_by: me?.email || "staff",
        voided_at: new Date().toISOString(),
      });
      toast.success("Voucher voided — it can no longer be honoured");
      setVoidTarget(null);
      setVoidReason("");
      invalidate();
    } catch (e) {
      toast.error("Could not void: " + (e?.message || "unknown"));
    } finally {
      setVoiding(false);
    }
  };

  const canVoid = VOID_ROLES.includes(me?.role);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Valid", value: stats?.active, cls: "text-green-600" },
          { label: "Redeemed", value: stats?.redeemed, cls: "text-[#5C4A3A]" },
          { label: "Expired", value: stats?.expired, cls: "text-red-500" },
          { label: "Voided", value: stats?.voided, cls: "text-red-700" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
            <div className={`text-2xl font-bold ${s.cls}`}>{s.value ?? "—"}</div>
            <div className="text-xs text-[#8B7355] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <VoucherVerifyPanel onRedeemed={invalidate} />

      <div className="bg-white rounded-3xl border border-[#E8DED8] p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h3 className="font-bold text-[#5C4A3A] flex items-center gap-2">
            <Ticket className="h-5 w-5 text-[#8B7355]" /> Issued Vouchers
          </h3>
          <div className="flex items-center gap-2">
            <Link to="/DiscountVoucherPage"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-[#E8DED8] text-[#8B7355] hover:bg-[#F5EBE8] transition-colors">
              <Printer className="h-4 w-4" /> Designs & print
            </Link>
            <Button onClick={() => setIssuing(true)} className="bg-[#8B7355] hover:bg-[#6B5744] rounded-xl text-sm gap-1">
              <Plus className="h-4 w-4" /> Issue Voucher
            </Button>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search code, name, phone or email…"
              className="w-full border border-[#E8DED8] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${statusFilter === f.id ? "bg-[#5C4A3A] text-white" : "bg-white border border-[#E8DED8] text-[#8B7355] hover:bg-[#F5EBE8]"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" /></div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-10 text-[#8B7355]">
            <Ticket className="h-9 w-9 mx-auto mb-3 text-[#C9B8A6]" />
            <p className="font-medium text-[#5C4A3A]">No discount vouchers yet</p>
            <p className="text-sm">Issue one at the end of a meal and hand it to the customer.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vouchers.map(v => (
              <VoucherRow key={v.id} voucher={v} onPrint={setPrinting} onRedeem={handleRedeem}
                onVoid={setVoidTarget} canVoid={canVoid} redeeming={redeemingId} />
            ))}
          </div>
        )}
      </div>

      {issuing && (
        <IssueVoucherDialog
          onClose={() => setIssuing(false)}
          onIssued={(voucher) => { setIssuing(false); invalidate(); setPrinting(voucher); }}
        />
      )}

      {printing && <VoucherPrintStage voucher={printing} onClose={() => setPrinting(null)} />}

      <Dialog open={!!voidTarget} onOpenChange={(o) => { if (!o) { setVoidTarget(null); setVoidReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#5C4A3A]">Void Voucher</DialogTitle>
            <DialogDescription className="text-[#8B7355]">
              {voidTarget?.code} will be permanently refused at the counter. Use this for suspected fraud or a wrongly issued card.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={voidReason} onChange={e => setVoidReason(e.target.value)}
              placeholder="Reason (e.g. duplicated print-out)" className="border-[#E8DED8]" />
            <Button onClick={handleVoid} disabled={voiding} className="w-full bg-red-700 hover:bg-red-800 rounded-xl gap-2">
              {voiding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Void this voucher
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}