import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import LineItemCategoryTabs from "./LineItemCategoryTabs";

const ACCOUNTS = ["Spoilage", "Staff Consumption", "Expired", "Drop", "Other"];
const EMPTY_LINE = { item_id: "", item_name: "", unit: "", package_quantity: 0, quantity_in_units: 0, unit_cost: 0 };

function todayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
}

export default function WriteOffFormModal({ open, onClose, onSaved, inventoryItems }) {
  const [date, setDate] = useState(todayStr());
  const [storage, setStorage] = useState("");
  const [toAccount, setToAccount] = useState("Spoilage");
  const [comment, setComment] = useState("");
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [cat, setCat] = useState("All");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setDate(todayStr());
    setStorage("");
    setToAccount("Spoilage");
    setComment("");
    setLines([{ ...EMPTY_LINE }]);
    setCat("All");
  }, [open]);

  const filteredItems = useMemo(() => {
    if (cat === "All") return inventoryItems;
    return inventoryItems.filter((i) => (i.item_class || "Item") === cat);
  }, [inventoryItems, cat]);

  const counts = useMemo(() => {
    const c = { All: inventoryItems.length };
    for (const i of inventoryItems) {
      const k = i.item_class || "Item";
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [inventoryItems]);

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity_in_units) || 0) * (Number(l.unit_cost) || 0), 0),
    [lines]
  );

  const updateLine = (idx, patch) => setLines((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const addLine = () => setLines((p) => [...p, { ...EMPTY_LINE }]);
  const removeLine = (idx) => setLines((p) => p.filter((_, i) => i !== idx));

  const onPickItem = (idx, itemId) => {
    const inv = inventoryItems.find((i) => i.id === itemId);
    if (!inv) { updateLine(idx, { item_id: "", item_name: "", unit: "", unit_cost: 0 }); return; }
    updateLine(idx, {
      item_id: inv.id,
      item_name: inv.name,
      unit: inv.base_unit || "",
      unit_cost: inv.moving_average_cost || inv.cost_per_base_unit || 0
    });
  };

  const validate = () => {
    if (!date || !toAccount) { setError("Date and account are required."); return false; }
    if (!lines.length || lines.every((l) => !(Number(l.quantity_in_units) > 0))) {
      setError("Add at least one line with a quantity greater than 0."); return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError("");
    if (!validate()) return;
    setBusy(true);
    try {
      await base44.functions.invoke("submitWriteOffRecord", {
        date, storage, to_account: toAccount, comment,
        lines: lines
          .filter((l) => Number(l.quantity_in_units) > 0)
          .map((l) => ({
            inventory_item_id: l.item_id,
            item_name: l.item_name,
            unit: l.unit,
            package_quantity: Number(l.package_quantity) || 0,
            quantity_in_units: Number(l.quantity_in_units) || 0,
            unit_cost: Number(l.unit_cost) || 0
          }))
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to submit write-off");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Write-Off Record</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Storage / Branch</Label>
              <Input value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="e.g. Greeno Shell F6 ISB" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">To Account</Label>
              <select value={toAccount} onChange={(e) => setToAccount(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-[#E8DED8] bg-white px-2 text-sm text-[#5C4A3A]">
                {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Comment</Label>
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Reason / comment" className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Line Items</Label>
            <div className="mt-1 mb-2">
              <LineItemCategoryTabs active={cat} onChange={setCat} counts={counts} />
            </div>
            <div className="overflow-x-auto rounded-lg border border-[#E8DED8]">
              <table className="w-full text-sm min-w-[760px]">
                <thead className="bg-[#F5EBE8] text-[#8B7355] text-xs">
                  <tr>
                    <th className="text-left font-medium px-2 py-2">Item</th>
                    <th className="text-right font-medium px-2 py-2 w-28">Package Qty</th>
                    <th className="text-right font-medium px-2 py-2 w-32">Qty (units)</th>
                    <th className="text-right font-medium px-2 py-2 w-28">Unit Cost</th>
                    <th className="text-right font-medium px-2 py-2 w-28">Total Cost</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => {
                    const lineTotal = (Number(l.quantity_in_units) || 0) * (Number(l.unit_cost) || 0);
                    return (
                      <tr key={idx} className="border-t border-[#E8DED8]">
                        <td className="px-2 py-1.5">
                          <select value={l.item_id} onChange={(e) => onPickItem(idx, e.target.value)} className="w-full h-9 rounded-md border border-[#E8DED8] bg-white px-2 text-sm text-[#5C4A3A]">
                            <option value="">{l.item_name || "— select item —"}</option>
                            {filteredItems.map((inv) => (
                              <option key={inv.id} value={inv.id}>{inv.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min="0" step="any" value={l.package_quantity} onChange={(e) => updateLine(idx, { package_quantity: e.target.value })} className="h-9 text-right" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min="0" step="any" value={l.quantity_in_units} onChange={(e) => updateLine(idx, { quantity_in_units: e.target.value })} className="h-9 text-right" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min="0" step="any" value={l.unit_cost} onChange={(e) => updateLine(idx, { unit_cost: e.target.value })} className="h-9 text-right" />
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold text-[#5C4A3A]">
                          {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button onClick={() => removeLine(idx)} disabled={busy || lines.length === 1} className="text-[#C9B8A6] hover:text-red-500 disabled:opacity-40">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button size="sm" variant="outline" onClick={addLine} disabled={busy} className="h-7 text-xs mt-2">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
            </Button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <span className="text-sm text-[#8B7355]">Total loss</span>
            <span className="text-xl font-bold text-[#5C4A3A]">PKR {total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy} className="bg-[#8B7355] hover:bg-[#6B5744] text-white">
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Submit Write-Off
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}