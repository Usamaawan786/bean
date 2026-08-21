import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import YieldProcessingForm from "@/components/yield/YieldProcessingForm";
import YieldHistoryList from "@/components/yield/YieldHistoryList";

export default function YieldTab() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
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

  useEffect(() => { load(); }, []);

  const itemNames = {};
  inventoryItems.forEach((i) => { itemNames[i.id] = i.name; });

  const handleProcessed = async () => {
    await load();
    window.sonner?.toast?.success?.("Yield batch processed.") || console.log("Yield processed");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#8B7355]">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading yield batches…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <YieldProcessingForm inventoryItems={inventoryItems} onProcessed={handleProcessed} />
      <div>
        <h3 className="font-semibold text-[#5C4A3A] text-sm mb-3">Processing History</h3>
        <YieldHistoryList conversions={conversions} itemNames={itemNames} />
      </div>
    </div>
  );
}