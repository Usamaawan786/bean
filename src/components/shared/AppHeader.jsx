import { ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function AppHeader({ 
  title, 
  subtitle, 
  icon: Icon, 
  backTo, 
  gradient = "from-[#8B7355] to-[#6B5744]",
  actions 
}) {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (backTo) {
      navigate(createPageUrl(backTo));
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={`bg-gradient-to-br ${gradient} dark:from-[#2a241e] dark:to-[#201b16] text-white dark:text-[var(--text-primary)] select-none`}>
      <div className="max-w-lg mx-auto px-5 pt-6 pb-8">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-[#D4C4B0] dark:text-[var(--text-tertiary)] text-sm mb-4 hover:text-white dark:hover:text-[var(--text-secondary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {Icon && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="rounded-2xl bg-white/20 dark:bg-white/10 p-3 flex-shrink-0"
              >
                <Icon className="h-6 w-6" />
              </motion.div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{title}</h1>
              {subtitle && (
                <p className="text-[#E8DED8] dark:text-[var(--text-tertiary)] text-sm truncate">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="ml-3 flex-shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  );
}