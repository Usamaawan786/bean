import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wand2, Check, Undo2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const STYLE_PROMPT =
  "Professional food photograph of the EXACT dish shown in the first image (same food, same ingredients, same portion, nothing added or removed), " +
  "restyled to match the second reference image: shot from directly above, served on a plain ceramic plate or bowl like the reference, " +
  "pale lilac-grey seamless studio background, soft even daylight, gentle shadow, no table, no cafe scene, no people, no hands, no text, no logo. " +
  "Square 1:1 framing with the dish centred.";

const newItemPrompt = (p) =>
  `Professional food photograph of: ${p.name}${p.description ? ` (${p.description})` : ""}. ` +
  "Match the reference image's style exactly: shot from directly above, served on a plain ceramic plate or bowl (drinks in a clear cup or glass on a simple saucer or coaster), " +
  "pale lilac-grey seamless studio background, soft even daylight, gentle shadow, no table, no cafe scene, no people, no hands, no text, no logo. " +
  "Square 1:1 framing with the item centred. Make the food look appetising and realistic.";

const isAI = (p) => (p.image_url || "").includes("generated_image");
const BACKUP_KEY = "bean_image_style_backup";
const readBackup = () => { try { return JSON.parse(localStorage.getItem(BACKUP_KEY) || "{}"); } catch { return {}; } };
const writeBackup = (b) => { try { localStorage.setItem(BACKUP_KEY, JSON.stringify(b)); } catch { /* ignore */ } };

