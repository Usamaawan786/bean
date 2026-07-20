import { Fragment, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, ChevronRight, ChevronDown, Loader2, Receipt, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const LAUNCH_DATE = new Date("2026-07-11T00:00:00+05:00");
const PKT_OFFSET = 5 * 60 * 60 * 1000;

const PAYMENT_FILTERS = [
  { key: "all", label: "All Payments" },
  { key: "Cash", label: "Cash" },
  { key: "Card", label: "Card" },
];

// Quick-select presets — they populate the From/To datetime inputs with their
// PKT boundaries so the user can see and fine-tune the exact window.
const QUICK_RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

function pktStartOfToday() {
  const pkt = new Date(Date.now() + PKT_OFFSET);
  return new Date(Date.UTC(pkt.getUTCFullYear(), pkt.getUTCMonth(), pkt.getUTCDate()));
}

function applyQuickRange(range) {
  const today = pktStartOfToday();
  const now = new Date();
  switch (range) {
    case "today": return { from: today, to: now };
    case "week": return { from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
    case "month": return { from: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
    default: return { from: null, to: null };
  }
}

// Convert a UTC Date to a "YYYY-MM-DDTHH:mm" string in PKT, for datetime-local
// input values (the browser is in PKT, so the string round-trips correctly).
function toDateTimeLocalString(date) {
  const pkt = new Date(date.getTime() + PKT_OFFSET);
  return pkt.toISOString().slice(0, 16);
}

function formatDateTime(iso) {
  const pkt = new Date(new Date(iso).getTime() + PKT_OFFSET);
  const d = pkt.toISOString().slice(0, 10);
  const t = pkt.toISOString().slice(11, 16);
  return `${d} ${t}`;
}

export default function SalesHistoryTab() {
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeQuick, setActiveQuick] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales-history"],
    queryFn: () => base44.entities.StoreSale.list("-created_date", 5000),
  });

  const handleQuickRange = (range) => {
    setActiveQuick(range);
    const { from, to } = applyQuickRange(range);
    setFromDate(from ? toDateTimeLocalString(from) : "");
    setToDate(to ? toDateTimeLocalString(to) : "");
  };

  const clearDates = () => {
    setFromDate("");
    setToDate("");
    setActiveQuick("");
  };

  const filtered = useMemo(() => {
    const fromMs = fromDate ? new Date(fromDate).getTime() : null;
    const toMs = toDate ? new Date(toDate).getTime() : null;
    const q = search.trim().toLowerCase();
    return sales.filter(s => {
      const created = new Date(s.created_date).getTime();
      if (fromMs !== null && created < fromMs) return false;
      if (toMs !== null && created > toMs) return false;
      if (paymentFilter !== "all" && (s.payment_method || "Cash") !== paymentFilter) return false;
      if (q) {
        const haystack = [
          s.bill_number, s.customer_name, s.cashier_name, s.customer_phone, s.cashier_email
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [sales, search, paymentFilter, fromDate, toDate]);

  const toggleRow = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
          <Input
            placeholder="Search bill #, customer, or cashier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 border-[#E8DED8]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PAYMENT_FILTERS.map(f => (
            <button key={f.key} onClick={() => setPaymentFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${paymentFilter === f.key ? "border-[#8B7355] bg-[#8B7355] text-white" : "border-[#E8DED8] bg-white text-[#8B7355] hover:border-[#C9B8A6]"}`}>
              {f.label}
            </button>
          ))}
          <div className="w-px h-6 bg-[#E8DED8] mx-1" />
          {QUICK_RANGES.map(r => (
            <button key={r.key} onClick={() => handleQuickRange(r.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${activeQuick === r.key ? "border-[#8B7355] bg-[#8B7355] text-white" : "border-[#E8DED8] bg-white text-[#8B7355] hover:border-[#C9B8A6]"}`}>
              {r.label}
            </button>
          ))}
        </div>
        {/* From / To datetime range (PKT) */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#8B7355]">From</label>
            <input
              type="datetime-local"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); setActiveQuick(""); }}
              className="border border-[#E8DED8] rounded-xl px-3 py-1.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#8B7355]">To</label>
            <input
              type="datetime-local"
              value={toDate}
              onChange={e => { setToDate(e.target.value); setActiveQuick(""); }}
              className="border border-[#E8DED8] rounded-xl px-3 py-1.5 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
            />
          </div>
          {(fromDate || toDate) && (
            <button onClick={clearDates}
              className="inline-flex items-center gap-1 text-xs text-[#8B7355] hover:text-[#5C4A3A] underline pb-2">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-[#8B7355]">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading sales history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-[#8B7355]">
            <Receipt className="h-10 w-10 text-[#C9B8A6] mb-3" />
            <p className="font-medium text-[#5C4A3A]">No sales found</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F1ED] text-left text-[#8B7355] border-b border-[#E8DED8]">
                  <th className="px-4 py-3 font-medium w-8"></th>
                  <th className="px-4 py-3 font-medium">Bill #</th>
                  <th className="px-4 py-3 font-medium">Date / Time</th>
                  <th className="px-4 py-3 font-medium">Cashier</th>
                  <th className="px-4 py-3 font-medium text-center">Items</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium text-center">Disc %</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sale => {
                  const expanded = expandedId === sale.id;
                  const preLaunch = new Date(sale.created_date) < LAUNCH_DATE;
                  const itemsCount = (sale.items || []).reduce((a, i) => a + (i.quantity || 0), 0);
                  return (
                    <Fragment key={sale.id}>
                      <tr
                        onClick={() => toggleRow(sale.id)}
                        className="border-b border-[#E8DED8] cursor-pointer hover:bg-[#F5EBE8] transition-colors"
                      >
                        <td className="px-4 py-3 text-[#C9B8A6]">
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-[#5C4A3A]">{sale.bill_number || "—"}</span>
                            {preLaunch && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EBE5DF] text-[#8B7355] border border-[#E8DED8]">Pre-launch</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#8B7355] whitespace-nowrap">{formatDateTime(sale.created_date)}</td>
                        <td className="px-4 py-3 text-[#8B7355]">{sale.cashier_name || "—"}</td>
                        <td className="px-4 py-3 text-center text-[#8B7355]">{itemsCount}</td>
                        <td className="px-4 py-3 text-[#8B7355]">{sale.payment_method || "Cash"}</td>
                        <td className="px-4 py-3 text-center text-[#8B7355]">{sale.discount_pct ? `${sale.discount_pct}%` : "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-[#5C4A3A]">PKR {(sale.total_amount || 0).toFixed(0)}</td>
                        <td className="px-4 py-3 text-[#8B7355] whitespace-nowrap">
                          {sale.order_type === "takeaway" ? "🛍 Takeaway" : sale.table_number ? `🪑 Table ${sale.table_number}` : "🪑 Dine In"}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-[#F5F1ED]">
                          <td colSpan={9} className="px-4 py-4">
                            <div className="rounded-xl border border-[#E8DED8] bg-white overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-[#F5EBE8] text-left text-[#8B7355] border-b border-[#E8DED8]">
                                    <th className="px-3 py-2 font-medium">Item</th>
                                    <th className="px-3 py-2 font-medium text-center">Qty</th>
                                    <th className="px-3 py-2 font-medium text-right">Price</th>
                                    <th className="px-3 py-2 font-medium text-right">Line Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(sale.items || []).map((item, idx) => (
                                    <tr key={idx} className="border-b border-[#E8DED8] last:border-0">
                                      <td className="px-3 py-2 text-[#5C4A3A]">{item.product_name}</td>
                                      <td className="px-3 py-2 text-center text-[#8B7355]">{item.quantity}</td>
                                      <td className="px-3 py-2 text-right text-[#8B7355]">PKR {(item.price || 0).toFixed(0)}</td>
                                      <td className="px-3 py-2 text-right text-[#5C4A3A] font-medium">PKR {((item.price || 0) * (item.quantity || 0)).toFixed(0)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className="px-3 py-3 bg-[#F5F1ED] border-t border-[#E8DED8] flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#8B7355]">
                                {sale.customer_name && <span>Customer: <span className="text-[#5C4A3A] font-medium">{sale.customer_name}</span></span>}
                                {sale.customer_phone && <span>Phone: <span className="text-[#5C4A3A] font-medium">{sale.customer_phone}</span></span>}
                                <span>Subtotal: <span className="text-[#5C4A3A] font-medium">PKR {(sale.subtotal || 0).toFixed(0)}</span></span>
                                {sale.discount_pct > 0 && <span>Discount: <span className="text-[#5C4A3A] font-medium">PKR {(sale.discount_amount || 0).toFixed(0)} ({sale.discount_pct}%)</span></span>}
                                <span>GST: <span className="text-[#5C4A3A] font-medium">PKR {(sale.tax || 0).toFixed(0)}</span></span>
                                <span>Total: <span className="text-[#5C4A3A] font-semibold">PKR {(sale.total_amount || 0).toFixed(0)}</span></span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-[#8B7355] text-center">
        Showing {filtered.length} sale{filtered.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}