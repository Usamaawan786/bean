import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function NegativeBalancePanel({ compact = false }) {
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["negative-inventory-items"],
    queryFn: () => base44.entities.InventoryItem.filter({ is_negative_flagged: true }),
    refetchInterval: 30000
  });

  const handleResolve = async (item) => {
    if (item.current_stock_base_qty < 0) {
      toast.error("Log a purchase invoice to bring stock positive first");
      return;
    }
    await base44.entities.InventoryItem.update(item.id, { is_negative_flagged: false });
    queryClient.invalidateQueries({ queryKey: ["negative-inventory-items"] });
    toast.success("Marked resolved");
  };

  if (items.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-3xl p-5">
      <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5" /> Negative Balance Alerts ({items.length})
      </h3>
      <div className={compact ? "grid grid-cols-2 md:grid-cols-4 gap-3" : "space-y-2"}>
        {items.slice(0, compact ? 8 : 50).map(item => (
          <div key={item.id} className="bg-white rounded-xl p-3 border border-red-200 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-[#5C4A3A] text-sm truncate">{item.name}</p>
              <p className="text-xs text-red-600 font-bold">{(item.current_stock_base_qty || 0).toFixed(1)} {item.base_unit}</p>
              {!compact && <p className="text-[10px] text-[#8B7355] mt-0.5">Suggested: log a purchase invoice</p>}
            </div>
            {!compact && (
              <Button size="sm" variant="outline" className="flex-shrink-0 text-xs" onClick={() => handleResolve(item)}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}