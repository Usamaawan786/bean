import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Plus, Trash2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import ImageUploadField from "./ImageUploadField";

const CATEGORIES = [
  "Breakfast", "Hot Coffee", "Cold Coffee", "Matcha", "Smoothies",
  "Fresher", "Teas & More", "Pastry", "Sweeter", "Add-Ons", "Other",
];

// Items tab — inline-edit every menu item: name, description, price, prep time,
// category, availability and image. Saves on blur / change.
export default function ItemsSection() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["storeProductsAdmin"],
    queryFn: () => base44.entities.StoreProduct.list("-created_date", 300),
  });
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const okSearch = !search || (p.name || "").toLowerCase().includes(search.toLowerCase());
      const okCat = !filterCat || p.category === filterCat;
      return okSearch && okCat;
    });
  }, [items, search, filterCat]);

  const updateField = async (id, patch) => {
    try {
      await base44.entities.StoreProduct.update(id, patch);
      qc.invalidateQueries(["storeProductsAdmin"]);
    } catch (e) {
      toast.error("Update failed");
    }
  };

  const addItem = async () => {
    const name = prompt("New item name:");
    if (!name) return;
    try {
      await base44.entities.StoreProduct.create({ name, price: 0, category: "Other", is_available: true });
      qc.invalidateQueries(["storeProductsAdmin"]);
      toast.success("Item added");
    } catch (e) {
      toast.error("Could not add item");
    }
  };

  const removeItem = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await base44.entities.StoreProduct.delete(item.id);
      qc.invalidateQueries(["storeProductsAdmin"]);
      toast.success("Item deleted");
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  if (isLoading) return <div className="text-sm text-[#8B7355]">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full rounded-lg border border-[#D9C3B0] pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-lg border border-[#D9C3B0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={addItem}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#8B7355] text-white text-sm hover:bg-[#7D5A46]"
        >
          <Plus className="h-4 w-4" /> Add item
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((item) => (
          <div key={item.id} className="rounded-xl border border-[#E8DED8] bg-white p-4">
            <div className="flex gap-4">
              <ImageUploadField
                value={item.image_url || ""}
                onChange={(v) => updateField(item.id, { image_url: v })}
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    defaultValue={item.name}
                    onBlur={(e) => updateField(item.id, { name: e.target.value })}
                    className="flex-1 font-semibold text-[#5C4A3A] bg-transparent border-b border-transparent focus:border-[#D9C3B0] focus:outline-none px-0 py-1"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-[#8B7355] whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={item.is_available !== false}
                      onChange={(e) => updateField(item.id, { is_available: e.target.checked })}
                      className="accent-[#8B7355]"
                    />
                    Available
                  </label>
                  <button onClick={() => removeItem(item)} className="text-red-500 hover:text-red-700 p-1" title="Delete item">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  defaultValue={item.description || ""}
                  onBlur={(e) => updateField(item.id, { description: e.target.value })}
                  placeholder="Description…"
                  rows={2}
                  className="w-full text-sm text-[#8B7355] rounded-lg border border-[#D9C3B0] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B7355] resize-y"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[#8B7355]">Rs.</span>
                    <input
                      type="number"
                      defaultValue={item.price}
                      onBlur={(e) => updateField(item.id, { price: Number(e.target.value) || 0 })}
                      className="w-24 rounded-lg border border-[#D9C3B0] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[#8B7355]">Prep</span>
                    <input
                      type="number"
                      defaultValue={item.preparation_time || 0}
                      onBlur={(e) => updateField(item.id, { preparation_time: Number(e.target.value) || 0 })}
                      className="w-16 rounded-lg border border-[#D9C3B0] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
                    />
                    <span className="text-xs text-[#8B7355]">min</span>
                  </div>
                  <select
                    value={item.category || "Other"}
                    onChange={(e) => updateField(item.id, { category: e.target.value })}
                    className="rounded-lg border border-[#D9C3B0] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-[#C9B8A6]">No items match.</div>
        )}
      </div>
    </div>
  );
}