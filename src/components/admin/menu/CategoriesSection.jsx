import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import ImageUploadField from "./ImageUploadField";

const CATEGORY_ORDER = [
  "Breakfast", "Hot Coffee", "Cold Coffee", "Matcha", "Smoothies",
  "Fresher", "Teas & More", "Pastry", "Sweeter", "Add-Ons", "Other",
];

// Categories tab — edit each category's display name, description and banner image.
export default function CategoriesSection() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["menuCategories"],
    queryFn: () => base44.entities.MenuCategory.list("sort_order", 100),
  });

  const sorted = [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.name);
    const bi = CATEGORY_ORDER.indexOf(b.name);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const updateField = async (id, patch) => {
    try {
      await base44.entities.MenuCategory.update(id, patch);
      qc.invalidateQueries(["menuCategories"]);
    } catch (e) {
      toast.error("Update failed");
    }
  };

  const addCategory = async () => {
    const name = prompt("New category name:");
    if (!name) return;
    try {
      await base44.entities.MenuCategory.create({ name, display_name: name, sort_order: 99 });
      qc.invalidateQueries(["menuCategories"]);
      toast.success("Category added");
    } catch (e) {
      toast.error("Could not add category");
    }
  };

  const removeCategory = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"? Items will remain but become uncategorized.`)) return;
    try {
      await base44.entities.MenuCategory.delete(cat.id);
      qc.invalidateQueries(["menuCategories"]);
      toast.success("Category deleted");
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  if (isLoading) return <div className="text-sm text-[#8B7355]">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={addCategory}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B7355] text-white text-sm hover:bg-[#7D5A46]"
        >
          <Plus className="h-4 w-4" /> Add category
        </button>
      </div>
      {sorted.map((cat) => (
        <div key={cat.id} className="rounded-xl border border-[#E8DED8] bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <input
              defaultValue={cat.display_name || cat.name}
              onBlur={(e) => updateField(cat.id, { display_name: e.target.value })}
              className="flex-1 font-semibold text-[#5C4A3A] bg-transparent border-b border-transparent focus:border-[#D9C3B0] focus:outline-none px-0 py-1"
            />
            <button
              onClick={() => removeCategory(cat)}
              className="text-red-500 hover:text-red-700 p-1"
              title="Delete category"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input
            defaultValue={cat.description || ""}
            onBlur={(e) => updateField(cat.id, { description: e.target.value })}
            placeholder="Category tagline…"
            className="w-full text-sm text-[#8B7355] rounded-lg border border-[#D9C3B0] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
          />
          <ImageUploadField
            label="Banner image"
            value={cat.image_url || ""}
            onChange={(v) => updateField(cat.id, { image_url: v })}
          />
        </div>
      ))}
    </div>
  );
}