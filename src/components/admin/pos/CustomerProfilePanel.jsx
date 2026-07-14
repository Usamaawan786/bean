import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Plus, Pencil, Trash2, X, Loader2, BookOpen, Star, Phone } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CustomerProfilePanel({ products = [] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null); // null | "new" | recipe object
  const [recipeForm, setRecipeForm] = useState({ product_id: "", customization_notes: "" });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Search customers by email/name/phone
  const { data: customerResults = [], isLoading: searching } = useQuery({
    queryKey: ["pos-customer-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.trim().length < 2) return [];
      const term = searchTerm.trim();
      // Try email match first, then fall back to broad list filtered client-side
      try {
        const byEmail = await base44.entities.Customer.filter({ user_email: term });
        if (byEmail.length > 0) return byEmail;
      } catch (e) { /* ignore */ }
      const all = await base44.entities.Customer.list("-created_date", 500);
      const t = term.toLowerCase();
      return all.filter(c =>
        (c.user_email || "").toLowerCase().includes(t) ||
        (c.display_name || "").toLowerCase().includes(t) ||
        (c.phone || "").toLowerCase().includes(t)
      ).slice(0, 20);
    },
    enabled: searchTerm.trim().length >= 2
  });

  // Saved recipes for the selected customer
  const { data: recipes = [], isLoading: loadingRecipes } = useQuery({
    queryKey: ["customer-recipes", selectedCustomer?.user_email],
    queryFn: () => base44.entities.CustomerProductRecipe.filter({ customer_email: selectedCustomer.user_email }),
    enabled: !!selectedCustomer?.user_email
  });

  const pickCustomer = (c) => {
    setSelectedCustomer(c);
    setEditingRecipe(null);
    setSearchTerm("");
  };

  const startNewRecipe = () => {
    setEditingRecipe("new");
    setRecipeForm({ product_id: "", customization_notes: "" });
  };

  const startEditRecipe = (r) => {
    setEditingRecipe(r);
    setRecipeForm({ product_id: r.product_id, customization_notes: r.customization_notes || "" });
  };

  const saveRecipe = async () => {
    if (!recipeForm.product_id) {
      toast.error("Select a product first");
      return;
    }
    if (!recipeForm.customization_notes?.trim()) {
      toast.error("Enter the customization notes");
      return;
    }
    const product = products.find(p => p.id === recipeForm.product_id);
    if (!product) {
      toast.error("Product not found");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customer_email: selectedCustomer.user_email,
        product_id: recipeForm.product_id,
        product_name: product.name,
        customization_notes: recipeForm.customization_notes.trim()
      };
      if (editingRecipe === "new") {
        await base44.entities.CustomerProductRecipe.create(payload);
        toast.success("Saved recipe added");
      } else {
        await base44.entities.CustomerProductRecipe.update(editingRecipe.id, payload);
        toast.success("Recipe updated");
      }
      queryClient.invalidateQueries({ queryKey: ["customer-recipes", selectedCustomer.user_email] });
      setEditingRecipe(null);
    } catch (err) {
      toast.error("Failed to save: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const deleteRecipe = async (r) => {
    if (!confirm(`Delete saved recipe for ${r.product_name}?`)) return;
    try {
      await base44.entities.CustomerProductRecipe.delete(r.id);
      queryClient.invalidateQueries({ queryKey: ["customer-recipes", selectedCustomer.user_email] });
      toast.success("Recipe deleted");
    } catch (err) {
      toast.error("Failed to delete: " + (err?.message || "Unknown error"));
    }
  };

  const tierColor = {
    Bronze: "bg-amber-100 text-amber-800",
    Silver: "bg-gray-200 text-gray-700",
    Gold: "bg-yellow-100 text-yellow-800",
    Platinum: "bg-indigo-100 text-indigo-800"
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="bg-white rounded-2xl border border-[#E8DED8] p-6">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-5 w-5 text-[#8B7355]" />
          <h3 className="font-semibold text-[#5C4A3A]">Find Customer</h3>
        </div>
        <Input
          placeholder="Search by email, name, or phone…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-[#E8DED8]"
        />
        {searching && (
          <div className="flex items-center justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-[#8B7355]" /></div>
        )}
        {!searching && searchTerm.trim().length >= 2 && customerResults.length === 0 && (
          <p className="text-center text-[#8B7355] text-sm py-4">No customers found</p>
        )}
        {customerResults.length > 0 && (
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
            {customerResults.map(c => (
              <button
                key={c.id}
                onClick={() => pickCustomer(c)}
                className="w-full flex items-center justify-between bg-[#F5EBE8] hover:bg-[#EBE5DF] rounded-xl p-3 text-left transition-colors"
              >
                <div>
                  <p className="font-medium text-[#5C4A3A] text-sm">{c.display_name || c.user_email}</p>
                  <p className="text-xs text-[#8B7355]">{c.user_email}</p>
                  {c.phone && <p className="text-xs text-[#8B7355] flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tierColor[c.tier] || "bg-gray-100 text-gray-700"}`}>
                  {c.tier || "Bronze"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customer profile */}
      {selectedCustomer && (
        <div className="bg-white rounded-2xl border border-[#E8DED8] p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#5C4A3A]">{selectedCustomer.display_name || selectedCustomer.user_email}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tierColor[selectedCustomer.tier] || "bg-gray-100 text-gray-700"}`}>
                  {selectedCustomer.tier || "Bronze"}
                </span>
              </div>
              <p className="text-sm text-[#8B7355]">{selectedCustomer.user_email}</p>
              {selectedCustomer.phone && (
                <p className="text-sm text-[#8B7355] flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" />{selectedCustomer.phone}</p>
              )}
            </div>
            <button onClick={() => setSelectedCustomer(null)} className="p-1.5 hover:bg-[#F5EBE8] rounded-full">
              <X className="h-4 w-4 text-[#8B7355]" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-[#F5EBE8] rounded-xl p-3 text-center">
              <Star className="h-4 w-4 text-[#8B7355] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#5C4A3A]">{selectedCustomer.points_balance || 0}</p>
              <p className="text-xs text-[#8B7355]">Points</p>
            </div>
            <div className="bg-[#F5EBE8] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-[#5C4A3A]">{selectedCustomer.total_spend_pkr || 0}</p>
              <p className="text-xs text-[#8B7355]">PKR Spent</p>
            </div>
            <div className="bg-[#F5EBE8] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-[#5C4A3A]">{selectedCustomer.cups_redeemed || 0}</p>
              <p className="text-xs text-[#8B7355]">Cups Redeemed</p>
            </div>
          </div>

          {/* Saved Recipes */}
          <div className="border-t border-[#E8DED8] pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#8B7355]" />
                <h4 className="font-semibold text-[#5C4A3A]">Saved Recipes</h4>
              </div>
              <Button size="sm" onClick={startNewRecipe} className="bg-[#8B7355] hover:bg-[#6B5744] rounded-xl">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            {loadingRecipes ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[#8B7355]" /></div>
            ) : editingRecipe === "new" || editingRecipe ? (
              <RecipeForm
                products={products}
                form={recipeForm}
                setForm={setRecipeForm}
                onSave={saveRecipe}
                onCancel={() => setEditingRecipe(null)}
                saving={saving}
                isEdit={editingRecipe !== "new"}
              />
            ) : recipes.length === 0 ? (
              <p className="text-center text-[#8B7355] text-sm py-6">No saved recipes yet</p>
            ) : (
              <div className="space-y-2">
                {recipes.map(r => (
                  <div key={r.id} className="bg-[#F5EBE8] rounded-xl p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#5C4A3A] text-sm">{r.product_name}</p>
                      {r.customization_notes && (
                        <p className="text-xs text-[#8B7355] mt-0.5">{r.customization_notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEditRecipe(r)} className="p-1.5 hover:bg-white rounded-lg">
                        <Pencil className="h-3.5 w-3.5 text-[#8B7355]" />
                      </button>
                      <button onClick={() => deleteRecipe(r)} className="p-1.5 hover:bg-white rounded-lg">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeForm({ products, form, setForm, onSave, onCancel, saving, isEdit }) {
  return (
    <div className="bg-[#F5EBE8] rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-[#5C4A3A]">{isEdit ? "Edit Recipe" : "New Saved Recipe"}</p>
      <Select
        value={form.product_id}
        onValueChange={(v) => setForm({ ...form, product_id: v })}
      >
        <SelectTrigger className="bg-white border-[#E8DED8]">
          <SelectValue placeholder="Select product…" />
        </SelectTrigger>
        <SelectContent>
          {products.map(p => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <textarea
        placeholder="Customization notes (e.g. 'always oat milk, extra hot, no sugar')"
        value={form.customization_notes}
        onChange={(e) => setForm({ ...form, customization_notes: e.target.value })}
        rows={2}
        className="w-full border border-[#E8DED8] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 resize-none"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving} className="bg-[#8B7355] hover:bg-[#6B5744] rounded-xl">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="rounded-xl border-[#E8DED8]">
          Cancel
        </Button>
      </div>
    </div>
  );
}