import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Receipt, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/utils/timeUtils";

export default function ReceiptLookup() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("lookupSaleReceipt", { query });
      setSales(res.data.sales || []);
      if (!res.data.sales?.length) toast.error("No matching receipts found");
    } catch (err) {
      toast.error("Lookup failed: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Receipt number (e.g. INV-20260702-...) or customer phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-[#E8DED8]"
        />
        <Button type="submit" disabled={loading} className="bg-[#8B7355] hover:bg-[#6B5744]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>

      {sales === null ? (
        <p className="text-sm text-[#8B7355] text-center py-8">
          Look up any past sale, from any time, by receipt number or customer phone.
        </p>
      ) : sales.length === 0 ? (
        <p className="text-sm text-[#8B7355] text-center py-8">No matching receipts found</p>
      ) : (
        <div className="space-y-3">
          {sales.map(sale => (
            <div key={sale.id} className="bg-white rounded-2xl border border-[#E8DED8] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#5C4A3A]">
                  <Receipt className="h-3.5 w-3.5" /> {sale.bill_number}
                </span>
                <span className="text-xs text-[#8B7355]">{formatDateTime(sale.created_date)}</span>
              </div>
              <p className="text-sm text-[#5C4A3A]">{sale.customer_name || "Walk-in Customer"} {sale.customer_phone ? `· ${sale.customer_phone}` : ""}</p>
              <div className="mt-2 space-y-1">
                {(sale.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs text-[#8B7355]">
                    <span>{item.quantity}x {item.product_name}</span>
                    <span>PKR {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-2 border-t border-[#F5EBE8] font-bold text-[#5C4A3A] text-sm">
                <span>Total</span>
                <span>PKR {(sale.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}