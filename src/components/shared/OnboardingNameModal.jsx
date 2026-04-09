import { useState } from "react";
import { motion } from "framer-motion";
import { Coffee, User, Phone } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function OnboardingNameModal({ onComplete, userEmail }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isValidPhone = (p) => /^[\+]?[0-9\s\-]{10,15}$/.test(p.trim());

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Please enter a valid phone number (e.g. 03001234567)");
      return;
    }
    setError("");
    setSaving(true);
    await base44.auth.updateMe({ display_name: name.trim(), phone: phone.trim() });
    // Send user data to GHL via webhook
    try {
      await base44.functions.invoke('sendUserToGHL', {
        name: name.trim(),
        email: userEmail || "",
        phone: phone.trim()
      });
    } catch (e) {
      console.error('GHL webhook error:', e);
    }
    onComplete(name.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center px-0 sm:px-5"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-white rounded-t-3xl sm:rounded-3xl p-7 w-full sm:max-w-sm shadow-2xl"
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center shadow-lg">
            <Coffee className="h-7 w-7 text-white" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-[#5C4A3A] text-center mb-1">
          Welcome to Bean! ☕
        </h2>
        <p className="text-sm text-[#8B7355] text-center mb-6">
          Two quick things so we can make this personal
        </p>

        {/* Name field */}
        <div className="mb-3">
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1.5 block">
            What do your friends call you?
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name — so we're not just strangers"
              autoFocus
              style={{ fontSize: '16px' }}
              className="w-full border border-[#E8DED8] rounded-2xl pl-10 pr-4 py-3 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 focus:border-[#8B7355] bg-[#FDFAF8]"
            />
          </div>
        </div>

        {/* Phone field */}
        <div className="mb-1">
          <label className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1.5 block">
            Where should we send your rewards?
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Your number — exclusive offers await"
              style={{ fontSize: '16px' }}
              className="w-full border border-[#E8DED8] rounded-2xl pl-10 pr-4 py-3 text-sm text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 focus:border-[#8B7355] bg-[#FDFAF8]"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mt-1.5 px-1">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="w-full mt-5 bg-gradient-to-r from-[#8B7355] to-[#5C4A3A] text-white py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50 transition-opacity active:scale-95"
        >
          {saving ? "Saving..." : "Let's go →"}
        </button>

        <p className="text-center text-xs text-[#C9B8A6] mt-3">
          🔒 Just for your loyalty profile — no spam, ever.
        </p>
      </motion.div>
    </div>
  );
}