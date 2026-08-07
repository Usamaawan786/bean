import { Search, X, Calendar } from "lucide-react";

export default function SurveillanceFilters({ search, setSearch, dateFrom, setDateFrom, dateTo, setDateTo, onClear }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, bill #, code, reward..."
          className="w-full border border-[#E8DED8] rounded-xl pl-9 pr-3 py-2.5 text-sm bg-white text-[#5C4A3A] focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
        />
      </div>
      <div className="flex items-center gap-1 bg-white border border-[#E8DED8] rounded-xl px-2">
        <Calendar className="h-4 w-4 text-[#C9B8A6]" />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="px-2 py-2.5 text-sm text-[#5C4A3A] bg-transparent focus:outline-none" />
        <span className="text-[#C9B8A6] text-xs">→</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="px-2 py-2.5 text-sm text-[#5C4A3A] bg-transparent focus:outline-none" />
      </div>
      {(search || dateFrom || dateTo) && (
        <button onClick={onClear} className="p-2.5 rounded-xl bg-white border border-[#E8DED8] text-[#8B7355] hover:bg-[#F5EBE8]">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}