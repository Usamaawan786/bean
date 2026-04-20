import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Coffee, Gift, Users, ShoppingBag, Shield, FileText, ChevronRight, LogIn, UserPlus, Sparkles } from "lucide-react";
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

  const scrollToDownload = () => {
    document.getElementById("download-section")?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const staffParam = params.get("staff");

    // If URL has ?staff=1, redirect immediately to /staff regardless of auth state
    if (staffParam === "1") {
      navigate("/staff", { replace: true });
      return;
    }

    base44.auth.isAuthenticated().then(async isAuth => {
      if (isAuth) {
        const u = await base44.auth.me();
        const isStaff = ["cashier", "manager", "admin", "super_admin"].includes(u?.role);
        if (isStaff) {
          navigate("/StaffPortal", { replace: true });
        } else {
          navigate(ref ? `/Home?ref=${ref}` : "/Home", { replace: true });
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
            onClick={scrollToDownload}
            className="mt-8 bg-white text-[#5C4A3A] px-8 py-4 rounded-full font-bold text-base shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Join the Club →
          </motion.button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-12 pb-12 space-y-4">

        {/* ── ACTION CARDS ── */}
        <div onClick={scrollToDownload} className="cursor-pointer">
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

        <div onClick={scrollToDownload} className="cursor-pointer">
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
        <motion.div id="download-section" {...fadeUp(0.18)} className="relative overflow-hidden rounded-3xl shadow-xl">
          {/* Premium dark background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1208] via-[#2d1f0e] to-[#3d2b12]" />
          {/* Subtle ambient glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4C4B0]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl" />

          <div className="relative p-7">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center shadow-lg">
                <Coffee className="h-6 w-6 text-[#1a1208]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B7355] mb-0.5">Bean Pakistan</p>
                <h3 className="font-bold text-white text-xl leading-tight">Get the App</h3>
              </div>
            </div>

            <p className="text-[#C9B8A6] text-sm mb-6 leading-relaxed">
              Earn rewards, catch flash drops & connect with Islamabad's coffee community — all in one place.
            </p>

            <div className="flex flex-col gap-3">
              {/* iOS */}
              <a
                href="https://apps.apple.com/pk/app/bean-pakistan/id6758788396"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-white hover:bg-[#f0ede8] text-[#1a1208] px-5 py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg group"
              >
                {/* Apple logo */}
                <svg viewBox="0 0 814 1000" className="h-8 w-8 fill-[#1a1208] shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49 192.5-49 30.5-.1 104.5 5.6 162.1 64.4zm-170.4-195.6c43.2-51.4 73.1-122.6 73.1-193.8 0-9.9-.6-19.9-2.5-28.6-69.3 2.5-151.6 46.4-200.9 103.9-38.3 43.8-74.6 114.9-74.6 187.1 0 10.5 1.9 21.1 2.5 24.3 4.4.6 11.6 1.9 18.8 1.9 62.2.1 139.9-42 183.6-94.8z"/>
                </svg>
                <div className="flex-1">
                  <p className="text-[10px] text-[#5C4A3A] font-medium leading-none mb-0.5">Download on the</p>
                  <p className="font-bold text-lg leading-tight">App Store</p>
                </div>
                <div className="text-[#8B7355] text-xs font-semibold bg-[#F5EBE8] px-2.5 py-1 rounded-full">iOS</div>
              </a>

              {/* Android */}
              <a
                href="https://play.google.com/store/apps/details?id=com.base6976cd7fe6e4b20fcb30cf61.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-5 py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] group"
              >
                {/* Google Play logo */}
                <svg viewBox="0 0 48 48" className="h-8 w-8 shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <linearGradient id="gp1" x1="5.16" y1="23.98" x2="42.83" y2="23.98" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#32a071"/><stop offset=".07" stopColor="#2da771"/><stop offset=".48" stopColor="#15cf74"/><stop offset=".8" stopColor="#06e775"/><stop offset="1" stopColor="#00f076"/>
                  </linearGradient>
                  <linearGradient id="gp2" x1="23.81" y1="25.63" x2="41.29" y2="8.14" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#ffd800"/><stop offset="1" stopColor="#ff8a00"/>
                  </linearGradient>
                  <linearGradient id="gp3" x1="12.58" y1="26.77" x2="28.09" y2="42.28" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#ff3a44"/><stop offset="1" stopColor="#c31162"/>
                  </linearGradient>
                  <linearGradient id="gp4" x1="4.23" y1="8.68" x2="14.34" y2="18.79" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#32a071"/><stop offset=".07" stopColor="#2da771"/><stop offset=".48" stopColor="#15cf74"/><stop offset=".8" stopColor="#06e775"/><stop offset="1" stopColor="#00f076"/>
                  </linearGradient>
                  <path fill="url(#gp1)" d="M5.16 5.47C4.6 6.05 4.27 6.97 4.27 8.2v31.6c0 1.23.33 2.15.9 2.73l.14.13L24.1 23.98v-.43L5.3 5.33l-.14.14z"/>
                  <path fill="url(#gp2)" d="M30.38 30.26l-6.28-6.28v-.44l6.28-6.28.14.08 7.44 4.23c2.13 1.21 2.13 3.18 0 4.39l-7.44 4.22-.14.08z"/>
                  <path fill="url(#gp3)" d="M30.52 30.18L24.1 23.77 5.16 42.72c.7.74 1.86.83 3.16.09l22.2-12.63"/>
                  <path fill="url(#gp4)" d="M30.52 17.36L8.32 4.73C7.02 3.99 5.86 4.08 5.16 4.82L24.1 23.77l6.42-6.41z"/>
                </svg>
                <div className="flex-1">
                  <p className="text-[10px] text-white/50 font-medium leading-none mb-0.5">Get it on</p>
                  <p className="font-bold text-lg leading-tight">Google Play</p>
                </div>
                <div className="text-white/60 text-xs font-semibold bg-white/10 px-2.5 py-1 rounded-full">Android</div>
              </a>
            </div>

            {/* Rating row */}
            <div className="flex items-center justify-center gap-1.5 mt-5">
              {[1,2,3,4,5].map(i => (
                <svg key={i} className="h-4 w-4 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              ))}
              <span className="text-[#8B7355] text-xs ml-1 font-medium">5.0 · Islamabad's #1 Coffee App</span>
            </div>
          </div>
        </motion.div>

        {/* ── SIGN IN / SIGN UP ── */}
        <motion.div {...fadeUp(0.22)} className="relative overflow-hidden rounded-3xl shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#3d2b12] via-[#4a3520] to-[#5C4A3A]" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4C4B0]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl" />

          <div className="relative p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center shadow-lg">
                <Coffee className="h-6 w-6 text-[#1a1208]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B7355] mb-0.5">Already have the app?</p>
                <h3 className="font-bold text-white text-xl leading-tight">Welcome back ☕</h3>
              </div>
            </div>

            <p className="text-[#C9B8A6] text-sm mb-6 leading-relaxed">
              Sign in to access your rewards, points balance & community.
            </p>

            <button
              onClick={() => base44.auth.redirectToLogin("/Home")}
              className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-[#f0ede8] text-[#1a1208] font-bold px-5 py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg text-base mb-3"
            >
              <LogIn className="h-5 w-5" />
              Sign In to Bean
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-white/40 text-xs font-medium">or</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            <button
              onClick={() => { window.location.href = "/SignIn?mode=signup"; }}
              className="w-full flex items-center justify-center gap-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-5 py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
            >
              <UserPlus className="h-4 w-4" />
              New here? Create a free account
            </button>
          </div>
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