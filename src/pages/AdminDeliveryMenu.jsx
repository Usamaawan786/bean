import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Upload, Loader2, Package, Settings, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

export default function AdminDeliveryMenu() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("products");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["deliveryProductsAdmin"],
    queryFn: () => base44.entities.DeliveryProduct.list("sort_order", 200),
  });

  const { data: settings } = useQuery({
    queryKey: ["deliverySettings"],
    queryFn: async () => (await base44.entities.DeliverySettings.list())[0],
  });

  const toggleAvailability = async (product) => {
    try {
      await base44.entities.DeliveryProduct.update(product.id, { is_available: !product.is_available });
      queryClient.invalidateQueries({ queryKey: ["deliveryProductsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryProducts"] });
    } catch (e) { toast.error("Failed to toggle"); }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    try {
      await base44.entities.DeliveryProduct.delete(product.id);
      queryClient.invalidateQueries({ queryKey: ["deliveryProductsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryProducts"] });
      toast.success("Product deleted");
    } catch (e) { toast.error("Failed to delete"); }
  };

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white px-5 py-6">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Delivery Menu</h1>
        </div>
        <p className="text-white/70 text-sm mt-1">Manage products, prices & delivery settings</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("products")} className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab === "products" ? "bg-[#5C4A3A] text-white" : "bg-white text-[#8B7355] border border-[#E8DED8]"}`}>
            Products ({products.length})
          </button>
          <button onClick={() => setTab("settings")} className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab === "settings" ? "bg-[#5C4A3A] text-white" : "bg-white text-[#8B7355] border border-[#E8DED8]"}`}>
            <Settings className="h-4 w-4 inline mr-1" /> Settings
          </button>
        </div>

        {tab === "products" && (
          <>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="w-full bg-[#5C4A3A] text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 mb-4"
            >
              <Plus className="h-5 w-5" /> Add Product
            </button>

            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" /></div>
            ) : (
              <div className="space-y-2">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-xl border border-[#E8DED8] p-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F5EBE8] flex-shrink-0">
                      {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">☕</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[#5C4A3A]">{product.name}</div>
                      <div className="text-xs text-[#8B7355]">{product.category} · Rs. {product.price}</div>
                    </div>
                    <button onClick={() => toggleAvailability(product)} className="p-1">
                      {product.is_available ? <ToggleRight className="h-6 w-6 text-green-600" /> : <ToggleLeft className="h-6 w-6 text-gray-400" />}
                    </button>
                    <button onClick={() => { setEditing(product); setShowForm(true); }} className="p-1.5 bg-[#F5F1ED] rounded-lg">
                      <Pencil className="h-4 w-4 text-[#5C4A3A]" />
                    </button>
                    <button onClick={() => handleDelete(product)} className="p-1.5 bg-red-50 rounded-lg">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
                {products.length === 0 && <p className="text-center text-sm text-[#8B7355] py-8">No products yet. Add your first one!</p>}
              </div>
            )}

            {showForm && (
              <ProductForm
                product={editing}
                onClose={() => setShowForm(false)}
                onSaved={() => {
                  setShowForm(false);
                  queryClient.invalidateQueries({ queryKey: ["deliveryProductsAdmin"] });
                  queryClient.invalidateQueries({ queryKey: ["deliveryProducts"] });
                }}
              />
            )}
          </>
        )}

        {tab === "settings" && <SettingsPanel settings={settings} onSaved={() => queryClient.invalidateQueries({ queryKey: ["deliverySettings"] })} />}
      </div>
    </div>
  );
}

