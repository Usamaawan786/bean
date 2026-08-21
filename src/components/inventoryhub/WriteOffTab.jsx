import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, FileX, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import WriteOffFormModal from "./WriteOffFormModal";
import { utcToPktDisplay } from "@/lib/pktTime";

function fmt(n, dp = 2) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

const ACCOUNT_TINT = {
  Spoilage: "bg-red-50 text-red-700",
  "Staff Consumption": "bg-blue-50 text-blue-700",
  Expired: "bg-amber-100 text-amber-700",
  Drop: "bg-purple-50 text-purple-700",
  Other: "bg-gray-100 text-gray-700"
};

export default function WriteOffTab() {
  const [records, setRecords] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [recs, items] = await Promise.all([
        base44.entities.WriteOffRecord.list("-created_date", 200),
        base44.entities.InventoryItem.list("-name", 1000)
      ]);
      setRecords(recs);
      setInventoryItems(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaved = async () => {
    await load();
    window.sonner?.toast?.success?.("Write-off record submitted — stock deducted.") || console.log("Write-off submitted");
  };

  const handleDelete = async (rec) => {
    if (!confirm(`Delete write-off ${rec.doc_number}? This does NOT reverse the stock deduction.`)) return;
    try {
      await base44.entities.WriteOffRecord.delete(rec.id);
      await load();
    } catch (e) {
      window.sonner?.toast?.error?.(e.message) || console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)} className="bg-[#8B7355] hover:bg-[#6B5744] text-white">
          <Plus className="h-4 w-4 mr-1" /> New Write-Off Record
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#8B7355]">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading write-off records…
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8DED8] p-10 text-center">
          <FileX className="h-10 w-10 mx-auto mb-3 text-[#C9B8A6]" />
          <p className="font-semibold text-[#5C4A3A]">No write-off records yet</p>
          <p className="text-sm text-[#8B7355] mt-1">Record spoilage, expired stock or staff consumption here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-[#E8DED8] bg-[#FBF8F5]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#5C4A3A]">{r.doc_number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ACCOUNT_TINT[r.to_account] || ACCOUNT_TINT.Other}`}>{r.to_account}</span>
                    <span className="text-[10px] text-[#C9B8A6]">{utcToPktDisplay(r.created_date)}</span>
                  </div>
                  <p className="text-xs text-[#8B7355] mt-0.5">
                    {r.date} · {r.storage || "—"} · by {r.created_by_name || r.created_by || "—"}
                  </p>
                  {r.comment && <p className="text-xs text-[#8B7355] mt-0.5 italic">"{r.comment}"</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-red-600">-PKR {fmt(r.total_cost)}</span>
                  <button onClick={() => handleDelete(r)} title="Delete record" className="text-[#C9B8A6] hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {r.lines?.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[520px]">
                    <thead className="text-[#C9B8A6]">
                      <tr>
                        <th className="text-left font-medium px-4 py-1.5">Item</th>
                        <th className="text-right font-medium px-2 py-1.5">Pkg Qty</th>
                        <th className="text-right font-medium px-2 py-1.5">Qty (units)</th>
                        <th className="text-right font-medium px-2 py-1.5">Unit Cost</th>
                        <th className="text-right font-medium px-4 py-1.5">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.lines.map((l, i) => (
                        <tr key={i} className="border-t border-[#F0EAE4]">
                          <td className="px-4 py-1.5 text-[#5C4A3A]">{l.item_name}</td>
                          <td className="px-2 py-1.5 text-right text-[#8B7355]">{fmt(l.package_quantity, 3)}</td>
                          <td className="px-2 py-1.5 text-right text-[#5C4A3A]">{fmt(l.quantity_in_units, 3)} {l.unit}</td>
                          <td className="px-2 py-1.5 text-right text-[#5C4A3A]">{fmt(l.unit_cost)}</td>
                          <td className="px-4 py-1.5 text-right font-semibold text-[#5C4A3A]">{fmt(l.total_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <WriteOffFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={handleSaved} inventoryItems={inventoryItems} />
    </div>
  );
}