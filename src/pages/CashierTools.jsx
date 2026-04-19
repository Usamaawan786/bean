import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ScanLine, Search, CheckCircle, XCircle, Star,
  Gift, Shield, Tag, User, Loader2, Coffee, QrCode, ChevronDown, ChevronUp
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

// ─── helpers ─────────────────────────────────────────────────
const TIERS = { Bronze: "#CD7F32", Silver: "#9E9E9E", Gold: "#FFD700", Platinum: "#E5E4E2" };

function FMBadge() {
  return <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"><Shield className="h-2.5 w-2.5" /> FM</span>;
}
function EBABadge() {
  return <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">⭐ EBA</span>;
}

// ─── QR Scanner section ───────────────────────────────────────
function QRScannerSection({ onScanResult }) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  const startScanner = async () => {
    setScanning(true);
    await new Promise(r => setTimeout(r, 200));
    html5QrRef.current = new Html5Qrcode("qr-reader");
    html5QrRef.current.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decoded) => {
        stopScanner();
        onScanResult(decoded);
      },
      () => {}
    ).catch(() => { setScanning(false); toast.error("Camera access denied"); });
  };

  const stopScanner = () => {
    html5QrRef.current?.stop().catch(() => {});
    setScanning(false);
  };

  useEffect(() => () => { html5QrRef.current?.stop().catch(() => {}); }, []);

  return (
    <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm space-y-4">
      <h2 className="font-bold text-[#5C4A3A] flex items-center gap-2 text-lg"><ScanLine className="h-5 w-5 text-[#8B7355]" /> Scan Bill QR Code</h2>
      <p className="text-xs text-[#8B7355]">Scan the QR on the customer's bill to award them loyalty points.</p>

      {scanning ? (
        <div className="space-y-3">
          <div id="qr-reader" className="w-full rounded-2xl overflow-hidden" />
          <Button onClick={stopScanner} variant="outline" className="w-full rounded-xl border-[#E8DED8]">Cancel</Button>
        </div>
      ) : (
        <Button onClick={startScanner} className="w-full bg-[#8B7355] hover:bg-[#6B5744] rounded-xl gap-2">
          <QrCode className="h-5 w-5" /> Open Camera & Scan
        </Button>
      )}

      <div className="flex items-center gap-2 text-xs text-[#C9B8A6]"><div className="flex-1 h-px bg-[#E8DED8]" />or enter QR ID manually<div className="flex-1 h-px bg-[#E8DED8]" /></div>

      <div className="flex gap-2">
        <Input
          value={manualCode}
          onChange={e => setManualCode(e.target.value.toUpperCase())}
          placeholder="e.g. QR-17234560-AB12C3"
          className="font-mono text-sm border-[#E8DED8]"
          onKeyDown={e => { if (e.key === "Enter" && manualCode.trim()) { onScanResult(manualCode.trim()); setManualCode(""); } }}
        />
        <Button onClick={() => { if (manualCode.trim()) { onScanResult(manualCode.trim()); setManualCode(""); } }}
          className="bg-[#8B7355] hover:bg-[#6B5744] rounded-xl px-5">Look Up</Button>
      </div>
    </div>
  );
}

