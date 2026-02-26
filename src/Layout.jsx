import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Gift, Users, Zap, ShoppingBag, UserCircle, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const guestNavItems = [
  { name: "Home", icon: Home, page: "Home" },
  { name: "Shop", icon: ShoppingBag, page: "Shop" },
  { name: "Rewards", icon: Gift, page: "Rewards" },
  { name: "Community", icon: Users, page: "Community" },
  { name: "Sign In", icon: LogIn, page: "Login" }
];

const authNavItems = [
  { name: "Home", icon: Home, page: "Home" },
  { name: "Shop", icon: ShoppingBag, page: "Shop" },
  { name: "Rewards", icon: Gift, page: "Rewards" },
  { name: "Community", icon: Users, page: "Community" },
  { name: "Profile", icon: UserCircle, page: "Profile" }
];

export default function Layout({ children, currentPageName }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      setIsAuthenticated(auth);
      setAuthChecked(true);
    });
  }, [currentPageName]);

  const navItems = isAuthenticated ? authNavItems : guestNavItems;
  const showNav = currentPageName !== "waitlist";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] select-none" style={{ overscrollBehavior: 'none' }}>
      {children}

      {/* Bottom Navigation */}
      {showNav && (authChecked || currentPageName === "Login" || currentPageName === "Signup") && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[var(--bg-card)] border-t border-[#E8DED8] dark:border-[var(--border-light)] pb-safe z-50">
          <div className="max-w-lg mx-auto px-2">
            <div className="flex items-center justify-around select-none">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;

                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className="relative flex flex-col items-center py-3 px-4 select-none"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -top-0.5 w-8 h-1 bg-[var(--accent-primary)] dark:bg-[var(--accent-primary)] rounded-full"
                      />
                    )}
                    <Icon
                      className={`h-5 w-5 transition-colors ${isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-tertiary)]"
                        }`}
                    />
                    <span
                      className={`text-xs mt-1 transition-colors ${isActive ? "text-[var(--accent-primary)] font-medium" : "text-[var(--text-tertiary)]"
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