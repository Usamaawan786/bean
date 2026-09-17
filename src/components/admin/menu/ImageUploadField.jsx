import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload } from "lucide-react";

// Reusable image upload field — uploads to public storage and returns the URL.
export default function ImageUploadField({ value, onChange, label, size = "md", className = "" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      onChange(file_url);
    } catch (e) {
      console.error("Upload failed", e);
      alert("Image upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const dim = size === "lg" ? "w-24 h-24" : "w-16 h-16";

  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-[#7D5A46] mb-1">{label}</label>}
      <div className="flex items-center gap-3">
        <div className={`${dim} rounded-lg overflow-hidden border border-[#D9C3B0] bg-[#F5EBE8] flex items-center justify-center shrink-0`}>
          {uploading ? (
            <Loader2 className="h-5 w-5 text-[#8B7355] animate-spin" />
          ) : value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <Upload className="h-5 w-5 text-[#C9B8A6]" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#8B7355] text-white hover:bg-[#7D5A46] disabled:opacity-50 transition-colors"
          >
            {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs text-red-600 hover:underline text-left"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}