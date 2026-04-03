import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const COLOR_SCHEMES = {
  amber: "bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900",
  purple: "bg-gradient-to-r from-purple-500 to-indigo-500 text-white",
  gold: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white",
  slate: "bg-gradient-to-r from-slate-400 to-slate-600 text-white",
  rose: "bg-gradient-to-r from-rose-400 to-pink-500 text-white",
  blue: "bg-gradient-to-r from-blue-400 to-cyan-500 text-white",
  green: "bg-gradient-to-r from-green-400 to-emerald-500 text-white",
  teal: "bg-gradient-to-r from-teal-400 to-cyan-500 text-white",
  orange: "bg-gradient-to-r from-orange-400 to-red-400 text-white",
  brown: "bg-gradient-to-r from-amber-700 to-yellow-800 text-white",
};

const AUTO_TYPES = [
  { value: "none", label: "Manual only" },
  { value: "points", label: "Total Points ≥" },
  { value: "tier", label: "Tier equals" },
  { value: "referrals", label: "Referrals ≥" },
  { value: "posts", label: "Approved Posts ≥" },
];

const TIER_OPTIONS = ["Bronze", "Silver", "Gold", "Platinum"];

export default function BadgeDefinitionModal({ badge, onSave, onClose }) {
  const [form, setForm] = useState({
    key: "",
    emoji: "🏅",
    label: "",
    title: "",
    color_scheme: "amber",
    description: "",
    how_to_get: "",
    auto_criteria_type: "none",
    auto_criteria_value: "",
    is_active: true,
    ...badge,
  });

  const isNew = !badge?.id;
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl my-4"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-[#5C4A3A]">{isNew ? "Create Badge" : "Edit Badge"}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F5EBE8] text-[#8B7355]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-2 mb-5 p-3 bg-[#F9F6F3] rounded-2xl">
          <span className="text-sm text-[#8B7355]">Preview:</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${COLOR_SCHEMES[form.color_scheme] || COLOR_SCHEMES.amber}`}>
            <span>{form.emoji}</span>
            <span>{form.label || "Label"}</span>
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#5C4A3A] text-xs">Badge Key *</Label>
              <Input value={form.key} onChange={e => set("key", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                placeholder="e.g. super_fan" disabled={!isNew && form.is_builtin}
                className="mt-1 text-sm border-[#E8DED8]" />
            </div>
            <div>
              <Label className="text-[#5C4A3A] text-xs">Emoji *</Label>
              <Input value={form.emoji} onChange={e => set("emoji", e.target.value)}
                placeholder="🏅" maxLength={4} className="mt-1 text-sm border-[#E8DED8]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#5C4A3A] text-xs">Short Label *</Label>
              <Input value={form.label} onChange={e => set("label", e.target.value)}
                placeholder="e.g. FM" className="mt-1 text-sm border-[#E8DED8]" />
            </div>
            <div>
              <Label className="text-[#5C4A3A] text-xs">Full Title</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)}
                placeholder="Founding Member" className="mt-1 text-sm border-[#E8DED8]" />
            </div>
          </div>

          <div>
            <Label className="text-[#5C4A3A] text-xs">Color Scheme</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(COLOR_SCHEMES).map(([k, cls]) => (
                <button key={k} onClick={() => set("color_scheme", k)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${cls} ${form.color_scheme === k ? "border-[#5C4A3A]" : "border-transparent"}`}>
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[#5C4A3A] text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="What this badge means..." className="mt-1 text-sm border-[#E8DED8] h-20" />
          </div>

          <div>
            <Label className="text-[#5C4A3A] text-xs">How to Earn</Label>
            <Textarea value={form.how_to_get} onChange={e => set("how_to_get", e.target.value)}
              placeholder="Requirements to earn this badge..." className="mt-1 text-sm border-[#E8DED8] h-16" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#5C4A3A] text-xs">Auto-Assignment</Label>
              <select value={form.auto_criteria_type} onChange={e => set("auto_criteria_type", e.target.value)}
                className="mt-1 w-full border border-[#E8DED8] rounded-lg px-3 py-2 text-sm text-[#5C4A3A]">
                {AUTO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {form.auto_criteria_type !== "none" && (
              <div>
                <Label className="text-[#5C4A3A] text-xs">Threshold</Label>
                {form.auto_criteria_type === "tier" ? (
                  <select value={form.auto_criteria_value} onChange={e => set("auto_criteria_value", e.target.value)}
                    className="mt-1 w-full border border-[#E8DED8] rounded-lg px-3 py-2 text-sm text-[#5C4A3A]">
                    {TIER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : (
                  <Input value={form.auto_criteria_value} onChange={e => set("auto_criteria_value", e.target.value)}
                    placeholder="e.g. 500" type="number" className="mt-1 text-sm border-[#E8DED8]" />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl border-[#E8DED8]">Cancel</Button>
          <Button onClick={() => onSave(form)} className="flex-1 rounded-xl bg-[#8B7355] hover:bg-[#6B5744]">
            {isNew ? "Create Badge" : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}