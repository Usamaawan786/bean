import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Coffee, Star, Gift, Users, ArrowRight, Zap } from "lucide-react";
import { motion } from "framer-motion";

const PERKS = [
  { icon: Star, text: "Earn points on every purchase" },
  { icon: Gift, text: "Redeem free drinks & rewards" },
  { icon: Zap, text: "Exclusive flash drops & offers" },
  { icon: Users, text: "Join a community of coffee lovers" },
];

export default function SignIn() {
  const [loading, setLoading] = useState(true);
  const urlParams = new URLSearchParams(window.location.search);
  const [mode, setMode] = useState(urlParams.get("mode") === "signup" ? "signup" : "signin");

  useEffect(() => {
    base44.auth.isAuthenticated().then((auth) => {
      if (auth) {
        window.location.href = createPageUrl("Home");
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleAuth = () => {
    base44.auth.redirectToLogin(createPageUrl("Home"));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#8B7355] to-[#5C4A3A] flex items-center justify-center">
        <Coffee className="h-10 w-10 text-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF] flex flex-col">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-6 left-8 text-5xl">☕</div>
          <div className="absolute top-16 right-12 text-4xl">⭐</div>
          <div className="absolute bottom-6 left-1/3 text-4xl">🫘</div>
          <div className="absolute bottom-12 right-8 text-3xl">✨</div>
        </div>
        <div className="relative max-w-md mx-auto px-6 pt-14 pb-12 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-white/15 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-5 border border-white/20"
          >
            <Coffee className="h-10 w-10 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold mb-2"
          >
            {mode === "signup" ? "Join Bean Today" : "Welcome Back"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[#E8DED8] text-sm"
          >
            {mode === "signup"
              ? "Start earning rewards on every sip"
              : "Sign in to access your rewards & points"}
          </motion.p>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 max-w-md mx-auto w-full px-5 -mt-6 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl border border-[#E8DED8] shadow-xl p-6 mb-5"
        >
          {/* Tab switcher */}
          <div className="flex bg-[#F5EBE8] rounded-2xl p-1 mb-6">
            {["signin", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === m
                    ? "bg-white text-[#5C4A3A] shadow-sm"
                    : "text-[#8B7355]"
                }`}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {mode === "signup" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-5 space-y-3"
            >
              {PERKS.map(({ icon: Icon, text }, i) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#F5EBE8] flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-[#8B7355]" />
                  </div>
                  <span className="text-sm text-[#5C4A3A]">{text}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          <p className="text-xs text-[#8B7355] text-center mb-4">
            {mode === "signin"
              ? "You'll be securely signed in via email"
              : "Create your account — it only takes a moment"}
          </p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAuth}
            className="w-full bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:from-[#6B5744] hover:to-[#5C4A3A] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Coffee className="h-4 w-4" />
            {mode === "signin" ? "Sign In with Email" : "Create My Account"}
            <ArrowRight className="h-4 w-4" />
          </motion.button>

          <p className="text-center text-xs text-[#C9B8A6] mt-4">
            By continuing, you agree to our{" "}
            <span className="text-[#8B7355] underline cursor-pointer">Terms</span> &{" "}
            <span className="text-[#8B7355] underline cursor-pointer">Privacy Policy</span>
          </p>
        </motion.div>

        {/* Switch mode hint */}
        <p className="text-center text-sm text-[#8B7355]">
          {mode === "signin" ? (
            <>
              New to Bean?{" "}
              <button onClick={() => setMode("signup")} className="font-bold text-[#5C4A3A] underline">
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="font-bold text-[#5C4A3A] underline">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}