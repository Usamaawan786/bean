import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import ImageUploadField from "./ImageUploadField";

// Branding tab — logo, brand name, menu title and tagline (MenuSettings singleton).
export default function BrandingSection() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["menuSettings"],
    queryFn: async () => {
      const list = await base44.entities.MenuSettings.list();
      if (list.length) return list[0];
      return await base44.entities.MenuSettings.create({ menu_title: "Menu", brand_name: "Bean" });
    },
  });

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await base44.entities.MenuSettings.update(form.id, {
        logo_url: form.logo_url || "",
        menu_title: form.menu_title || "Menu",
        tagline: form.tagline || "",
        brand_name: form.brand_name || "Bean",
      });
      qc.invalidateQueries(["menuSettings"]);
      toast.success("Branding saved");
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !form) return <div className="text-sm text-[#8B7355]">Loading…</div>;

  return (
    <div className="space-y-5">
      <ImageUploadField
        label="Logo image (shown in header instead of text when set)"
        value={form.logo_url || ""}
        onChange={(v) => set("logo_url", v)}
        size="lg"
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#7D5A46] mb-1">Brand name (text fallback)</label>
          <input
            value={form.brand_name || ""}
            onChange={(e) => set("brand_name", e.target.value)}
            className="w-full rounded-lg border border-[#D9C3B0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#7D5A46] mb-1">Menu title</label>
          <input
            value={form.menu_title || ""}
            onChange={(e) => set("menu_title", e.target.value)}
            className="w-full rounded-lg border border-[#D9C3B0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-[#7D5A46] mb-1">Tagline (under title)</label>
        <input
          value={form.tagline || ""}
          onChange={(e) => set("tagline", e.target.value)}
          placeholder="e.g. Brewed with love in Islamabad"
          className="w-full rounded-lg border border-[#D9C3B0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8B7355] text-white text-sm hover:bg-[#7D5A46] disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving…" : "Save branding"}
      </button>
    </div>
  );
}