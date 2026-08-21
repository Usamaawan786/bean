import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Save, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import LineItemCategoryTabs from "@/components/inventoryhub/LineItemCategoryTabs";

const EMPTY_LINE = { item_id: "", item_name: "", unit: "", unit_cost: 0, quantity: 1 };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function InvoiceFormModal({ open, onClose, onSaved, inventoryItems, cloneFrom }) {
  const [type, setType] = useState("PURCHASE_INVOICE");
  const [date, setDate] = useState(todayStr());
  const [supplierName, setSupplierName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [comments, setComments] = useState("");
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [cat, setCat] = useState("All");

  const filteredItems = useMemo(() => {
    if (cat === "All") return inventoryItems;
    return inventoryItems.filter((i) => (i.item_class || "Item") === cat);
  }, [inventoryItems, cat]);
  const catCounts = useMemo(() => {
    const c = { All: inventoryItems.length };
    for (const i of inventoryItems) {
      const k = i.item_class || "Item";
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [inventoryItems]);

  // Prefill when cloning from an existing invoice + its items
  useEffect(() => {
    if (!open) return;
    setError("");
    if (cloneFrom) {
      setType(cloneFrom.type || "PURCHASE_INVOICE");
      setDate(todayStr());
      setSupplierName(cloneFrom.supplier_name || "");
      setBranchName(cloneFrom.branch_name || "");
      setComments(cloneFrom.comments || "");
      const prefilled = (cloneFrom.items || []).map((it) => ({
        item_id: it.item_id || "",
        item_name: it.item_name || "",
        unit: it.unit || "",
        unit_cost: Number(it.unit_cost) || 0,
        quantity: Number(it.quantity) || 1
      }));
      setLines(prefilled.length ? prefilled : [{ ...EMPTY_LINE }]);
    } else {
      setType("PURCHASE_INVOICE");
      setDate(todayStr());
      setSupplierName("");
      setBranchName("");
      setComments("");
      setLines([{ ...EMPTY_LINE }]);
    }
  }, [open, cloneFrom]);

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0),
    [lines]
  );

  const updateLine = (idx, patch) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const onPickItem = (idx, itemId) => {
    const inv = inventoryItems.find((i) => i.id === itemId);
    if (!inv) { updateLine(idx, { item_id: "", item_name: "", unit: "", unit_cost: 0 }); return; }
    const conv = inv.conversion_rate || 1;
    const macPerStorage = (inv.moving_average_cost || inv.cost_per_base_unit || 0) * conv;
    updateLine(idx, {
      item_id: inv.id,
      item_name: inv.name,
      unit: inv.storage_unit || inv.base_unit || "",
      unit_cost: Math.round(macPerStorage * 100) / 100
    });
  };

  const addLine = () => setLines((p) => [...p, { ...EMPTY_LINE }]);
  const removeLine = (idx) => setLines((p) => p.filter((_, i) => i !== idx));

  const buildPayload = () => ({
    type,
    date,
    supplier_name: supplierName,
    branch_name: branchName,
    comments,
    cloned_from: cloneFrom?.invoice_number || "",
    items: lines.map((l) => ({
      item_id: l.item_id,
      item_name: l.item_name,
      unit: l.unit,
      unit_cost: Number(l.unit_cost) || 0,
      quantity: Number(l.quantity) || 0
    }))
  });

  const validate = () => {
    if (!date || !type) { setError("Date and type are required."); return false; }
    if (!lines.length || lines.some((l) => !l.item_name || !(Number(l.quantity) > 0))) {
      setError("Each line needs a name and a quantity greater than 0."); return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    setError("");
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke("saveInvoice", buildPayload());
      onSaved?.(res.data, false);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      const saveRes = await base44.functions.invoke("saveInvoice", buildPayload());
      const invoiceId = saveRes.data?.invoice_id;
      if (!invoiceId) throw new Error("Save did not return an invoice id");
      const subRes = await base44.functions.invoke("submitInvoice", { invoice_id: invoiceId });
      onSaved?.(subRes.data, true);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to submit invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = saving || submitting;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cloneFrom ? "Clone Invoice" : "New Invoice"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-[#E8DED8] bg-white px-2 text-sm text-[#5C4A3A]"
              >
                <option value="PURCHASE_INVOICE">Purchase Invoice (stock-in)</option>
                <option value="EXPENDITURE_INVOICE">Store Expenditure (no stock)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Supplier</Label>
              <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Supplier / vendor" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Branch</Label>
              <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="Branch / location" className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Comments</Label>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} placeholder="Internal notes" className="mt-1" />
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Line Items</Label>
              <Button size="sm" variant="outline" onClick={addLine} disabled={busy} className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
              </Button>
            </div>
            {type === "PURCHASE_INVOICE" && inventoryItems.length > 0 && (
              <div className="mb-2">
                <LineItemCategoryTabs active={cat} onChange={setCat} counts={catCounts} />
              </div>
            )}
            <div className="overflow-x-auto rounded-lg border border-[#E8DED8]">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-[#F5EBE8] text-[#8B7355] text-xs">
                  <tr>
                    <th className="text-left font-medium px-2 py-2">Item</th>
                    <th className="text-left font-medium px-2 py-2 w-20">Unit</th>
                    <th className="text-right font-medium px-2 py-2 w-24">Qty</th>
                    <th className="text-right font-medium px-2 py-2 w-28">Unit Cost</th>
                    <th className="text-right font-medium px-2 py-2 w-28">Line Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => {
                    const lineTotal = (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0);
                    return (
                      <tr key={idx} className="border-t border-[#E8DED8]">
                        <td className="px-2 py-1.5">
                          {type === "PURCHASE_INVOICE" && inventoryItems.length ? (
                            <select
                              value={l.item_id}
                              onChange={(e) => onPickItem(idx, e.target.value)}
                              className="w-full h-9 rounded-md border border-[#E8DED8] bg-white px-2 text-sm text-[#5C4A3A]"
                            >
                              <option value="">{l.item_name || "— select item —"}</option>
                              {filteredItems.map((inv) => (
                                <option key={inv.id} value={inv.id}>{inv.name}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={l.item_name}
                              onChange={(e) => updateLine(idx, { item_name: e.target.value })}
                              placeholder="Item / description"
                              className="h-9"
                            />
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <Input value={l.unit} onChange={(e) => updateLine(idx, { unit: e.target.value })} placeholder="unit" className="h-9" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number" min="0" step="any" value={l.quantity}
                            onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                            className="h-9 text-right"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number" min="0" step="any" value={l.unit_cost}
                            onChange={(e) => updateLine(idx, { unit_cost: e.target.value })}
                            className="h-9 text-right"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold text-[#5C4A3A]">
                          {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            onClick={() => removeLine(idx)} disabled={busy || lines.length === 1}
                            className="text-[#C9B8A6] hover:text-red-500 disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <span className="text-sm text-[#8B7355]">Total</span>
            <span className="text-xl font-bold text-[#5C4A3A]">
              PKR {total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={busy}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Draft
          </Button>
          <Button onClick={handleSubmit} disabled={busy} className="bg-[#8B7355] hover:bg-[#6B5744] text-white">
            {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Save & Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}