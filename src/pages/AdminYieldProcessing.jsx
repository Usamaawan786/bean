import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Loader2, Recycle } from "lucide-react";
import YieldProcessingForm from "@/components/yield/YieldProcessingForm";
import YieldHistoryList from "@/components/yield/YieldHistoryList";

export default function AdminYieldProcessing() {
  const [user, setUser] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me();
      if (!u || !["admin", "manager", "super_admin"].includes(u.role)) {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(u);
      await loadAll();
    };
    init();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [items, convs] = await Promise.all([
        base44.entities.InventoryItem.list("-created_date", 500),
        base44.entities.YieldConversion.list("-created_date", 100)
      ]);
      setInventoryItems(items);
      setConversions(convs);
    } finally {
      setLoading(false);
    }
  };

  const itemNames = useMemo(() => {
    const m = {};
    inventoryItems.forEach((i) => { m[i.id] = i.name; });
    return m;
  }, [inventoryItems]);

  const handleProcessed = async (data) => {
    await loadAll();
    const msg = data?.yield_percentage != null
      ? `Batch processed — ${data.yield_percentage}% yield, PKR ${data.effective_unit_cost} effective cost.`
      : "Batch processed.";
    window.sonner?.toast?.success?.(msg) || console.log(msg);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF] pb-20">
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-5xl mx-auto px-5 pt-6 pb-8">
          <Link to={createPageUrl("AdminInventory")} className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Link>
          <h1 className="text-3xl font-bold mt-3 flex items-center gap-2">
            <Recycle className="h-7 w-7" /> Yield Processing
          </h1>
          <p className="text-[#E8DED8] text-sm mt-1">Raw-to-usable yield conversion, waste tracking & effective cost</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#8B7355]">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <>
            <YieldProcessingForm inventoryItems={inventoryItems} onProcessed={handleProcessed} />
            <div>
              <h3 className="font-semibold text-[#5C4A3A] text-sm mb-3">Processing History</h3>
              <YieldHistoryList conversions={conversions} itemNames={itemNames} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}