import { motion } from "framer-motion";

export default function StatsCard({ icon: Icon, label, value, subtext, color = "brown" }) {
  const colorClasses = {
    brown: "bg-[#F5EBE8] text-[#5C4A3A] border-[#E8DED8]",
    green: "bg-[#EDE8E3] text-[#6B5744] border-[#D4C4B0]",
    purple: "bg-[#EDE3DF] text-[#6B5744] border-[#D4C4B0]",
    rose: "bg-[#F5EBE8] text-[#5C4A3A] border-[#E8DED8]"
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