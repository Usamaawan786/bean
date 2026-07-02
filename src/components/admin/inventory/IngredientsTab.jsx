import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, PackagePlus, AlertTriangle, Edit2 } from "lucide-react";
import { toast } from "sonner";

const emptyForm = { name: "", sku: "", base_unit: "grams", storage_unit: "", conversion_rate: "1", min_par_level_base_qty: "0", cost_per_base_unit: "0", supplier: "", category: "" };

export default function IngredientsTab() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [purchaseItem, setPurchaseItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [purchaseForm, setPurchaseForm] = useState({ qty_received_storage_units: "", cost_per_storage_unit_pkr: "", invoice_number: "", supplier: "" });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: () => base44.entities.InventoryItem.list("-created_date", 500)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InventoryItem.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory-items"] }); setShowDialog(false); toast.success("Ingredient added"); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InventoryItem.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory-items"] }); setShowDialog(false); setEditingItem(null); toast.success("Ingredient updated"); }
  });
  const purchaseMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("logPurchaseInvoice", payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory-items"] }); setShowPurchase(false); toast.success("Purchase logged, stock updated"); },
    onError: (e) => toast.error("Failed: " + (e?.message || "Unknown error"))
  });

  const openNew = () => { setEditingItem(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name, sku: item.sku || "", base_unit: item.base_unit, storage_unit: item.storage_unit || "",
      conversion_rate: String(item.conversion_rate || 1), min_par_level_base_qty: String(item.min_par_level_base_qty || 0),
      cost_per_base_unit: String(item.cost_per_base_unit || 0), supplier: item.supplier || "", category: item.category || ""
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      conversion_rate: parseFloat(form.conversion_rate) || 1,
      min_par_level_base_qty: parseFloat(form.min_par_level_base_qty) || 0,
      cost_per_base_unit: parseFloat(form.cost_per_base_unit) || 0
    };
    if (editingItem) updateMutation.mutate({ id: editingItem.id, data });
    else createMutation.mutate({ ...data, current_stock_base_qty: 0, moving_average_cost: data.cost_per_base_unit });
  };

  const openPurchase = (item) => {
    setPurchaseItem(item);
    setPurchaseForm({ qty_received_storage_units: "", cost_per_storage_unit_pkr: "", invoice_number: "", supplier: item.supplier || "" });
    setShowPurchase(true);
  };

  const handlePurchaseSubmit = (e) => {
    e.preventDefault();
    purchaseMutation.mutate({
      inventory_item_id: purchaseItem.id,
      qty_received_storage_units: parseFloat(purchaseForm.qty_received_storage_units),
      cost_per_storage_unit_pkr: parseFloat(purchaseForm.cost_per_storage_unit_pkr),
      invoice_number: purchaseForm.invoice_number,
      supplier: purchaseForm.supplier
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-[#8B7355] hover:bg-[#6B5744]"><Plus className="h-4 w-4 mr-2" />Add Ingredient</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl text-[#8B7355]">No ingredients yet</div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const low = item.current_stock_base_qty <= (item.min_par_level_base_qty || 0);
            return (
              <div key={item.id} className={`bg-white rounded-2xl border p-4 flex items-center justify-between gap-3 flex-wrap ${item.is_negative_flagged ? "border-red-300" : low ? "border-amber-200" : "border-[#E8DED8]"}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#5C4A3A]">{item.name}</p>
                    {item.category && <Badge variant="outline" className="text-xs">{item.category}</Badge>}
                    {item.is_negative_flagged && <Badge className="bg-red-500 text-white text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Negative</Badge>}
                    {!item.is_negative_flagged && low && <Badge className="bg-amber-400 text-white text-xs">Low</Badge>}
                  </div>
                  <p className="text-xs text-[#8B7355] mt-1">
                    {(item.current_stock_base_qty || 0).toFixed(1)} {item.base_unit} in stock · MAC Rs. {(item.moving_average_cost || 0).toFixed(2)}/{item.base_unit}
                    {item.supplier ? ` · ${item.supplier}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" onClick={() => openPurchase(item)} className="bg-green-600 hover:bg-green-700">
                    <PackagePlus className="h-4 w-4 mr-1" /> Log Purchase
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(item)}><Edit2 className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingItem ? "Edit Ingredient" : "Add Ingredient"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
              <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Base Unit</Label>
                <Select value={form.base_unit} onValueChange={v => setForm(f => ({ ...f, base_unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grams">grams</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="pieces">pieces</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Storage Unit</Label><Input placeholder="e.g. 1kg bag" value={form.storage_unit} onChange={e => setForm(f => ({ ...f, storage_unit: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Conversion Rate</Label><Input type="number" step="0.01" value={form.conversion_rate} onChange={e => setForm(f => ({ ...f, conversion_rate: e.target.value }))} required /></div>
              <div><Label>Min Par (base unit)</Label><Input type="number" step="0.01" value={form.min_par_level_base_qty} onChange={e => setForm(f => ({ ...f, min_par_level_base_qty: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cost / Base Unit (PKR)</Label><Input type="number" step="0.01" value={form.cost_per_base_unit} onChange={e => setForm(f => ({ ...f, cost_per_base_unit: e.target.value }))} /></div>
              <div><Label>Supplier</Label><Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-[#8B7355] hover:bg-[#6B5744]">{editingItem ? "Update" : "Add"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPurchase} onOpenChange={setShowPurchase}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader><DialogTitle>Log Purchase: {purchaseItem?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handlePurchaseSubmit} className="space-y-3">
            <div><Label>Qty Received ({purchaseItem?.storage_unit || "storage units"})</Label><Input type="number" step="0.01" value={purchaseForm.qty_received_storage_units} onChange={e => setPurchaseForm(f => ({ ...f, qty_received_storage_units: e.target.value }))} required /></div>
            <div><Label>Cost per Storage Unit (PKR)</Label><Input type="number" step="0.01" value={purchaseForm.cost_per_storage_unit_pkr} onChange={e => setPurchaseForm(f => ({ ...f, cost_per_storage_unit_pkr: e.target.value }))} required /></div>
            <div><Label>Invoice Number</Label><Input value={purchaseForm.invoice_number} onChange={e => setPurchaseForm(f => ({ ...f, invoice_number: e.target.value }))} /></div>
            <div><Label>Supplier</Label><Input value={purchaseForm.supplier} onChange={e => setPurchaseForm(f => ({ ...f, supplier: e.target.value }))} /></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowPurchase(false)}>Cancel</Button>
              <Button type="submit" disabled={purchaseMutation.isPending} className="flex-1 bg-green-600 hover:bg-green-700">Log & Update Stock</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}