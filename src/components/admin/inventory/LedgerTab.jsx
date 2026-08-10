import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BookOpen } from "lucide-react";
import { format } from "date-fns";

const TYPE_LABELS = {
  Purchase_Invoice: { label: "Purchase", color: "text-emerald-700 bg-emerald-50" },
  Sales_Deduction: { label: "Sale", color: "text-red-700 bg-red-50" },
  Modifier_Credit: { label: "Mod +", color: "text-blue-700 bg-blue-50" },
  Modifier_Debit: { label: "Mod −", color: "text-blue-700 bg-blue-50" },
  Waste_Log: { label: "Waste", color: "text-amber-700 bg-amber-50" },
  Batch_Production_Debit: { label: "Batch −", color: "text-purple-700 bg-purple-50" },
  Batch_Production_Credit: { label: "Batch +", color: "text-purple-700 bg-purple-50" },
  Manual_Audit_Adjustment: { label: "Audit", color: "text-[#5C4A3A] bg-[#F5EBE8]" }
};

export default function LedgerTab() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [itemFilter, setItemFilter] = useState("all");

  const { data: items = [] } = useQuery({ queryKey: ["inventory-items"], queryFn: () => base44.entities.InventoryItem.list("name") });
  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["inventory-transactions", typeFilter, itemFilter],
    queryFn: () => base44.entities.InventoryTransaction.list("-created_date", 200)
  });

  const itemName = (id) => items.find(i => i.id === id)?.name || "Unknown";
  const itemUnit = (id) => items.find(i => i.id === id)?.base_unit || "";

  const filtered = txns.filter(t => {
    if (typeFilter !== "all" && t.transaction_type !== typeFilter) return false;
    if (itemFilter !== "all" && t.inventory_item_id !== itemFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-[#8B7355]" />
        <div>
          <h3 className="font-semibold text-[#5C4A3A] text-lg">Inventory Ledger</h3>
          <p className="text-sm text-[#8B7355]">Every stock movement, newest first</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={itemFilter} onValueChange={setItemFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All items" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All items</SelectItem>
            {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl text-[#8B7355]">No transactions found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => {
            const cfg = TYPE_LABELS[t.transaction_type] || { label: t.transaction_type, color: "text-[#5C4A3A] bg-[#F5EBE8]" };
            const positive = t.qty_change_base_unit >= 0;
            return (
              <div key={t.id} className="bg-white rounded-xl border border-[#E8DED8] p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    <p className="text-sm font-medium text-[#5C4A3A] truncate">{itemName(t.inventory_item_id)}</p>
                    {t.is_negative_flag && <span className="text-xs text-red-600 font-medium">⚠ Negative</span>}
                  </div>
                  <p className="text-xs text-[#8B7355] mt-0.5">
                    {t.created_date ? format(new Date(t.created_date), "MMM d, h:mm a") : ""} · {t.created_by || ""}
                    {t.notes ? ` · ${t.notes}` : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${positive ? "text-emerald-600" : "text-red-600"}`}>
                    {positive ? "+" : ""}{t.qty_change_base_unit.toFixed(1)} {itemUnit(t.inventory_item_id)}
                  </p>
                  {t.unit_cost_at_time ? <p className="text-xs text-[#8B7355]">Rs. {t.unit_cost_at_time.toFixed(2)}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}