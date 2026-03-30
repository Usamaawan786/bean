import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coffee } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function OnboardingNameModal({ onComplete }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isValidPhone = (p) => /^[\+]?[0-9\s\-]{10,15}$/.test(p.trim());

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (!isValidPhone(phone)) {
      setError("Please enter a valid phone number (e.g. 03001234567)");
      return;
    }
    setError("");
    setSaving(true);
    await base44.auth.updateMe({ display_name: name.trim(), phone: phone.trim() });
    onComplete(name.trim());
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl"
        >
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center">
              <Coffee className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#5C4A3A] text-center mb-2">Welcome to Bean! ☕</h2>
          <p className="text-sm text-[#8B7355] text-center mb-6">Tell us a bit about yourself</p>

          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your first name"
            autoFocus
            className="w-full border border-[#E8DED8] rounded-2xl px-4 py-3 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 focus:border-[#8B7355] mb-3"
          />

          <input
            type="tel"
            value={phone}
            onChange={e => { setPhone(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Phone number (e.g. 03001234567)"
            className="w-full border border-[#E8DED8] rounded-2xl px-4 py-3 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 focus:border-[#8B7355] mb-1"
          />
          {error && <p className="text-xs text-red-500 mb-3 px-1">{error}</p>}
          {!error && <div className="mb-3" />}

          <button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="w-full bg-gradient-to-r from-[#8B7355] to-[#5C4A3A] text-white py-3.5 rounded-2xl font-bold text-base disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saving..." : "Let's go →"}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}