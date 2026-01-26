import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Gift, Users, Zap, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { name: "Home", icon: Home, page: "Home" },
  { name: "Shop", icon: ShoppingBag, page: "Shop" },
  { name: "Drops", icon: Zap, page: "FlashDrops" },
  { name: "Community", icon: Users, page: "Community" },
  { name: "Rewards", icon: Gift, page: "Rewards" }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  
  // Hide nav on certain pages if needed
  const showNav = true;

  return (
    <div className="min-h-screen bg-[#FAF6F2]">
      <style>{`
        :root {
          --bean-bg: #FAF6F2;
          --bean-card: #FFFFFF;
          --bean-primary: #B5A593;
          --bean-primary-dark: #9B8B7E;
          --bean-secondary: #D4C8BB;
          --bean-accent: #C9BDB0;
          --bean-text: #8B7B6E;
          --bean-text-light: #A89985;
          --bean-border: #E8DED5;
        }
      `}</style>
      {children}
      
      {/* Bottom Navigation */}
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8DED5] pb-safe z-50">
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
                        className="absolute -top-0.5 w-8 h-1 bg-[#B5A593] rounded-full"
                      />
                    )}
                    <Icon 
                      className={`h-5 w-5 transition-colors ${
                        isActive ? "text-[#B5A593]" : "text-[#D4C8BB]"
                      }`} 
                    />
                    <span 
                      className={`text-xs mt-1 transition-colors ${
                        isActive ? "text-[#B5A593] font-medium" : "text-[#D4C8BB]"
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