import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Coffee, Gift, Users, ShoppingBag, Shield, FileText, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5 }
});

export default function Welcome() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    base44.auth.isAuthenticated().then(async isAuth => {
      if (isAuth) {
        const u = await base44.auth.me();
        const isStaff = ["cashier", "manager", "admin", "super_admin"].includes(u?.role);
        if (isStaff) {
          navigate("/StaffPortal", { replace: true });
        } else {
          // Check if this looks like a staff invite (came from /staff or no ref)
          // Always route through StaffPortal so newly-invited staff see the right screen
          const fromStaff = document.referrer.includes("/staff") || params.get("staff") === "1";
          if (fromStaff) navigate("/StaffPortal", { replace: true });
          else navigate(ref ? `/Home?ref=${ref}` : "/Home", { replace: true });
        }
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F1ED] overflow-y-auto">

      {/* ── HERO ── */}
      <div className="relative bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white overflow-hidden min-h-[45vh] flex items-center">
        {/* ambient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div animate={{ x: [0, 80, 0], y: [0, 40, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-10 -left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <motion.div animate={{ x: [0, -60, 0], y: [0, -30, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-10 -right-10 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-lg mx-auto px-6 py-16 text-left w-full">
          {/* Small logo */}
          <motion.div {...fadeUp(0)} className="flex items-center gap-2 mb-8">
            <Coffee className="h-5 w-5 text-white" />
            <span className="text-sm font-medium">Bean</span>
          </motion.div>

          <motion.h1 {...fadeUp(0.1)} className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Welcome to<br />
            <span className="text-[#F4D35E]">Bean</span> ☕
          </motion.h1>

          <motion.p {...fadeUp(0.2)} className="text-[#E8DED8] text-base leading-relaxed mb-8 max-w-sm">
            Islamabad's First Coffee Lover's Club
          </motion.p>

          <motion.div {...fadeUp(0.3)} className="flex flex-wrap gap-2">
            <span className="bg-white/10 backdrop-blur text-white text-sm px-4 py-2 rounded-full border border-white/20">Rewards

            </span>
            <span className="bg-white/10 backdrop-blur text-white text-sm px-4 py-2 rounded-full border border-white/20">Community

            </span>
            <span className="bg-white/10 backdrop-blur text-white text-sm px-4 py-2 rounded-full border border-white/20">Premium Coffee

            </span>
          </motion.div>

          <motion.button 
            {...fadeUp(0.4)} 
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              const ref = params.get("ref");
              // Redirect to StaffPortal after login — it handles routing for both staff and regular users
              base44.auth.redirectToLogin(ref ? `/Home?ref=${ref}` : "/StaffPortal");
            }}
            className="mt-8 bg-white text-[#5C4A3A] px-8 py-4 rounded-full font-bold text-base shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Join the Club →
          </motion.button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-12 pb-24 space-y-4">

        {/* ── ACTION CARDS ── */}
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="cursor-pointer">
          <motion.div {...fadeUp(0.1)} className="bg-white p-5 rounded-2xl shadow-sm border border-[#E8DED8] flex items-center gap-4 hover:shadow-md transition-shadow">

            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B7355] to-[#6B5744] flex items-center justify-center shrink-0">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#5C4A3A]">Community</h3>
              <p className="text-xs text-[#8B7355]">See what coffee lovers are sharing</p>
            </div>
            <ChevronRight className="h-5 w-5 text-[#C9B8A6]" />
          </motion.div>
        </div>

        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="cursor-pointer">
          <motion.div {...fadeUp(0.15)} className="bg-white my-2 p-5 rounded-2xl shadow-sm border border-[#E8DED8] flex items-center gap-4 hover:shadow-md transition-shadow">

            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center shrink-0">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#5C4A3A]">Explore Rewards</h3>
              <p className="text-xs text-[#8B7355]">Redeem points for free coffee & treats</p>
            </div>
            <ChevronRight className="h-5 w-5 text-[#C9B8A6]" />
          </motion.div>
        </div>

        {/* ── DOWNLOAD THE APP ── */}
        <motion.div {...fadeUp(0.18)} className="bg-white rounded-2xl border border-[#E8DED8] p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C9B8A6] mb-1">Available on</p>
          <h3 className="font-bold text-[#5C4A3A] text-lg mb-4">Download the App</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* iOS */}
            <a
              href="https://apps.apple.com/pk/app/bean-pakistan/id6758788396"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center gap-3 bg-[#5C4A3A] hover:bg-[#4a3a2c] text-white px-5 py-3.5 rounded-xl transition-colors group"
            >
              <svg viewBox="0 0 814 1000" className="h-7 w-7 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49 192.5-49 30.5-.1 104.5 5.6 162.1 64.4zm-170.4-195.6c43.2-51.4 73.1-122.6 73.1-193.8 0-9.9-.6-19.9-2.5-28.6-69.3 2.5-151.6 46.4-200.9 103.9-38.3 43.8-74.6 114.9-74.6 187.1 0 10.5 1.9 21.1 2.5 24.3 4.4.6 11.6 1.9 18.8 1.9 62.2.1 139.9-42 183.6-94.8z"/>
              </svg>
              <div>
                <p className="text-[10px] text-white/70 leading-none mb-0.5">Download on the</p>
                <p className="font-bold text-base leading-tight">App Store</p>
              </div>
            </a>
            {/* Android */}
            <a
              href="https://play.google.com/store/apps/details?id=com.base6976cd7fe6e4b20fcb30cf61.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center gap-3 bg-[#5C4A3A] hover:bg-[#4a3a2c] text-white px-5 py-3.5 rounded-xl transition-colors group"
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

        {/* ── SIGN IN CTA ── */}
        <motion.div 
          {...fadeUp(0.2)} 
          onClick={() => {
              const params = new URLSearchParams(window.location.search);
              const ref = params.get("ref");
              base44.auth.redirectToLogin(ref ? `/Home?ref=${ref}` : "/StaffPortal");
            }}
          className="bg-gradient-to-r text-white my-4 px-6 py-6 text-center rounded-2xl from-[#8B7355] to-[#6B5744] shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
        >
          <Coffee className="h-6 w-6 mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-1">Sign in to unlock rewards</h3>
          <p className="text-sm text-[#E8DED8]">Earn points, redeem free coffee & more</p>
        </motion.div>

        {/* ── LEGAL ── */}
        <div className="flex justify-center gap-6 pt-2">
          <button onClick={() => {setShowPrivacy(!showPrivacy);setShowTerms(false);}}
          className="flex items-center gap-1.5 text-sm text-[#8B7355] hover:text-[#5C4A3A] transition-colors font-medium">
            <Shield className="h-4 w-4" /> Privacy Policy
          </button>
          <button onClick={() => {setShowTerms(!showTerms);setShowPrivacy(false);}}
          className="flex items-center gap-1.5 text-sm text-[#8B7355] hover:text-[#5C4A3A] transition-colors font-medium">
            <FileText className="h-4 w-4" /> Terms of Use
          </button>
        </div>

        {showPrivacy &&
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
        }

        {showTerms &&
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
        }

        <p className="text-center text-xs text-[#C9B8A6] pb-2">© 2026 Bean Coffee · Pakistan · All rights reserved</p>
      </div>
    </div>);

}