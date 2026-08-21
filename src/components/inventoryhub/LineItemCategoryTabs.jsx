import { Boxes, Coffee, FlaskConical, Truck, PlusCircle, LayoutGrid } from "lucide-react";

// Syrve-style line-item sub-categorization tabs used inside the New Purchase
// Invoice and New Write-Off Record line pickers.
export const LINE_CATEGORIES = [
  { key: "All", label: "All", icon: LayoutGrid },
  { key: "Product", label: "Products", icon: Boxes },
  { key: "Item", label: "Items", icon: Coffee },
  { key: "Semi-finished", label: "Semi-finished goods", icon: FlaskConical },
  { key: "Service", label: "Services", icon: Truck },
  { key: "Modifier", label: "Modifiers", icon: PlusCircle }
];

export default function LineItemCategoryTabs({ active, onChange, counts = {} }) {
  return (
    <div className="flex items-center gap-1 border-b border-[#E8DED8] overflow-x-auto">
      {LINE_CATEGORIES.map((c) => {
        const Icon = c.icon;
        const isActive = active === c.key;
        const count = counts[c.key];
        return (
          <button
            key={c.key}
            onClick={() => onChange(c.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              isActive
                ? "border-[#8B7355] text-[#5C4A3A] bg-white"
                : "border-transparent text-[#8B7355] hover:text-[#5C4A3A] hover:bg-[#F5EBE8]/50"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {c.label}
            {typeof count === "number" && (
              <span className={`ml-0.5 text-[10px] px-1.5 rounded-full ${isActive ? "bg-[#8B7355]/10 text-[#5C4A3A]" : "bg-[#F5EBE8] text-[#8B7355]"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}