function ProductForm({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    description: product?.description || "",
    image_url: product?.image_url || "",
    price: product?.price || "",
    category: product?.category || "",
    sort_order: product?.sort_order || 0,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, image_url: file_url });
      toast.success("Image uploaded");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || !form.category.trim()) {
      toast.error("Name, price and category are required");
      return;
    }
    setSaving(true);
    try {
      const data = { ...form, price: Number(form.price), sort_order: Number(form.sort_order) };
      if (product) {
        await base44.entities.DeliveryProduct.update(product.id, data);
        toast.success("Product updated");
      } else {
        await base44.entities.DeliveryProduct.create({ ...data, is_available: true });
        toast.success("Product created");
      }
      onSaved();
    } catch (e) {
      toast.error("Save failed: " + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-[#5C4A3A]">{product ? "Edit Product" : "New Product"}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-[#8B7355]" /></button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-xl bg-[#F5EBE8] overflow-hidden flex items-center justify-center">
              {form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" /> : <Upload className="h-6 w-6 text-[#8B7355]" />}
            </div>
            <div className="flex-1">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="text-sm bg-[#F5F1ED] text-[#5C4A3A] px-3 py-2 rounded-lg font-medium">
                {uploading ? "Uploading..." : "Upload Image"}
              </button>
            </div>
          </div>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" className="w-full border border-[#D4C4B0] rounded-lg p-2 text-sm" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} className="w-full border border-[#D4C4B0] rounded-lg p-2 text-sm" />
          <div className="flex gap-2">
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price (PKR)" type="number" className="flex-1 border border-[#D4C4B0] rounded-lg p-2 text-sm" />
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" className="flex-1 border border-[#D4C4B0] rounded-lg p-2 text-sm" />
          </div>
          <input value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} placeholder="Sort order" type="number" className="w-full border border-[#D4C4B0] rounded-lg p-2 text-sm" />
          <button onClick={handleSave} disabled={saving} className="w-full bg-[#5C4A3A] text-white py-3 rounded-xl font-medium disabled:opacity-50">
            {saving ? "Saving..." : product ? "Update Product" : "Create Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ settings, onSaved }) {
  const [form, setForm] = useState({
    flat_delivery_fee: settings?.flat_delivery_fee ?? 150,
    min_order_amount: settings?.min_order_amount ?? 0,
    estimated_prep_minutes: settings?.estimated_prep_minutes ?? 15,
    is_delivery_open: settings?.is_delivery_open ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        flat_delivery_fee: Number(form.flat_delivery_fee),
        min_order_amount: Number(form.min_order_amount),
        estimated_prep_minutes: Number(form.estimated_prep_minutes),
        is_delivery_open: form.is_delivery_open,
      };
      if (settings?.id) {
        await base44.entities.DeliverySettings.update(settings.id, data);
      } else {
        await base44.entities.DeliverySettings.create(data);
      }
      toast.success("Settings saved");
      onSaved();
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8DED8] p-5 space-y-4">
      <h2 className="font-bold text-[#5C4A3A]">Delivery Settings</h2>
      <div>
        <label className="text-xs text-[#8B7355] mb-1 block">Flat Delivery Fee (PKR)</label>
        <input type="number" value={form.flat_delivery_fee} onChange={(e) => setForm({ ...form, flat_delivery_fee: e.target.value })} className="w-full border border-[#D4C4B0] rounded-lg p-2 text-sm" />
      </div>
      <div>
        <label className="text-xs text-[#8B7355] mb-1 block">Minimum Order Amount (PKR)</label>
        <input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} className="w-full border border-[#D4C4B0] rounded-lg p-2 text-sm" />
      </div>
      <div>
        <label className="text-xs text-[#8B7355] mb-1 block">Estimated Prep Time (minutes)</label>
        <input type="number" value={form.estimated_prep_minutes} onChange={(e) => setForm({ ...form, estimated_prep_minutes: e.target.value })} className="w-full border border-[#D4C4B0] rounded-lg p-2 text-sm" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#5C4A3A] font-medium">Delivery Open</span>
        <button onClick={() => setForm({ ...form, is_delivery_open: !form.is_delivery_open })} className="p-1">
          {form.is_delivery_open ? <ToggleRight className="h-8 w-8 text-green-600" /> : <ToggleLeft className="h-8 w-8 text-gray-400" />}
        </button>
      </div>
      <button onClick={handleSave} disabled={saving} className="w-full bg-[#5C4A3A] text-white py-3 rounded-xl font-medium disabled:opacity-50">
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}