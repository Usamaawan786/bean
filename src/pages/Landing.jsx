import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Coffee, Gift, Users, ShoppingBag, Star, Zap, ChevronRight, Shield, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export default function Landing() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF] overflow-y-auto pb-10">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <motion.div
            animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute top-10 left-10 w-64 h-64 bg-[#D4C4B0]/40 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -60, 0], y: [0, -30, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-5 right-10 w-80 h-80 bg-[#C9B8A6]/30 rounded-full blur-3xl"
          />
        </div>

        <div className="relative max-w-lg mx-auto px-6 pt-14 pb-20 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur mb-6"
          >
            <Coffee className="h-10 w-10 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold mb-3"
          >
            Welcome to Bean ☕
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[#E8DED8] text-lg mb-8"
          >
            Premium coffee, rewards & community — all in one place.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link
              to={createPageUrl("Home")}
              className="bg-white text-[#8B7355] font-bold px-8 py-3 rounded-2xl hover:bg-[#E8DED8] transition-colors text-base"
            >
              Get Started
            </Link>
            <Link
              to={createPageUrl("Shop")}
              className="bg-white/20 backdrop-blur text-white font-semibold px-8 py-3 rounded-2xl hover:bg-white/30 transition-colors text-base border border-white/30"
            >
              Browse Shop
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-lg mx-auto px-5 pt-10 space-y-4">
        <h2 className="text-xl font-bold text-[#5C4A3A] text-center mb-6">Everything you love about Bean</h2>

        {[
          { icon: Gift, title: "Loyalty Rewards", desc: "Earn points on every purchase and redeem them for free coffee and exclusive perks.", color: "from-[#F5EBE8] to-[#EDE3DF]" },
          { icon: ShoppingBag, title: "Online Shop", desc: "Browse premium coffee beans, matcha, equipment, and gift sets delivered to your door.", color: "from-[#EDE3DF] to-[#E0D5CE]" },
          { icon: Users, title: "Community", desc: "Connect with coffee lovers, share your favourite brews, and discover new blends.", color: "from-[#E8DED8] to-[#DDD0C8]" },
          { icon: Zap, title: "Flash Drops", desc: "Exclusive limited-time offers and surprise drops just for Bean members.", color: "from-[#F5EBE8] to-[#EDE3DF]" },
        ].map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i + 0.3 }}
            className="bg-white rounded-3xl border border-[#E8DED8] p-5 shadow-sm flex items-center gap-4"
          >
            <div className={`rounded-2xl bg-gradient-to-br ${f.color} p-4 shrink-0`}>
              <f.icon className="h-6 w-6 text-[#8B7355]" />
            </div>
            <div>
              <h3 className="font-bold text-[#5C4A3A]">{f.title}</h3>
              <p className="text-sm text-[#8B7355] mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          </motion.div>
        ))}

        {/* Star rating / social proof */}
        <div className="bg-gradient-to-r from-[#8B7355] to-[#6B5744] rounded-3xl p-6 text-white text-center">
          <div className="flex justify-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-amber-300 text-amber-300" />)}
          </div>
          <p className="font-semibold text-lg">Loved by coffee enthusiasts</p>
          <p className="text-[#E8DED8] text-sm mt-1">Join thousands of Bean members earning rewards every day</p>
        </div>

        {/* Legal links */}
        <div className="flex justify-center gap-6 pt-4">
          <button
            onClick={() => setShowPrivacy(!showPrivacy)}
            className="flex items-center gap-1.5 text-sm text-[#8B7355] hover:text-[#5C4A3A] transition-colors"
          >
            <Shield className="h-4 w-4" /> Privacy Policy
          </button>
          <button
            onClick={() => setShowTerms(!showTerms)}
            className="flex items-center gap-1.5 text-sm text-[#8B7355] hover:text-[#5C4A3A] transition-colors"
          >
            <FileText className="h-4 w-4" /> Terms of Use
          </button>
        </div>

        {/* Privacy Policy */}
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-[#E8DED8] p-6 text-sm text-[#5C4A3A] space-y-3"
          >
            <h3 className="font-bold text-lg flex items-center gap-2"><Shield className="h-5 w-5 text-[#8B7355]" /> Privacy Policy</h3>
            <p><strong>Last updated:</strong> March 2026</p>
            <p>Bean ("we", "us", or "our") is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information.</p>
            <p><strong>Information We Collect:</strong> We collect your name, email address, and usage data when you register and use the Bean app. We may also collect purchase history to power our loyalty rewards program.</p>
            <p><strong>How We Use Your Information:</strong> Your information is used to manage your account, provide loyalty rewards, personalise your experience, and send you relevant updates about Bean.</p>
            <p><strong>Data Sharing:</strong> We do not sell or share your personal data with third parties, except as required by law or to operate our core services (e.g., email delivery).</p>
            <p><strong>Data Security:</strong> We implement appropriate technical measures to protect your personal information against unauthorised access or disclosure.</p>
            <p><strong>Your Rights:</strong> You may request access to, correction of, or deletion of your personal data at any time by contacting us at support@beancoffee.co.</p>
            <p><strong>Contact:</strong> For privacy-related questions, email us at support@beancoffee.co.</p>
          </motion.div>
        )}

        {/* Terms of Use */}
        {showTerms && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-[#E8DED8] p-6 text-sm text-[#5C4A3A] space-y-3"
          >
            <h3 className="font-bold text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-[#8B7355]" /> Terms of Use</h3>
            <p><strong>Last updated:</strong> March 2026</p>
            <p>By using the Bean app, you agree to these Terms of Use. Please read them carefully.</p>
            <p><strong>Eligibility:</strong> You must be at least 13 years old to use the Bean app. By using our app, you confirm that you meet this requirement.</p>
            <p><strong>Account Responsibility:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>
            <p><strong>Loyalty Points:</strong> Points are earned based on purchases and activities within the Bean app. Points have no cash value and cannot be transferred. Bean reserves the right to modify or cancel the rewards program at any time.</p>
            <p><strong>Prohibited Conduct:</strong> You agree not to misuse the app, attempt to fraudulently earn points, or engage in any conduct that disrupts the service or harms other users.</p>
            <p><strong>Intellectual Property:</strong> All content, branding, and features within the Bean app are owned by Bean and may not be copied or reproduced without permission.</p>
            <p><strong>Changes to Terms:</strong> We reserve the right to update these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms.</p>
            <p><strong>Contact:</strong> For questions about these terms, email us at support@beancoffee.co.</p>
          </motion.div>
        )}

        <p className="text-center text-xs text-[#C9B8A6] pb-4">© 2026 Bean Coffee. All rights reserved.</p>
      </div>
    </div>
  );
}