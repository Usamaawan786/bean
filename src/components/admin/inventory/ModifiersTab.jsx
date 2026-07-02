import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const emptyModifier = { modifier_name: "", modifier_type: "substitution", base_item_id: "", base_item_credit_qty: "", replacement_item_id: "", replacement_item_qty: "" };

export default function ModifiersTab() {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState(emptyModifier);

  const { data: products = [] } = useQuery({ queryKey: ["store-products-modifiers"], queryFn: () => base44.entities.StoreProduct.list() });
  const { data: ingredients = [] } = useQuery({ queryKey: ["inventory-items"], queryFn: () => base44.entities.InventoryItem.list() });
  const { data: modifiers = [] } = useQuery({
    queryKey: ["product-modifiers", selectedProduct?.id],
    queryFn: () => base44.entities.ProductModifier.filter({ product_id: selectedProduct.id }),
    enabled: !!selectedProduct
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductModifier.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["product-modifiers", selectedProduct.id] }); setForm(emptyModifier); toast.success("Modifier added"); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductModifier.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["product-modifiers", selectedProduct.id] }); toast.success("Removed"); }
  });

  const itemName = (id) => ingredients.find(i => i.id === id)?.name;

  const handleAdd = () => {
    if (!form.modifier_name) return toast.error("Name the modifier");
    addMutation.mutate({
      product_id: selectedProduct.id,
      modifier_name: form.modifier_name,
      modifier_type: form.modifier_type,
      base_item_id: form.base_item_id || undefined,
      base_item_credit_qty: form.base_item_credit_qty ? parseFloat(form.base_item_credit_qty) : undefined,
      replacement_item_id: form.replacement_item_id || undefined,
      replacement_item_qty: form.replacement_item_qty ? parseFloat(form.replacement_item_qty) : undefined
    });
  };

  if (!selectedProduct) {
    return (
      <div className="space-y-2">
        {products.map(p => (
          <button key={p.id} onClick={() => setSelectedProduct(p)} className="w-full flex items-center justify-between bg-white rounded-2xl border border-[#E8DED8] p-4 hover:border-[#8B7355] transition-colors">
            <span className="font-medium text-[#5C4A3A]">{p.name}</span>
            <ChevronRight className="h-4 w-4 text-[#8B7355]" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setSelectedProduct(null)} className="text-sm text-[#8B7355] underline">← Back to products</button>
      <h3 className="font-bold text-[#5C4A3A]">{selectedProduct.name} — Modifiers</h3>

      <div className="space-y-2">
        {modifiers.map(m => (
          <div key={m.id} className="flex items-center justify-between bg-white rounded-xl border border-[#E8DED8] p-3">
            <div>
              <p className="text-sm font-medium text-[#5C4A3A]">{m.modifier_name} <span className="text-xs text-[#8B7355]">({m.modifier_type})</span></p>
              <p className="text-xs text-[#8B7355]">
                {m.base_item_id && `+${m.base_item_credit_qty} ${itemName(m.base_item_id)} credited`}
                {m.base_item_id && m.replacement_item_id ? " · " : ""}
                {m.replacement_item_id && `-${m.replacement_item_qty} ${itemName(m.replacement_item_id)} used`}
              </p>
            </div>
            <Button size="sm" variant="outline" className="text-red-500" onClick={() => deleteMutation.mutate(m.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {modifiers.length === 0 && <p className="text-sm text-[#C9B8A6] text-center py-4">No modifiers defined yet</p>}
      </div>

      <div className="bg-[#F9F6F3] rounded-2xl p-4 space-y-2">
        <p className="text-xs font-semibold text-[#5C4A3A]">Add Modifier</p>
        <Input placeholder="Modifier name, e.g. Oat Milk" value={form.modifier_name} onChange={e => setForm(f => ({ ...f, modifier_name: e.target.value }))} />
        <Select value={form.modifier_type} onValueChange={v => setForm(f => ({ ...f, modifier_type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="substitution">Substitution</SelectItem>
            <SelectItem value="addition">Addition</SelectItem>
            <SelectItem value="removal">Removal</SelectItem>
          </SelectContent>
        </Select>
        {(form.modifier_type === "substitution" || form.modifier_type === "removal") && (
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.base_item_id} onValueChange={v => setForm(f => ({ ...f, base_item_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Item to credit back" /></SelectTrigger>
              <SelectContent>{ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" step="0.01" placeholder="Credit qty" value={form.base_item_credit_qty} onChange={e => setForm(f => ({ ...f, base_item_credit_qty: e.target.value }))} />
          </div>
        )}
        {(form.modifier_type === "substitution" || form.modifier_type === "addition") && (
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.replacement_item_id} onValueChange={v => setForm(f => ({ ...f, replacement_item_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Item to use instead" /></SelectTrigger>
              <SelectContent>{ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" step="0.01" placeholder="Debit qty" value={form.replacement_item_qty} onChange={e => setForm(f => ({ ...f, replacement_item_qty: e.target.value }))} />
          </div>
        )}
        <Button onClick={handleAdd} className="w-full bg-[#8B7355] hover:bg-[#6B5744]"><Plus className="h-4 w-4 mr-2" />Add Modifier</Button>
      </div>
    </div>
  );
}