export default function AdminImageStyle() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [results, setResults] = useState({}); // id -> { url, busy, error, applied }
  const [backup, setBackup] = useState(readBackup());
  const [refId, setRefId] = useState("");
  const [runningAll, setRunningAll] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (!u || !["admin", "super_admin", "manager"].includes(u.role)) { window.location.replace("/StaffPortal"); return; }
      setUser(u);
    }).catch(() => window.location.replace("/StaffPortal"));
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["style-products"],
    queryFn: () => base44.entities.StoreProduct.list("name", 300),
    enabled: !!user,
  });
  const { data: deliveryProducts = [] } = useQuery({
    queryKey: ["style-delivery-products"],
    queryFn: () => base44.entities.DeliveryProduct.list("name", 300),
    enabled: !!user,
  });

  const reference = useMemo(() => {
    return products.find((p) => p.id === refId) || products.find((p) => /nutella waffles/i.test(p.name)) || null;
  }, [products, refId]);

  const patch = (id, v) => setResults((r) => ({ ...r, [id]: { ...(r[id] || {}), ...v } }));

  const generate = async (p) => {
    if (!reference?.image_url) { toast.error("Pick a reference photo first"); return; }
    patch(p.id, { busy: true, error: null });
    try {
      const res = await base44.integrations.Core.GenerateImage({
        prompt: STYLE_PROMPT,
        existing_image_urls: [backup[p.id] || p.image_url, reference.image_url],
      });
      if (!res?.url) throw new Error("No image returned");
      patch(p.id, { busy: false, url: res.url, applied: false });
    } catch (e) {
      patch(p.id, { busy: false, error: e?.message || "Generation failed" });
    }
  };

  const setImageEverywhere = async (p, url) => {
    await base44.entities.StoreProduct.update(p.id, { image_url: url });
    const dp = deliveryProducts.find((d) => (d.name || "").trim().toLowerCase() === (p.name || "").trim().toLowerCase());
    if (dp) await base44.entities.DeliveryProduct.update(dp.id, { image_url: url });
  };

  const apply = async (p) => {
    const r = results[p.id];
    if (!r?.url) return;
    patch(p.id, { busy: true });
    try {
      const b = readBackup();
      if (!b[p.id]) b[p.id] = p.image_url; // keep the ORIGINAL so it can always be restored
      setBackup(b); writeBackup(b);
      await setImageEverywhere(p, r.url);
      patch(p.id, { busy: false, applied: true });
      queryClient.invalidateQueries({ queryKey: ["style-products"] });
      queryClient.invalidateQueries({ queryKey: ["style-delivery-products"] });
      toast.success(`${p.name}: new photo is live on Menu, Delivery and POS`);
    } catch (e) {
      patch(p.id, { busy: false, error: e?.message || "Could not save" });
    }
  };

  const revert = async (p) => {
    const orig = backup[p.id];
    if (!orig) return;
    patch(p.id, { busy: true });
    try {
      await setImageEverywhere(p, orig);
      const b = readBackup(); delete b[p.id];
      setBackup(b); writeBackup(b);
      patch(p.id, { busy: false, applied: false, url: null });
      queryClient.invalidateQueries({ queryKey: ["style-products"] });
      queryClient.invalidateQueries({ queryKey: ["style-delivery-products"] });
      toast.success(`${p.name}: original photo restored`);
    } catch (e) {
      patch(p.id, { busy: false, error: e?.message || "Could not restore" });
    }
  };

  const missing = products.filter((p) => !p.image_url && p.is_available !== false);
  const [newRunning, setNewRunning] = useState(false);
  const generateNew = async (p) => {
    if (!reference?.image_url) { toast.error("Pick a reference photo first"); return; }
    patch(p.id, { busy: true, error: null });
    try {
      const res = await base44.integrations.Core.GenerateImage({ prompt: newItemPrompt(p), existing_image_urls: [reference.image_url] });
      if (!res?.url) throw new Error("No image returned");
      await setImageEverywhere(p, res.url); // no previous photo, so nothing to lose — publish straight away
      patch(p.id, { busy: false, url: res.url, applied: true });
    } catch (e) {
      patch(p.id, { busy: false, error: e?.message || "Generation failed" });
    }
  };
  const generateAllNew = async () => {
    setNewRunning(true);
    const todo = missing.filter((p) => !results[p.id]?.applied);
    for (let i = 0; i < todo.length; i += 2) {
      await Promise.all(todo.slice(i, i + 2).map(generateNew));
    }
    setNewRunning(false);
    queryClient.invalidateQueries({ queryKey: ["style-products"] });
    queryClient.invalidateQueries({ queryKey: ["style-delivery-products"] });
    toast.success("New-item photos are live on Menu, Delivery and POS");
  };

  const targets = products.filter((p) => isAI(p) || backup[p.id]);
  const generateAll = async () => {
    setRunningAll(true);
    const todo = targets.filter((p) => isAI(p) && !results[p.id]?.url);
    for (let i = 0; i < todo.length; i += 2) {
      await Promise.all(todo.slice(i, i + 2).map(generate));
    }
    setRunningAll(false);
    toast.success("Done generating — review each photo, then tap Use this photo");
  };

  const readyToApply = targets.filter((p) => results[p.id]?.url && !results[p.id]?.applied && !results[p.id]?.busy);
  const applyAll = async () => {
    if (!readyToApply.length) { toast.error("No generated photos to publish yet"); return; }
    setApplyingAll(true);
    for (const p of readyToApply) {
      await apply(p);
    }
    setApplyingAll(false);
  };

  if (!user || isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F5F1ED]"><Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#F5F1ED] pb-20">
      <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white px-5 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2"><ImageIcon className="h-6 w-6" /><h1 className="text-2xl font-bold">Menu Photo Style Matcher</h1></div>
          <p className="text-white/70 text-sm mt-1">Re-shoots AI photos in the same look as your reference photo (same background, angle and plating). Nothing changes until you tap “Use this photo”, and you can always restore the original.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 flex flex-wrap items-center gap-4">
          {reference?.image_url && <img src={reference.image_url} alt="" className="w-20 h-20 rounded-xl object-cover border border-[#E8DED8]" />}
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide">Reference style</div>
            <select
              value={reference?.id || ""}
              onChange={(e) => setRefId(e.target.value)}
              className="mt-1 w-full border border-[#D4C4B0] rounded-lg p-2 text-sm text-[#5C4A3A] bg-white"
            >
              {products.filter((p) => !isAI(p)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <Button onClick={generateAll} disabled={runningAll || !reference} className="bg-[#5C4A3A] hover:bg-[#6B5744]">
            {runningAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            Generate all ({targets.filter((p) => isAI(p)).length})
          </Button>
          <Button onClick={applyAll} disabled={applyingAll || !readyToApply.length} className="bg-green-600 hover:bg-green-700">
            {applyingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Use all photos ({readyToApply.length})
          </Button>
        </div>

        {missing.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8DED8] p-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                <div className="font-semibold text-[#5C4A3A]">New menu items without a photo ({missing.length})</div>
                <div className="text-xs text-[#8B7355]">Creates a photo in your reference style and publishes it straight away (these items have no photo to replace).</div>
              </div>
              <Button onClick={generateAllNew} disabled={newRunning || !reference} className="bg-[#5C4A3A] hover:bg-[#6B5744]">
                {newRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                Create all photos
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              {missing.map((p) => {
                const r = results[p.id] || {};
                return (
                  <div key={p.id} className="text-center">
                    <div className="aspect-square rounded-xl border border-dashed border-[#D4C4B0] bg-[#F5F1ED] flex items-center justify-center overflow-hidden">
                      {r.busy ? <Loader2 className="h-5 w-5 animate-spin text-[#8B7355]" /> : r.url ? <img src={r.url} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] text-[#8B7355]">No photo</span>}
                    </div>
                    <div className="text-[11px] text-[#5C4A3A] mt-1 leading-tight">{p.name}</div>
                    {r.error && <div className="text-[10px] text-red-600">{r.error}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {targets.map((p) => {
            const r = results[p.id] || {};
            const original = backup[p.id] || p.image_url;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-[#E8DED8] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm text-[#5C4A3A]">{p.name}</div>
                  {backup[p.id] && <span className="text-[11px] bg-green-100 text-green-700 rounded-full px-2 py-0.5">Updated</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] uppercase text-[#8B7355] mb-1">{backup[p.id] ? "Original" : "Current"}</div>
                    <img src={original} alt="" className="w-full aspect-square object-cover rounded-xl border border-[#E8DED8]" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#8B7355] mb-1">{backup[p.id] && !r.url ? "Live now" : "New"}</div>
                    <div className="w-full aspect-square rounded-xl border border-dashed border-[#D4C4B0] bg-[#F5F1ED] flex items-center justify-center overflow-hidden">
                      {r.busy ? <Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" />
                        : r.url ? <img src={r.url} alt="" className="w-full h-full object-cover" />
                        : backup[p.id] ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xs text-[#8B7355]">Not generated</span>}
                    </div>
                  </div>
                </div>
                {r.error && <div className="text-xs text-red-600 mt-2">{r.error}</div>}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" disabled={r.busy || !reference} onClick={() => generate(p)} className="flex-1 border-[#8B7355] text-[#8B7355]">
                    <Wand2 className="h-3.5 w-3.5 mr-1" /> {r.url ? "Try again" : "Generate"}
                  </Button>
                  {r.url && !r.applied && (
                    <Button size="sm" disabled={r.busy} onClick={() => apply(p)} className="flex-1 bg-green-600 hover:bg-green-700">
                      <Check className="h-3.5 w-3.5 mr-1" /> Use this photo
                    </Button>
                  )}
                  {backup[p.id] && (
                    <Button size="sm" variant="outline" disabled={r.busy} onClick={() => revert(p)} className="border-red-200 text-red-600">
                      <Undo2 className="h-3.5 w-3.5 mr-1" /> Restore
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {targets.length === 0 && <div className="text-center text-sm text-[#8B7355] py-12">No AI-generated photos found. Every item already uses an uploaded photo.</div>}
      </div>
    </div>
  );
}