import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ChevronRight, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { verifyRecipePassword } from "@/lib/recipeLock";

export default function RecipesTab({ user }) {
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newRow, setNewRow] = useState({ inventory_item_id: "", required_qty_base_unit: "", loss_pct: "0", is_locked: false });
  const [unlocked, setUnlocked] = useState(() => new Set());
  const [unlockingRow, setUnlockingRow] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");

  const { data: products = [] } = useQuery({ queryKey: ["store-products-recipes"], queryFn: () => base44.entities.StoreProduct.list() });
  const { data: ingredients = [] } = useQuery({ queryKey: ["inventory-items"], queryFn: () => base44.entities.InventoryItem.list() });
  const { data: recipeRows = [] } = useQuery({
    queryKey: ["recipe-rows", selectedProduct?.id],
    queryFn: () => base44.entities.Recipe.filter({ product_id: selectedProduct.id }),
    enabled: !!selectedProduct
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.Recipe.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recipe-rows", selectedProduct.id] }); setNewRow({ inventory_item_id: "", required_qty_base_unit: "", loss_pct: "0", is_locked: false }); toast.success("Ingredient added to recipe"); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Recipe.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recipe-rows", selectedProduct.id] }); toast.success("Removed"); }
  });
  const toggleLockMutation = useMutation({
    mutationFn: ({ id, is_locked }) => base44.entities.Recipe.update(id, { is_locked }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipe-rows", selectedProduct.id] })
  });

  const handleAdd = () => {
    if (!newRow.inventory_item_id || !newRow.required_qty_base_unit) return toast.error("Select an ingredient and quantity");
    addMutation.mutate({
      product_id: selectedProduct.id,
      inventory_item_id: newRow.inventory_item_id,
      required_qty_base_unit: parseFloat(newRow.required_qty_base_unit),
      loss_pct: parseFloat(newRow.loss_pct) || 0,
      is_locked: !!newRow.is_locked
    });
  };

  const handleUnlockSubmit = () => {
    if (verifyRecipePassword(passwordInput)) {
      setUnlocked(prev => new Set(prev).add(unlockingRow));
      setUnlockingRow(null);
      setPasswordInput("");
      toast.success("Recipe unlocked");
    } else {
      toast.error("Incorrect password");
    }
  };

  const itemName = (id) => ingredients.find(i => i.id === id)?.name || "Unknown";
  const itemUnit = (id) => ingredients.find(i => i.id === id)?.base_unit || "";

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
      <h3 className="font-bold text-[#5C4A3A]">{selectedProduct.name} — Recipe</h3>

      <div className="space-y-2">
        {recipeRows.map(row => {
          const showDetails = !row.is_locked || isAdmin || unlocked.has(row.id);
          return (
            <div key={row.id} className="flex items-center justify-between bg-white rounded-xl border border-[#E8DED8] p-3">
              <div className="min-w-0">
                {showDetails ? (
                  <>
                    <p className="text-sm font-medium text-[#5C4A3A]">{itemName(row.inventory_item_id)}</p>
                    <p className="text-xs text-[#8B7355]">
                      {row.required_qty_base_unit} {itemUnit(row.inventory_item_id)} {row.loss_pct > 0 ? `· ${row.loss_pct}% loss` : ""}
                      {row.is_locked && <span className="ml-1 text-[#5C4A3A] font-medium bg-[#F5EBE8] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" />Locked</span>}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#8B7355]" />
                    <p className="text-sm font-medium text-[#5C4A3A]">Locked ingredient</p>
                    <Button size="sm" variant="outline" onClick={() => { setUnlockingRow(row.id); setPasswordInput(""); }}>
                      <Unlock className="h-3 w-3 mr-1" /> Unlock
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => toggleLockMutation.mutate({ id: row.id, is_locked: !row.is_locked })} title={row.is_locked ? "Unlock (admin)" : "Lock (admin)"}>
                    {row.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-red-500" onClick={() => deleteMutation.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}
        {recipeRows.length === 0 && <p className="text-sm text-[#C9B8A6] text-center py-4">No ingredients defined yet</p>}
      </div>

      <div className="bg-[#F9F6F3] rounded-2xl p-4 space-y-2">
        <p className="text-xs font-semibold text-[#5C4A3A]">Add Ingredient</p>
        <Select value={newRow.inventory_item_id} onValueChange={v => setNewRow(r => ({ ...r, inventory_item_id: v }))}>
          <SelectTrigger><SelectValue placeholder="Select ingredient" /></SelectTrigger>
          <SelectContent>{ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.base_unit})</SelectItem>)}</SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" step="0.01" placeholder="Qty (base unit)" value={newRow.required_qty_base_unit} onChange={e => setNewRow(r => ({ ...r, required_qty_base_unit: e.target.value }))} />
          <Input type="number" step="0.1" placeholder="Loss %" value={newRow.loss_pct} onChange={e => setNewRow(r => ({ ...r, loss_pct: e.target.value }))} />
        </div>
        {isAdmin && (
          <label className="flex items-center gap-2 text-xs text-[#5C4A3A] cursor-pointer">
            <input type="checkbox" checked={newRow.is_locked} onChange={e => setNewRow(r => ({ ...r, is_locked: e.target.checked }))} className="h-4 w-4 rounded border-[#D4C4B0]" />
            <span>Lock this ingredient (requires password to view)</span>
          </label>
        )}
        <Button onClick={handleAdd} className="w-full bg-[#8B7355] hover:bg-[#6B5744]"><Plus className="h-4 w-4 mr-2" />Add to Recipe</Button>
      </div>

      <Dialog open={!!unlockingRow} onOpenChange={(o) => { if (!o) { setUnlockingRow(null); setPasswordInput(""); } }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle>Unlock Recipe</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-[#8B7355]">Enter the password to view this locked ingredient.</p>
            <Input type="password" placeholder="Password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleUnlockSubmit(); }} autoFocus />
            <Button onClick={handleUnlockSubmit} className="w-full bg-[#8B7355] hover:bg-[#6B5744]">Unlock</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}