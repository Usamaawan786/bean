import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Coffee, Gift, Users, ShoppingBag, Star, Zap, Shield, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5 }
});

export default function Welcome() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F1ED] overflow-y-auto">

      {/* ── HERO ── */}
      <div className="relative bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white overflow-hidden">
        {/* ambient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div animate={{ x: [0,80,0], y: [0,40,0] }} transition={{ duration: 20, repeat: Infinity, ease:"linear" }}
            className="absolute -top-10 -left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <motion.div animate={{ x: [0,-60,0], y: [0,-30,0] }} transition={{ duration: 16, repeat: Infinity, ease:"linear" }}
            className="absolute -bottom-10 -right-10 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-lg mx-auto px-6 pt-16 pb-24 text-center">
          {/* Logo mark */}
          <motion.div {...fadeUp(0)} className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/15 backdrop-blur border border-white/20 mb-6 shadow-2xl">
            <Coffee className="h-12 w-12 text-white" />
          </motion.div>

          <motion.p {...fadeUp(0.1)} className="text-[#D4C4B0] text-sm font-semibold tracking-widest uppercase mb-2">
            Bean | Brews · Bites · Bar
          </motion.p>

          <motion.h1 {...fadeUp(0.2)} className="text-4xl font-bold leading-tight mb-4">
            Your daily ritual,<br />elevated ☕
          </motion.h1>

          <motion.p {...fadeUp(0.3)} className="text-[#E8DED8] text-base leading-relaxed mb-10 max-w-sm mx-auto">
            Premium specialty coffee, exclusive rewards, and a community built around every sip. Welcome to Bean.
          </motion.p>

          <motion.div {...fadeUp(0.4)} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={createPageUrl("Home")}
              className="bg-white text-[#8B7355] font-bold px-8 py-3.5 rounded-2xl hover:bg-[#E8DED8] transition-colors text-base shadow-lg">
              Enter the App
            </Link>
            <Link to={createPageUrl("Shop")}
              className="bg-white/15 backdrop-blur text-white font-semibold px-8 py-3.5 rounded-2xl hover:bg-white/25 transition-colors text-base border border-white/30">
              Browse Shop
            </Link>
          </motion.div>
        </div>
      </div>

      {/* floating logo overlap */}
      <div className="flex justify-center -mt-10 mb-2 relative z-10">
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          className="bg-white rounded-full p-3 shadow-2xl border-4 border-[#F5F1ED]">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center">
            <Coffee className="h-7 w-7 text-white" />
          </div>
        </motion.div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6 pb-16 space-y-5">

        {/* ── COFFEE LOVER'S CLUB ── */}
        <motion.div {...fadeUp(0.1)} className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] rounded-3xl p-8 text-white text-center shadow-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur mb-4">
            <Coffee className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Coffee Lover's Club</h2>
          <p className="text-[#E8DED8] leading-relaxed text-sm mb-6">
            Join Karachi's most rewarding coffee community. Earn points with every sip, unlock exclusive perks, and connect with fellow coffee enthusiasts.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">500+</div>
              <div className="text-xs text-[#D4C4B0] mt-1">Members</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">4.9★</div>
              <div className="text-xs text-[#D4C4B0] mt-1">Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">10K+</div>
              <div className="text-xs text-[#D4C4B0] mt-1">Rewards</div>
            </div>
          </div>
        </motion.div>

        {/* ── FEATURES ── */}
        <motion.div {...fadeUp(0.15)} className="grid grid-cols-2 gap-4">
          {[
            { icon: Gift, title: "Loyalty Rewards", desc: "Earn points on every purchase. Redeem for free drinks & perks.", color: "from-[#F5EBE8] to-[#EDE3DF]" },
            { icon: ShoppingBag, title: "Online Shop", desc: "Coffee beans, matcha, equipment & gift sets — delivered to you.", color: "from-[#EDE3DF] to-[#E0D5CE]" },
            { icon: Users, title: "Community", desc: "Share brews, discover blends, and connect with coffee lovers.", color: "from-[#E8DED8] to-[#DDD0C8]" },
            { icon: Zap, title: "Flash Drops", desc: "Surprise limited-time offers and exclusive drops for members.", color: "from-[#F5EBE8] to-[#EDE3DF]" },
          ].map((f, i) => (
            <motion.div key={f.title} {...fadeUp(0.2 + i * 0.05)}
              className="bg-white rounded-3xl border border-[#E8DED8] p-5 shadow-sm">
              <div className={`rounded-2xl bg-gradient-to-br ${f.color} p-3 w-fit mb-3`}>
                <f.icon className="h-5 w-5 text-[#8B7355]" />
              </div>
              <h3 className="font-bold text-[#5C4A3A] text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-[#8B7355] leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── TIERS ── */}
        <motion.div {...fadeUp(0.3)} className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#5C4A3A] mb-4 text-center">Loyalty Tiers</h2>
          <div className="space-y-3">
            {[
              { tier: "Bronze", desc: "Start earning from day one", color: "bg-amber-100 text-amber-700", range: "0 – 499 pts" },
              { tier: "Silver", desc: "Unlock bonus point events", color: "bg-slate-100 text-slate-600", range: "500 – 1499 pts" },
              { tier: "Gold", desc: "Priority perks & surprise gifts", color: "bg-yellow-100 text-yellow-700", range: "1500 – 2999 pts" },
              { tier: "Platinum", desc: "VIP access to every drop", color: "bg-purple-100 text-purple-700", range: "3000+ pts" },
            ].map(t => (
              <div key={t.tier} className="flex items-center gap-3">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${t.color} w-20 text-center shrink-0`}>{t.tier}</span>
                <span className="text-xs text-[#8B7355] flex-1">{t.desc}</span>
                <span className="text-xs text-[#C9B8A6] shrink-0">{t.range}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── SOCIAL PROOF ── */}
        <motion.div {...fadeUp(0.35)} className="bg-gradient-to-r from-[#8B7355] to-[#6B5744] rounded-3xl p-7 text-white text-center">
          <div className="flex justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-amber-300 text-amber-300" />)}
          </div>
          <p className="font-bold text-xl mb-1">Loved by coffee lovers</p>
          <p className="text-[#E8DED8] text-sm">Join our growing Bean community earning rewards every single day.</p>
        </motion.div>

        {/* ── LEGAL ── */}
        <div className="flex justify-center gap-6 pt-2">
          <button onClick={() => { setShowPrivacy(!showPrivacy); setShowTerms(false); }}
            className="flex items-center gap-1.5 text-sm text-[#8B7355] hover:text-[#5C4A3A] transition-colors font-medium">
            <Shield className="h-4 w-4" /> Privacy Policy
          </button>
          <button onClick={() => { setShowTerms(!showTerms); setShowPrivacy(false); }}
            className="flex items-center gap-1.5 text-sm text-[#8B7355] hover:text-[#5C4A3A] transition-colors font-medium">
            <FileText className="h-4 w-4" /> Terms of Use
          </button>
        </div>

        {showPrivacy && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-[#E8DED8] p-6 text-sm text-[#5C4A3A] space-y-3">
            <h3 className="font-bold text-lg flex items-center gap-2"><Shield className="h-5 w-5 text-[#8B7355]" /> Privacy Policy</h3>
            <p><strong>Last updated:</strong> March 2026</p>
            <p>Bean Coffee ("we", "us", or "our") is committed to protecting your privacy.</p>
            <p><strong>Information We Collect:</strong> We collect your name, email address, and usage data when you register. We may also collect purchase history to power our loyalty rewards program.</p>
            <p><strong>How We Use It:</strong> To manage your account, provide rewards, personalise your experience, and send relevant Bean updates.</p>
            <p><strong>Data Sharing:</strong> We do not sell or share your personal data with third parties, except as required by law or to operate core services (e.g. email delivery).</p>
            <p><strong>Security:</strong> We implement appropriate technical measures to protect your information against unauthorised access.</p>
            <p><strong>Your Rights:</strong> You may request access to, correction of, or deletion of your personal data by contacting us at support@beancoffee.co.</p>
          </motion.div>
        )}

        {showTerms && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-[#E8DED8] p-6 text-sm text-[#5C4A3A] space-y-3">
            <h3 className="font-bold text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-[#8B7355]" /> Terms of Use</h3>
            <p><strong>Last updated:</strong> March 2026</p>
            <p>By using the Bean app, you agree to these Terms of Use.</p>
            <p><strong>Eligibility:</strong> You must be at least 13 years old to use Bean.</p>
            <p><strong>Account Responsibility:</strong> You are responsible for maintaining the confidentiality of your credentials and all activity under your account.</p>
            <p><strong>Loyalty Points:</strong> Points are earned based on purchases and in-app activities. Points have no cash value and cannot be transferred. Bean reserves the right to modify or cancel the rewards program at any time.</p>
            <p><strong>Prohibited Conduct:</strong> You agree not to misuse the app, fraudulently earn points, or disrupt the service or other users.</p>
            <p><strong>Changes to Terms:</strong> We reserve the right to update these terms at any time. Continued use constitutes acceptance.</p>
            <p><strong>Contact:</strong> support@beancoffee.co</p>
          </motion.div>
        )}

        <p className="text-center text-xs text-[#C9B8A6] pb-2">© 2026 Bean Coffee · Karachi · All rights reserved.</p>
      </div>
    </div>
  );
}