// ─── QR result card ───────────────────────────────────────────
function QRResultCard({ result, onClose }) {
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(!!result.is_scanned);
  const queryClient = useQueryClient();

  const awardPoints = async () => {
    if (processing || done) return;
    setProcessing(true);
    try {
      const response = await base44.functions.invoke('processBillScan', { qr_code_id: result.qr_code_id });
      if (response.data?.success) {
        setDone(true);
        toast.success(`✅ ${response.data.points_awarded} points awarded to customer!`);
      } else {
        toast.error(response.data?.error || "Failed to award points");
      }
    } catch (e) {
      toast.error("Error processing QR");
    }
    setProcessing(false);
  };

  const isExpired = result.qr_expires_at && new Date(result.qr_expires_at) < new Date();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border-2 p-5 ${done || result.is_scanned ? "bg-gray-50 border-gray-200" : isExpired ? "bg-red-50 border-red-200" : "bg-green-50 border-green-300"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {done || result.is_scanned
            ? <><CheckCircle className="h-5 w-5 text-gray-400" /><span className="font-bold text-gray-500">Already Scanned</span></>
            : isExpired
              ? <><XCircle className="h-5 w-5 text-red-500" /><span className="font-bold text-red-600">QR Expired</span></>
              : <><CheckCircle className="h-5 w-5 text-green-600" /><span className="font-bold text-green-700">Valid Bill QR</span></>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div><p className="text-[#8B7355] text-xs">Bill #</p><p className="font-mono font-bold text-[#5C4A3A]">{result.bill_number}</p></div>
        <div><p className="text-[#8B7355] text-xs">Total</p><p className="font-bold text-[#5C4A3A]">PKR {result.total_amount?.toLocaleString()}</p></div>
        <div><p className="text-[#8B7355] text-xs">Points to Award</p><p className="font-bold text-amber-600 text-lg">{result.points_awarded} pts</p></div>
        <div><p className="text-[#8B7355] text-xs">Customer</p><p className="font-medium text-[#5C4A3A]">{result.customer_name || result.customer_phone || "Walk-in"}</p></div>
      </div>
      {!done && !result.is_scanned && !isExpired && (
        <Button onClick={awardPoints} disabled={processing} className="w-full bg-green-600 hover:bg-green-700 rounded-xl gap-2">
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
          {processing ? "Processing..." : `Award ${result.points_awarded} Points`}
        </Button>
      )}
    </motion.div>
  );
}

// ─── Customer lookup section ──────────────────────────────────
function CustomerLookup() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const queryClient = useQueryClient();

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const q = query.trim().toLowerCase();
    const customers = await base44.entities.Customer.list("-created_date", 500);
    const users = await base44.entities.User.list();
    const userMap = {};
    users.forEach(u => { userMap[u.email] = u; });
    const filtered = customers.filter(c => {
      const u = userMap[c.created_by];
      return (u?.full_name || "").toLowerCase().includes(q) ||
        (u?.display_name || "").toLowerCase().includes(q) ||
        (c.created_by || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q);
    }).map(c => ({ ...c, _user: userMap[c.created_by] }));
    setResults(filtered.slice(0, 20));
    setSearching(false);
    if (filtered.length === 0) toast.error("No customer found");
  };

  const markDiscount = async (customer, type) => {
    const field = type === "fm" ? "fm_discount_used" : "eba_discount_used";
    const current = customer[field] || 0;
    if (current >= 3) { toast.error("All discounts already used!"); return; }
    await base44.entities.Customer.update(customer.id, { [field]: current + 1 });
    setResults(prev => prev.map(c => c.id === customer.id ? { ...c, [field]: current + 1 } : c));
    toast.success(`✅ ${type === "fm" ? "FM" : "EBA"} discount marked — ${current + 1}/3 used`);
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm space-y-4">
      <h2 className="font-bold text-[#5C4A3A] flex items-center gap-2 text-lg"><User className="h-5 w-5 text-[#8B7355]" /> Customer Lookup</h2>
      <p className="text-xs text-[#8B7355]">Search by name, email or phone to check points, tier, and apply discounts.</p>
      <div className="flex gap-2">
        <Input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
          placeholder="Name, email, or phone..."
          className="border-[#E8DED8]" />
        <Button onClick={search} disabled={searching} className="bg-[#8B7355] hover:bg-[#6B5744] rounded-xl px-5 gap-2">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
        </Button>
      </div>

      <div className="space-y-3">
        {results.map(c => {
          const isOpen = expanded === c.id;
          const u = c._user;
          const name = u?.full_name || u?.display_name || c.display_name || "Unknown";
          return (
            <div key={c.id} className="bg-[#F9F6F3] rounded-2xl border border-[#E8DED8] overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : c.id)}
                className="w-full flex items-center gap-3 p-4 text-left">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#5C4A3A] text-sm">{name}</span>
                    {c.is_founding_member && <FMBadge />}
                    {c.is_eba && <EBABadge />}
                  </div>
                  <p className="text-xs text-[#8B7355] truncate">{c.created_by}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-center">
                    <div className="font-bold text-[#5C4A3A]">{c.points_balance || 0}</div>
                    <div className="text-[10px] text-[#C9B8A6]">pts</div>
                  </div>
                  <Badge style={{ backgroundColor: TIERS[c.tier] || "#CD7F32" }} className="text-white text-[10px]">{c.tier || "Bronze"}</Badge>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-[#C9B8A6]" /> : <ChevronDown className="h-4 w-4 text-[#C9B8A6]" />}
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 border-t border-[#E8DED8] space-y-4 pt-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white rounded-xl p-3">
                          <div className="font-bold text-[#8B7355] text-lg">{c.points_balance || 0}</div>
                          <div className="text-[10px] text-[#C9B8A6]">Balance</div>
                        </div>
                        <div className="bg-white rounded-xl p-3">
                          <div className="font-bold text-[#8B7355] text-lg">{c.total_points_earned || 0}</div>
                          <div className="text-[10px] text-[#C9B8A6]">Lifetime</div>
                        </div>
                        <div className="bg-white rounded-xl p-3">
                          <div className="font-bold text-[#8B7355] text-sm">PKR {(c.total_spend_pkr || 0).toLocaleString()}</div>
                          <div className="text-[10px] text-[#C9B8A6]">Total Spent</div>
                        </div>
                      </div>

                      {c.is_founding_member && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2"><FMBadge /><span className="text-xs font-semibold text-amber-800">FM 10% Discount</span></div>
                            <span className="text-xs font-bold text-amber-700">{3 - (c.fm_discount_used || 0)} left</span>
                          </div>
                          <div className="flex gap-1.5 mb-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className={`flex-1 h-2 rounded-full ${i < (c.fm_discount_used || 0) ? "bg-amber-400" : "bg-amber-200"}`} />
                            ))}
                          </div>
                          {(c.fm_discount_used || 0) < 3
                            ? <Button onClick={() => markDiscount(c, "fm")} className="w-full bg-amber-500 hover:bg-amber-600 rounded-xl h-8 text-xs gap-1"><Tag className="h-3.5 w-3.5" /> Mark FM Discount Used</Button>
                            : <p className="text-center text-xs text-amber-600 font-semibold">✅ All FM discounts used</p>}
                        </div>
                      )}

                      {c.is_eba && (
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2"><EBABadge /><span className="text-xs font-semibold text-purple-800">EBA 10% Discount</span></div>
                            <span className="text-xs font-bold text-purple-700">{3 - (c.eba_discount_used || 0)} left</span>
                          </div>
                          <div className="flex gap-1.5 mb-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className={`flex-1 h-2 rounded-full ${i < (c.eba_discount_used || 0) ? "bg-purple-400" : "bg-purple-200"}`} />
                            ))}
                          </div>
                          {(c.eba_discount_used || 0) < 3
                            ? <Button onClick={() => markDiscount(c, "eba")} className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl h-8 text-xs gap-1"><Tag className="h-3.5 w-3.5" /> Mark EBA Discount Used</Button>
                            : <p className="text-center text-xs text-purple-700 font-semibold">✅ All EBA discounts used</p>}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Reward code verifier ─────────────────────────────────────
function RewardCodeVerifier() {
  const [codeInput, setCodeInput] = useState("");
  const [lookedUp, setLookedUp] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const queryClient = useQueryClient();

  const handleLookup = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setNotFound(false); setLookedUp(null);
    const results = await base44.entities.Redemption.filter({ redemption_code: code });
    if (results.length === 0) setNotFound(true);
    else setLookedUp(results[0]);
  };

  const handleClaim = async (r) => {
    await base44.entities.Redemption.update(r.id, { status: "claimed" });
    setLookedUp(prev => ({ ...prev, status: "claimed" }));
    toast.success("Reward marked as claimed!");
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm space-y-4">
      <h2 className="font-bold text-[#5C4A3A] flex items-center gap-2 text-lg"><Gift className="h-5 w-5 text-[#8B7355]" /> Verify Reward Code</h2>
      <p className="text-xs text-[#8B7355]">Enter the code shown in the customer's app to verify and mark it claimed.</p>
      <div className="flex gap-2">
        <Input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && handleLookup()}
          placeholder="e.g. 3Z79DYJK"
          className="font-mono text-lg tracking-widest border-[#E8DED8] uppercase" />
        <Button onClick={handleLookup} className="bg-[#8B7355] hover:bg-[#6B5744] px-5 rounded-xl">Verify</Button>
      </div>

      <AnimatePresence>
        {notFound && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
            <XCircle className="h-6 w-6 text-red-500" />
            <div><p className="font-semibold text-red-700">Code Not Found</p><p className="text-sm text-red-500">Do not honour this reward.</p></div>
          </motion.div>
        )}
        {lookedUp && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`rounded-2xl border-2 p-5 ${lookedUp.status === "pending" ? "bg-green-50 border-green-300" : "bg-gray-50 border-gray-200"}`}>
            {lookedUp.status === "pending"
              ? <div className="flex items-center gap-2 mb-3 text-green-700 font-bold"><CheckCircle className="h-5 w-5" /> Valid — OK to Honour</div>
              : lookedUp.status === "claimed"
                ? <div className="flex items-center gap-2 mb-3 text-gray-600 font-bold"><XCircle className="h-5 w-5" /> Already Claimed — Do NOT Honour</div>
                : <div className="flex items-center gap-2 mb-3 text-red-600 font-bold"><XCircle className="h-5 w-5" /> Expired</div>}
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div><p className="text-[#8B7355] text-xs">Reward</p><p className="font-bold text-[#5C4A3A]">{lookedUp.reward_name}</p></div>
              <div><p className="text-[#8B7355] text-xs">Points Spent</p><p className="font-bold text-[#5C4A3A]">{lookedUp.points_spent} pts</p></div>
              <div><p className="text-[#8B7355] text-xs">Customer</p><p className="font-medium text-[#5C4A3A] text-xs">{lookedUp.customer_email}</p></div>
            </div>
            {lookedUp.status === "pending" && (
              <Button onClick={() => handleClaim(lookedUp)} className="w-full bg-green-600 hover:bg-green-700 rounded-xl gap-2">
                <CheckCircle className="h-4 w-4" /> Mark as Claimed
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function CashierTools() {
  const [user, setUser] = useState(null);
  const [qrSaleResult, setQrSaleResult] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!["cashier", "manager", "admin", "super_admin"].includes(u?.role)) {
        window.location.replace("/StaffPortal");
        return;
      }
      setUser(u);
    }).catch(() => window.location.replace("/StaffPortal"));
  }, []);

  const handleScan = async (code) => {
    setLoadingQR(true);
    setQrSaleResult(null);
    // Look up the StoreSale by qr_code_id
    const sales = await base44.entities.StoreSale.filter({ qr_code_id: code });
    if (sales.length === 0) {
      toast.error("No sale found for this QR code");
      setLoadingQR(false);
      return;
    }
    setQrSaleResult(sales[0]);
    setLoadingQR(false);
  };

  if (!user) return (
    <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#D4C4B0] border-t-[#8B7355] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white">
        <div className="max-w-2xl mx-auto px-5 pt-8 pb-6">
          <Link to="/StaffPortal" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Portal
          </Link>
          <div className="flex items-center gap-4">
            <div className="bg-white/15 rounded-2xl p-3"><Coffee className="h-7 w-7" /></div>
            <div>
              <h1 className="text-2xl font-bold">Customer Tools</h1>
              <p className="text-white/70 text-sm">Scan bills · Check points · Verify rewards · Apply discounts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">
        {/* Scan Bill QR → Award Points */}
        <QRScannerSection onScanResult={handleScan} />

        {loadingQR && (
          <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" /></div>
        )}

        {qrSaleResult && (
          <QRResultCard result={qrSaleResult} onClose={() => setQrSaleResult(null)} />
        )}

        {/* Reward Code Verifier */}
        <RewardCodeVerifier />

        {/* Customer Lookup + Discounts */}
        <CustomerLookup />
      </div>
    </div>
  );
}