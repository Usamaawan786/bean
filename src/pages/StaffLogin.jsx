import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Coffee, Shield, Users, BarChart3, ShoppingCart, Loader2, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function StaffLogin() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (isAuth) => {
      if (isAuth) {
        const u = await base44.auth.me();
        const isStaff = ["cashier", "manager", "admin", "super_admin"].includes(u?.role);
        if (isStaff) {
          window.location.href = "/StaffPortal";
        } else {
          // Regular customer who accidentally landed here
          window.location.href = "/Home";
        }
      } else {
        setChecking(false);
      }
    });
  }, []);

  const handleLogin = () => {
    base44.auth.redirectToLogin("/StaffPortal?staff=1");
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <Coffee className="h-5 w-5 text-amber-400" />
        <span className="font-bold text-amber-400">Bean Coffee</span>
        <span className="text-gray-600 text-sm">·</span>
        <span className="text-gray-400 text-sm font-medium">Staff Portal</span>
        <div className="ml-auto flex items-center gap-2 bg-gray-800 text-gray-400 text-xs px-3 py-1.5 rounded-full">
          <Lock className="h-3 w-3" />
          Staff Access Only
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="w-20 h-20 bg-amber-400/10 border-2 border-amber-400/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Shield className="h-10 w-10 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Staff Login</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              This portal is exclusively for Bean Coffee team members.<br />
              Sign in with your invited email address.
            </p>
          </motion.div>

          {/* Feature preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="grid grid-cols-3 gap-3 mb-8"
          >
            {[
              { icon: ShoppingCart, label: "POS Terminal", color: "text-amber-400" },
              { icon: BarChart3, label: "Analytics", color: "text-blue-400" },
              { icon: Users, label: "Management", color: "text-purple-400" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                <Icon className={`h-6 w-6 mx-auto mb-2 ${color}`} />
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            onClick={handleLogin}
            className="w-full bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold py-4 rounded-2xl text-base transition-all hover:scale-[1.02] shadow-lg shadow-amber-400/20"
          >
            Sign in to Staff Portal →
          </motion.button>

          <p className="text-center text-xs text-gray-600 mt-6">
            Not a staff member?{" "}
            <a href="/" className="text-gray-400 hover:text-white underline">
              Go to Bean Coffee App
            </a>
          </p>
        </div>
      </div>

      <div className="text-center py-4 text-xs text-gray-700">
        © 2026 Bean Coffee · Staff Portal · Authorised Personnel Only
      </div>
    </div>
  );
}