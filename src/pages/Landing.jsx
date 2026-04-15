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

        {/* Download the App */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C9B8A6] mb-1">Available on</p>
          <h3 className="font-bold text-[#5C4A3A] text-lg mb-4">Download the App</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://apps.apple.com/pk/app/bean-pakistan/id6758788396"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center gap-3 bg-[#5C4A3A] hover:bg-[#4a3a2c] text-white px-5 py-3.5 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 814 1000" className="h-7 w-7 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49 192.5-49 30.5-.1 104.5 5.6 162.1 64.4zm-170.4-195.6c43.2-51.4 73.1-122.6 73.1-193.8 0-9.9-.6-19.9-2.5-28.6-69.3 2.5-151.6 46.4-200.9 103.9-38.3 43.8-74.6 114.9-74.6 187.1 0 10.5 1.9 21.1 2.5 24.3 4.4.6 11.6 1.9 18.8 1.9 62.2.1 139.9-42 183.6-94.8z"/>
              </svg>
              <div>
                <p className="text-[10px] text-white/70 leading-none mb-0.5">Download on the</p>
                <p className="font-bold text-base leading-tight">App Store</p>
              </div>
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.base6976cd7fe6e4b20fcb30cf61.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center gap-3 bg-[#5C4A3A] hover:bg-[#4a3a2c] text-white px-5 py-3.5 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 48 48" className="h-7 w-7 shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path fill="#fff" d="M7.2 43.7c.4.3 1 .3 1.5 0L27 27 21 21 7.2 43.7z"/>
                <path fill="#fff" d="M35.3 19.5 29.6 16l-8.6 8 8.6 8 5.7-3.5c1.6-1 1.6-3.1 0-4z"/>
                <path fill="#ffffffcc" d="M8.7 4.3C8.2 4 7.6 4 7.2 4.3L21 21l6-6L8.7 4.3z"/>
                <path fill="#ffffffaa" d="M7 5.5v37L21 27 7 5.5z"/>
              </svg>
              <div>
                <p className="text-[10px] text-white/70 leading-none mb-0.5">Get it on</p>
                <p className="font-bold text-base leading-tight">Google Play</p>
              </div>
            </a>
          </div>
        </motion.div>

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