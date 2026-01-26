import { motion } from "framer-motion";

export default function StatsCard({ icon: Icon, label, value, subtext, color = "amber" }) {
  const colorClasses = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    purple: "bg-violet-50 text-violet-700 border-violet-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 ${colorClasses[color]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {subtext && <p className="mt-1 text-xs opacity-60">{subtext}</p>}
        </div>
        <div className="rounded-xl bg-white/60 p-2.5">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}