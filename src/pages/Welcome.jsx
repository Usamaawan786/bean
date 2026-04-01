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
        if (isStaff) navigate("/StaffPortal", { replace: true });
        else navigate(ref ? `/Home?ref=${ref}` : "/Home", { replace: true });
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
        <Link to={createPageUrl("Community")}>
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
        </Link>

        <Link to={createPageUrl("Rewards")}>
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
        </Link>

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