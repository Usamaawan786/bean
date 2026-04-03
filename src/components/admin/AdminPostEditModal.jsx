import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function AdminPostEditModal({ post, onSave, onClose }) {
  const [content, setContent] = useState(post.content || "");
  const [adminLabel, setAdminLabel] = useState(post.admin_label || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(post.id, { content, admin_label: adminLabel || null });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#5C4A3A]">Edit Post</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F5EBE8] text-[#8B7355]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#5C4A3A]">Post Content</label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="mt-1 border-[#E8DED8] h-40 text-sm"
              placeholder="Post content..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#5C4A3A]">Admin Label (shown if pinned)</label>
            <input
              value={adminLabel}
              onChange={e => setAdminLabel(e.target.value)}
              placeholder="e.g. Announcement"
              className="mt-1 w-full border border-[#E8DED8] rounded-lg px-3 py-2 text-sm text-[#5C4A3A]"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl border-[#E8DED8]">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !content.trim()}
            className="flex-1 rounded-xl bg-[#8B7355] hover:bg-[#6B5744]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}