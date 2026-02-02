import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Gift, Users, Zap, ShoppingBag, UserCircle, Wallet } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { name: "Home", icon: Home, page: "Home" },
  { name: "Shop", icon: ShoppingBag, page: "Shop" },
  { name: "Rewards", icon: Gift, page: "Rewards" },
  { name: "Community", icon: Users, page: "Community" },
  { name: "Profile", icon: UserCircle, page: "Profile" }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  
  // Hide nav on certain pages if needed
  const showNav = currentPageName !== "Waitlist";

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {children}
      
      {/* Bottom Navigation */}
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8DED8] pb-safe z-50">
          <div className="max-w-lg mx-auto px-2">
            <div className="flex items-center justify-around">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className="relative flex flex-col items-center py-3 px-4"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -top-0.5 w-8 h-1 bg-[#8B7355] rounded-full"
                      />
                    )}
                    <Icon 
                      className={`h-5 w-5 transition-colors ${
                        isActive ? "text-[#8B7355]" : "text-[#C9B8A6]"
                      }`} 
                    />
                    <span 
                      className={`text-xs mt-1 transition-colors ${
                        isActive ? "text-[#8B7355] font-medium" : "text-[#C9B8A6]"
                      }`}
                    >
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}