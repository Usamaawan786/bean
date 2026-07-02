import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Rocket, Tag, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const MAX_USES = 3;
const CUTOFF = new Date("2026-07-11T19:00:00.000Z"); // July 12 00:00 Asia/Karachi

export default function LaunchDiscountPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [redeeming, setRedeeming] = useState(null);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const q = query.trim().toLowerCase();
    const [customers, waitlist] = await Promise.all([
      base44.entities.Customer.list("-created_date", 1000),
      base44.entities.WaitlistSignup.list("-created_date", 1000),
    ]);

    const fromCustomers = customers
      .filter((c) => (c.display_name || "").toLowerCase().includes(q) || (c.phone || "").includes(q))
      .map((c) => ({
        record_type: "customer",
        id: c.id,
        name: c.display_name || c.user_email || "Unknown",
        phone: c.phone || "",
        email: c.user_email || c.created_by || "",
        created_date: c.created_date,
        uses: c.launch_discount_uses || 0,
      }));

    const fromWaitlist = waitlist
      .filter((w) => (w.full_name || "").toLowerCase().includes(q) || (w.phone || "").includes(q))
      .map((w) => ({
        record_type: "waitlist",
        id: w.id,
        name: w.full_name || "Unknown",
        phone: w.phone || "",
        email: w.email || "",
        created_date: w.created_date,
        uses: w.launch_discount_uses || 0,
      }));

    const combined = [...fromCustomers, ...fromWaitlist].slice(0, 20);
    setResults(combined);
    setSearching(false);
    if (combined.length === 0) toast.error("No matching customer or waitlist signup found");
  };

  const handleRedeem = async (record) => {
    setRedeeming(record.id);
    try {
      const res = await base44.functions.invoke("redeemLaunchDiscount", {
        record_type: record.record_type,
        record_id: record.id,
      });
      setResults((prev) => prev.map((r) => (r.id === record.id ? { ...r, uses: res.data.uses } : r)));
      toast.success(`✅ Soft-launch discount marked — ${res.data.uses}/${MAX_USES} used`);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not mark discount");
    }
    setRedeeming(null);
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm space-y-4">
      <div>
        <h2 className="font-bold text-[#5C4A3A] flex items-center gap-2 text-lg">
          <Rocket className="h-5 w-5 text-[#8B7355]" /> Soft-Launch 10% Discount
        </h2>
        <p className="text-xs text-[#8B7355] mt-1">
          Valid only on <strong>July 10–12, 2026</strong>, for customers & waitlist signups registered before July 12. Max 3 uses per person.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search by name or phone..."
          className="border-[#E8DED8]"
        />
        <Button onClick={search} disabled={searching} className="bg-[#8B7355] hover:bg-[#6B5744] rounded-xl px-5 gap-2">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
        </Button>
      </div>

      <div className="space-y-3">
        {results.map((r) => {
          const isOpen = expanded === r.id;
          const eligible = new Date(r.created_date) < CUTOFF;
          const maxedOut = r.uses >= MAX_USES;
          return (
            <div key={r.id} className="bg-[#F9F6F3] rounded-2xl border border-[#E8DED8] overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : r.id)} className="w-full flex items-center gap-3 p-4 text-left">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#5C4A3A] text-sm">{r.name}</span>
                    <Badge className={`${r.record_type === "customer" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"} border text-[10px]`}>
                      {r.record_type === "customer" ? "App User" : "Waitlist"}
                    </Badge>
                    {!eligible && <Badge className="bg-red-100 text-red-600 border-red-200 border text-[10px]">Not Eligible</Badge>}
                  </div>
                  <p className="text-xs text-[#8B7355] truncate">{r.phone || r.email}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className={`text-sm font-bold ${maxedOut ? "text-gray-400" : "text-green-600"}`}>{r.uses}/{MAX_USES}</div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-[#C9B8A6]" /> : <ChevronDown className="h-4 w-4 text-[#C9B8A6]" />}
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 pt-0 border-t border-[#E8DED8] space-y-3">
                      <div className="flex gap-1.5 pt-3">
                        {Array.from({ length: MAX_USES }).map((_, i) => (
                          <div key={i} className={`flex-1 h-2 rounded-full ${i < r.uses ? "bg-green-400" : "bg-green-100"}`} />
                        ))}
                      </div>
                      {!eligible ? (
                        <p className="text-center text-xs text-red-500 font-semibold py-1">Registered on or after July 12 — not eligible</p>
                      ) : maxedOut ? (
                        <p className="text-center text-xs text-green-600 font-semibold py-1">✅ All 3 discounts used</p>
                      ) : (
                        <Button
                          onClick={() => handleRedeem(r)}
                          disabled={redeeming === r.id}
                          className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-9 text-sm gap-2"
                        >
                          {redeeming === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                          Mark 10% Discount Used (Order #{r.uses + 1}/{MAX_USES})
                        </Button>
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