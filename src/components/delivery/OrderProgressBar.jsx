const STEPS = [
  { key: "pending", label: "Placed", icon: "📝" },
  { key: "accepted", label: "Accepted", icon: "✅" },
  { key: "preparing", label: "Preparing", icon: "☕" },
  { key: "out_for_delivery", label: "On the Way", icon: "🛵" },
  { key: "delivered", label: "Delivered", icon: "📦" },
];

export default function OrderProgressBar({ status }) {
  if (status === "cancelled") {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-center font-semibold text-sm">
        ❌ Order Cancelled
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="bg-white rounded-2xl border border-[#E8DED8] p-4">
      <div className="flex items-start justify-between relative">
        {STEPS.map((step, idx) => (
          <div key={step.key} className="flex flex-col items-center flex-1 relative z-10">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                idx < currentIdx
                  ? "bg-[#8B7355] text-white"
                  : idx === currentIdx
                  ? "bg-[#6B5744] text-white ring-4 ring-[#8B7355]/20"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {idx < currentIdx ? "✓" : step.icon}
            </div>
            <span
              className={`text-[10px] mt-1.5 text-center leading-tight ${
                idx <= currentIdx ? "text-[#5C4A3A] font-medium" : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}