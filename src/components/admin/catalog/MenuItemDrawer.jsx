import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MenuItemDrawer({ item, open, onClose, onSaved, categories }) {
  const isNew = !item?.id;
  const [form, setForm] = useState({ name: "", description: "", base_price: "", tax_rate: "0.17", category_id: "", is_available: true, image_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (item) setForm({ name: item.name || "", description: item.description || "", base_price: item.base_price ?? "", tax_rate: item.tax_rate ?? "0.17", category_id: item.category_id || "", is_available: item.is_available !== false, image_url: item.image_url || "" });
  }, [item]);

  const { data: recipes = [], refetch: refetchRecipes } = useQuery({
    queryKey: ["menu-item-recipes", item?.id], queryFn: () => base44.entities.MenuItemRecipe.filter({ menu_item_id: item.id }), enabled: !!item?.id
  });
  const { data: modifiers = [], refetch: refetchModifiers } = useQuery({
    queryKey: ["menu-modifiers", item?.id], queryFn: () => base44.entities.MenuModifier.filter({ menu_item_id: item.id }), enabled: !!item?.id
  });
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory-items-all"], queryFn: () => base44.entities.InventoryItem.list('-name', 200)
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); setForm(f => ({ ...f, image_url: file_url })); } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  const saveItem = async () => {
    setSaving(true);
    try {
      const data = { ...form, base_price: parseFloat(form.base_price) || 0, tax_rate: parseFloat(form.tax_rate) || 0.17 };
      if (isNew) await base44.entities.MenuItem.create(data);
      else await base44.entities.MenuItem.update(item.id, data);
      toast.success(isNew ? "Item created" : "Item updated");
      onSaved();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const addRecipeRow = async () => {
    await base44.entities.MenuItemRecipe.create({ menu_item_id: item.id, inventory_item_id: inventoryItems[0]?.id || "", net_weight_required: 0, waste_percentage_multiplier: 1.0 });
    refetchRecipes();
  };
  const updateRecipe = async (id, field, value) => { await base44.entities.MenuItemRecipe.update(id, { [field]: value }); refetchRecipes(); };
  const deleteRecipe = async (id) => { await base44.entities.MenuItemRecipe.delete(id); refetchRecipes(); };

  const addModifier = async () => {
    await base44.entities.MenuModifier.create({ menu_item_id: item.id, name: "New Modifier", price_delta: 0, is_available: true });
    refetchModifiers();
  };
  const updateModifier = async (id, data) => { await base44.entities.MenuModifier.update(id, data); refetchModifiers(); };
  const deleteModifier = async (id) => { await base44.entities.MenuModifier.delete(id); refetchModifiers(); };

  const getUnit = (id) => inventoryItems.find(i => i.id === id)?.base_unit || "";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-[#5C4A3A]">{isNew ? "Add Menu Item" : `Edit: ${item?.name}`}</DialogTitle></DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="recipe" disabled={isNew}>Recipe</TabsTrigger>
            <TabsTrigger value="modifiers" disabled={isNew}>Modifiers</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border-[#E8DED8]" /></div>
              <div><Label>Base Price (PKR)</Label><Input type="number" step="0.01" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} className="border-[#E8DED8]" /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="border-[#E8DED8]" /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger className="border-[#E8DED8]"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Image</Label><Input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="border-[#E8DED8]" />
              {form.image_url && <img src={form.image_url} alt="" className="mt-2 w-24 h-24 object-cover rounded-xl" />}
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_available} onCheckedChange={v => setForm(f => ({ ...f, is_available: v }))} /><Label>Available</Label></div>
            <Button onClick={saveItem} disabled={saving || !form.name || !form.base_price} className="w-full bg-[#8B7355] hover:bg-[#6B5744]">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{isNew ? "Create Item" : "Update Item"}
            </Button>
          </TabsContent>

          <TabsContent value="recipe" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-[#5C4A3A]">Ingredient Recipe</h4>
              <Button size="sm" onClick={addRecipeRow} className="bg-[#8B7355] hover:bg-[#6B5744]"><Plus className="h-3 w-3 mr-1" /> Add Row</Button>
            </div>
            {recipes.length > 0 && (
              <div className="grid grid-cols-12 gap-2 text-xs text-[#8B7355] font-medium px-3">
                <span className="col-span-4">Ingredient</span><span className="col-span-2 text-center">Unit</span><span className="col-span-2 text-center">Net Wt</span><span className="col-span-2 text-center">Waste ×</span><span className="col-span-1 text-right">Eff.</span><span className="col-span-1" />
              </div>
            )}
            {recipes.map(r => (
              <div key={r.id} className="grid grid-cols-12 gap-2 items-center bg-[#F5EBE8] rounded-xl p-3">
                <div className="col-span-4">
                  <Select value={r.inventory_item_id} onValueChange={v => updateRecipe(r.id, 'inventory_item_id', v)}>
                    <SelectTrigger className="h-8 text-xs border-[#E8DED8] bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{inventoryItems.map(ii => <SelectItem key={ii.id} value={ii.id}>{ii.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 text-xs text-center text-[#8B7355]">{getUnit(r.inventory_item_id)}</div>
                <div className="col-span-2"><Input type="number" step="0.01" value={r.net_weight_required} onChange={e => updateRecipe(r.id, 'net_weight_required', parseFloat(e.target.value) || 0)} className="h-8 text-xs border-[#E8DED8]" /></div>
                <div className="col-span-2"><Input type="number" step="0.01" value={r.waste_percentage_multiplier} onChange={e => updateRecipe(r.id, 'waste_percentage_multiplier', parseFloat(e.target.value) || 1)} className="h-8 text-xs border-[#E8DED8]" /></div>
                <div className="col-span-1 text-xs text-[#5C4A3A] font-semibold text-right">{((r.net_weight_required || 0) * (r.waste_percentage_multiplier || 1)).toFixed(1)}</div>
                <div className="col-span-1 flex justify-end"><button onClick={() => deleteRecipe(r.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div>
              </div>
            ))}
            {recipes.length === 0 && <p className="text-sm text-[#C9B8A6] text-center py-6">No recipe rows — add ingredients to auto-deduct on sale</p>}
          </TabsContent>

          <TabsContent value="modifiers" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-[#5C4A3A]">Modifiers</h4>
              <Button size="sm" onClick={addModifier} className="bg-[#8B7355] hover:bg-[#6B5744]"><Plus className="h-3 w-3 mr-1" /> Add</Button>
            </div>
            {modifiers.map(mod => (
              <ModifierRow key={mod.id} modifier={mod} inventoryItems={inventoryItems} onUpdate={updateModifier} onDelete={deleteModifier} />
            ))}
            {modifiers.length === 0 && <p className="text-sm text-[#C9B8A6] text-center py-6">No modifiers configured</p>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ModifierRow({ modifier, inventoryItems, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const { data: recipes = [], refetch } = useQuery({
    queryKey: ["modifier-recipes", modifier.id], queryFn: () => base44.entities.MenuModifierRecipe.filter({ menu_modifier_id: modifier.id }), enabled: expanded
  });

  const addRow = async () => {
    await base44.entities.MenuModifierRecipe.create({ menu_modifier_id: modifier.id, inventory_item_id: inventoryItems[0]?.id || "", net_weight_required: 0, waste_percentage_multiplier: 1.0 });
    refetch();
  };
  const updateRow = async (id, field, value) => { await base44.entities.MenuModifierRecipe.update(id, { [field]: value }); refetch(); };
  const deleteRow = async (id) => { await base44.entities.MenuModifierRecipe.delete(id); refetch(); };

  return (
    <div className="border border-[#E8DED8] rounded-xl p-3">
      <div className="flex items-center gap-2">
        <Input value={modifier.name} onChange={e => onUpdate(modifier.id, { name: e.target.value })} className="h-8 text-sm border-[#E8DED8] flex-1" placeholder="Modifier name" />
        <Input type="number" value={modifier.price_delta} onChange={e => onUpdate(modifier.id, { price_delta: parseFloat(e.target.value) || 0 })} className="h-8 text-sm border-[#E8DED8] w-24" placeholder="+PKR" />
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-[#8B7355] hover:underline whitespace-nowrap">{expanded ? "Hide" : "Recipe"}</button>
        <button onClick={() => onDelete(modifier.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {expanded && (
        <div className="mt-3 pl-4 border-l-2 border-[#E8DED8] space-y-2">
          {recipes.map(r => (
            <div key={r.id} className="flex items-center gap-2">
              <Select value={r.inventory_item_id} onValueChange={v => updateRow(r.id, 'inventory_item_id', v)}>
                <SelectTrigger className="h-7 text-xs border-[#E8DED8] bg-white flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>{inventoryItems.map(ii => <SelectItem key={ii.id} value={ii.id}>{ii.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" step="0.01" value={r.net_weight_required} onChange={e => updateRow(r.id, 'net_weight_required', parseFloat(e.target.value) || 0)} className="h-7 text-xs w-20 border-[#E8DED8]" placeholder="Qty" />
              <Input type="number" step="0.01" value={r.waste_percentage_multiplier} onChange={e => updateRow(r.id, 'waste_percentage_multiplier', parseFloat(e.target.value) || 1)} className="h-7 text-xs w-16 border-[#E8DED8]" placeholder="×" />
              <button onClick={() => deleteRow(r.id)} className="text-red-400"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addRow} className="h-7 text-xs border-dashed"><Plus className="h-3 w-3 mr-1" /> Add Ingredient</Button>
        </div>
      )}
    </div>
  );
}