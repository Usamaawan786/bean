import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Image as ImageIcon, Loader2, CheckCircle2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Bulk image uploader — lets an admin quickly attach a photo to each
// menu item in one screen, without opening the full edit dialog.
export default function BulkImageUploader({ entityName = "StoreProduct" }) {
  const [uploadingId, setUploadingId] = useState(null);
  const [missingOnly, setMissingOnly] = useState(true);
  const queryClient = useQueryClient();

  const qKey = entityName === "StoreProduct" ? "store-products-management" : "products-management";
  const adminQKey = entityName === "StoreProduct" ? "store-products-admin" : "products-admin";

  const { data: products = [], isLoading } = useQuery({
    queryKey: [qKey],
    queryFn: () => base44.entities[entityName].list()
  });

  const filtered = missingOnly ? products.filter(p => !p.image_url) : products;

  const handleUpload = async (e, product) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingId(product.id);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities[entityName].update(product.id, { image_url: file_url });
      queryClient.invalidateQueries({ queryKey: [qKey] });
      queryClient.invalidateQueries({ queryKey: [adminQKey] });
      toast.success(`Image set for ${product.name}`);
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploadingId(null);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-[#8B7355]">
          {missingOnly
            ? `${filtered.length} item${filtered.length === 1 ? "" : "s"} missing an image.`
            : `Showing all ${filtered.length} items.`}
        </p>
        <Button
          size="sm"
          variant={missingOnly ? "default" : "outline"}
          onClick={() => setMissingOnly(!missingOnly)}
          className="rounded-xl"
        >
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          {missingOnly ? "Missing only" : "Show all"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-[#8B7355]">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading items...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-[#8B7355]">All items have images.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-[#E8DED8] p-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#F5EBE8] flex items-center justify-center shrink-0">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-[#C9B8A6]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[#5C4A3A] text-sm truncate">{p.name}</h4>
                  <p className="text-xs text-[#8B7355] truncate">{p.category}</p>
                </div>
              </div>
              <label className={`mt-3 flex items-center justify-center gap-2 w-full text-white rounded-xl py-2 text-sm cursor-pointer transition-colors ${
                uploadingId === p.id ? "bg-[#6B5744]" : "bg-[#8B7355] hover:bg-[#6B5744]"
              }`}>
                {uploadingId === p.id ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="h-4 w-4" /> {p.image_url ? "Replace image" : "Upload image"}</>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingId === p.id}
                  onChange={(e) => handleUpload(e, p)}
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}