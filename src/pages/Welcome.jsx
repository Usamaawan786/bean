import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Coffee, Gift, Users, ShoppingBag, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useEffect, useState } from "react";

export default function Welcome() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#6B5744] via-[#8B7355] to-[#5C4A3A] overflow-y-auto pb-24">
      <div className="max-w-lg mx-auto px-5 pt-12 pb-8 space-y-6">

        {/* Logo & Branding */}
        <div className="flex items-center gap-2 mb-8">
          <Coffee className="h-6 w-6 text-[#D4C4B0]" />
          <span className="text-white font-bold text-lg">Bean</span>
        </div>

        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-white leading-tight mb-4">
            Welcome to<br />
            <span className="text-[#D4C4B0]">Bean</span>☕
          </h1>
          <p className="text-[#E8DED8] text-lg">
            Premium coffee, earn rewards, join the community
          </p>

          {/* Value Props */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['Premium Beans', 'Earn Points', 'Exclusive Rewards'].map((badge) => (
              <span 
                key={badge}
                className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm"
              >
                {badge}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Main Action Cards */}
        <div className="space-y-3">
          <Link to={createPageUrl("Shop")}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#F5F1ED] rounded-3xl p-5 flex items-center gap-4 group hover:bg-white transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#8B7355] flex items-center justify-center shrink-0">
                <ShoppingBag className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-[#5C4A3A] font-bold text-base">Browse the Shop</h3>
                <p className="text-[#8B7355] text-sm">Coffee beans, equipment & more</p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#8B7355] group-hover:translate-x-1 transition-transform" />
            </motion.div>
          </Link>

          <Link to={createPageUrl("Community")}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#F5F1ED] rounded-3xl p-5 flex items-center gap-4 group hover:bg-white transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#8B7355] flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-[#5C4A3A] font-bold text-base">Community</h3>
                <p className="text-[#8B7355] text-sm">See what coffee lovers are sharing</p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#8B7355] group-hover:translate-x-1 transition-transform" />
            </motion.div>
          </Link>

          <Link to={createPageUrl("Rewards")}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#F5F1ED] rounded-3xl p-5 flex items-center gap-4 group hover:bg-white transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-[#5C4A3A] font-bold text-base">Explore Rewards</h3>
                <p className="text-[#8B7355] text-sm">Redeem points for free coffee & treats</p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#8B7355] group-hover:translate-x-1 transition-transform" />
            </motion.div>
          </Link>
        </div>

        {/* Sign In CTA */}
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Link to={createPageUrl("SignIn")}>
              <div className="bg-[#8B7355] hover:bg-[#6B5744] transition-colors rounded-3xl p-6 text-center">
                <Gift className="h-8 w-8 text-white mx-auto mb-2" />
                <h3 className="text-white font-bold text-lg mb-1">Sign in to unlock rewards</h3>
                <p className="text-[#E8DED8] text-sm">Earn points, redeem free coffee & more</p>
              </div>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}