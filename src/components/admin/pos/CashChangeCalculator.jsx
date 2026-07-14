import { Banknote } from "lucide-react";

export default function CashChangeCalculator({ total, cashReceived, onChange }) {
  const received = Number(cashReceived) || 0;
  const change = received - total;
  const insufficient = received > 0 && change < 0;

  return (
    <div className="mt-3 rounded-xl border border-[#E8DED8] bg-[#F5EBE8] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Banknote className="h-4 w-4 text-[#8B7355]" />
        <label className="text-sm font-medium text-[#5C4A3A]">Cash Received</label>
      </div>
      <input
        type="number"
        min="0"
        inputMode="decimal"
        placeholder="PKR 0"
        value={cashReceived}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[#E8DED8] rounded-xl px-3 py-2 text-lg font-bold text-[#5C4A3A] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
      />
      {received > 0 && (
        <div className="mt-2 text-center">
          {insufficient ? (
            <div className="text-red-600 font-bold text-lg">
              Insufficient — short by PKR {Math.abs(change).toFixed(0)}
            </div>
          ) : (
            <div className="text-green-600 font-bold text-xl">
              Change Due: PKR {change.toFixed(0)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}