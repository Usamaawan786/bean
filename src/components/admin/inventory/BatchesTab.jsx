import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Factory, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function BatchesTab() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showProduce, setShowProduce] = useState(false);
  const [multiplier, setMultiplier] = useState("1");
  const [newBatch, setNewBatch] = useState({ name: "", output_inventory_item_id: "", batch_yield_qty_base_unit: "" });
  const [newRow, setNewRow] = useState({ inventory_item_id: "", required_qty_base_unit: "", loss_pct: "0" });

  const { data: batches = [] } = useQuery({ queryKey: ["composite-batches"], queryFn: () => base44.entities.CompositeBatch.list("-created_date") });
  const { data: ingredients = [] } = useQuery({ queryKey: ["inventory-items"], queryFn: () => base44.entities.InventoryItem.list() });
  const { data: recipeRows = [] } = useQuery({
    queryKey: ["batch-recipe-rows", selectedBatch?.id],
    queryFn: () => base44.entities.Recipe.filter({ composite_batch_id: selectedBatch.id }),
    enabled: !!selectedBatch
  });

  const createBatchMutation = useMutation({
    mutationFn: (data) => base44.entities.CompositeBatch.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["composite-batches"] }); setShowNew(false); setNewBatch({ name: "", output_inventory_item_id: "", batch_yield_qty_base_unit: "" }); toast.success("Batch created"); }
  });
  const addRowMutation = useMutation({
    mutationFn: (data) => base44.entities.Recipe.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["batch-recipe-rows", selectedBatch.id] }); setNewRow({ inventory_item_id: "", required_qty_base_unit: "", loss_pct: "0" }); }
  });
  const deleteRowMutation = useMutation({
    mutationFn: (id) => base44.entities.Recipe.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["batch-recipe-rows", selectedBatch.id] })
  });
  const produceMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("produceBatch", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["composite-batches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setShowProduce(false);
      toast.success("Batch produced, stock updated");
    },
    onError: (e) => toast.error("Failed: " + (e?.message || "Unknown error"))
  });

  const itemName = (id) => ingredients.find(i => i.id === id)?.name || "Unknown";
  const itemUnit = (id) => ingredients.find(i => i.id === id)?.base_unit || "";

  const handleCreateBatch = () => {
    if (!newBatch.name || !newBatch.output_inventory_item_id || !newBatch.batch_yield_qty_base_unit) return toast.error("Fill in all fields");
    createBatchMutation.mutate({
      name: newBatch.name,
      output_inventory_item_id: newBatch.output_inventory_item_id,
      batch_yield_qty_base_unit: parseFloat(newBatch.batch_yield_qty_base_unit)
    });
  };

  const handleAddRow = () => {
    if (!newRow.inventory_item_id || !newRow.required_qty_base_unit) return toast.error("Select an ingredient and quantity");
    addRowMutation.mutate({
      composite_batch_id: selectedBatch.id,
      inventory_item_id: newRow.inventory_item_id,
      required_qty_base_unit: parseFloat(newRow.required_qty_base_unit),
      loss_pct: parseFloat(newRow.loss_pct) || 0
    });
  };

  if (selectedBatch) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedBatch(null)} className="text-sm text-[#8B7355] underline">← Back to batches</button>
        <h3 className="font-bold text-[#5C4A3A]">{selectedBatch.name} — Raw Ingredients</h3>

        <div className="space-y-2">
          {recipeRows.map(row => (
            <div key={row.id} className="flex items-center justify-between bg-white rounded-xl border border-[#E8DED8] p-3">
              <div>
                <p className="text-sm font-medium text-[#5C4A3A]">{itemName(row.inventory_item_id)}</p>
                <p className="text-xs text-[#8B7355]">{row.required_qty_base_unit} {itemUnit(row.inventory_item_id)} {row.loss_pct > 0 ? `· ${row.loss_pct}% loss` : ""}</p>
              </div>
              <Button size="sm" variant="outline" className="text-red-500" onClick={() => deleteRowMutation.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {recipeRows.length === 0 && <p className="text-sm text-[#C9B8A6] text-center py-4">No raw ingredients defined yet</p>}
        </div>

        <div className="bg-[#F9F6F3] rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-[#5C4A3A]">Add Raw Ingredient</p>
          <Select value={newRow.inventory_item_id} onValueChange={v => setNewRow(r => ({ ...r, inventory_item_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Select ingredient" /></SelectTrigger>
            <SelectContent>{ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.base_unit})</SelectItem>)}</SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" step="0.01" placeholder="Qty (base unit)" value={newRow.required_qty_base_unit} onChange={e => setNewRow(r => ({ ...r, required_qty_base_unit: e.target.value }))} />
            <Input type="number" step="0.1" placeholder="Loss %" value={newRow.loss_pct} onChange={e => setNewRow(r => ({ ...r, loss_pct: e.target.value }))} />
          </div>
          <Button onClick={handleAddRow} className="w-full bg-[#8B7355] hover:bg-[#6B5744]"><Plus className="h-4 w-4 mr-2" />Add</Button>
        </div>

        <Button onClick={() => { setMultiplier("1"); setShowProduce(true); }} className="w-full bg-green-600 hover:bg-green-700">
          <Factory className="h-4 w-4 mr-2" /> Produce Batch
        </Button>

        <Dialog open={showProduce} onOpenChange={setShowProduce}>
          <DialogContent className="max-w-sm rounded-3xl">
            <DialogHeader><DialogTitle>Produce {selectedBatch.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Number of batches</Label>
                <Input type="number" min="1" step="1" value={multiplier} onChange={e => setMultiplier(e.target.value)} />
              </div>
              <p className="text-xs text-[#8B7355]">Yields {(selectedBatch.batch_yield_qty_base_unit * (parseFloat(multiplier) || 1)).toFixed(1)} {itemUnit(selectedBatch.output_inventory_item_id)} of {itemName(selectedBatch.output_inventory_item_id)}</p>
              <Button
                onClick={() => produceMutation.mutate({ batch_id: selectedBatch.id, multiplier: parseFloat(multiplier) || 1 })}
                disabled={produceMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Confirm Production
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowNew(true)} className="bg-[#8B7355] hover:bg-[#6B5744]"><Plus className="h-4 w-4 mr-2" />New Batch</Button>
      </div>
      <div className="space-y-2">
        {batches.map(b => (
          <button key={b.id} onClick={() => setSelectedBatch(b)} className="w-full flex items-center justify-between bg-white rounded-2xl border border-[#E8DED8] p-4 hover:border-[#8B7355] transition-colors">
            <div className="text-left">
              <p className="font-medium text-[#5C4A3A]">{b.name}</p>
              <p className="text-xs text-[#8B7355]">Yields {b.batch_yield_qty_base_unit} {itemUnit(b.output_inventory_item_id)} · {itemName(b.output_inventory_item_id)}</p>
              {b.last_produced_at && <p className="text-xs text-[#C9B8A6]">Last produced {format(new Date(b.last_produced_at), "MMM d, h:mm a")}</p>}
            </div>
            <ChevronRight className="h-4 w-4 text-[#8B7355] flex-shrink-0" />
          </button>
        ))}
        {batches.length === 0 && <p className="text-sm text-[#C9B8A6] text-center py-4">No composite batches yet</p>}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader><DialogTitle>New Composite Batch</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={newBatch.name} onChange={e => setNewBatch(b => ({ ...b, name: e.target.value }))} placeholder="e.g. Vanilla Syrup Batch" /></div>
            <div>
              <Label>Output Ingredient (stocked item)</Label>
              <Select value={newBatch.output_inventory_item_id} onValueChange={v => setNewBatch(b => ({ ...b, output_inventory_item_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>{ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Batch Yield (base unit)</Label><Input type="number" step="0.01" value={newBatch.batch_yield_qty_base_unit} onChange={e => setNewBatch(b => ({ ...b, batch_yield_qty_base_unit: e.target.value }))} /></div>
            <Button onClick={handleCreateBatch} className="w-full bg-[#8B7355] hover:bg-[#6B5744]">Create Batch</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}