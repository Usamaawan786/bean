import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { ArrowLeft, Boxes, Receipt, ClipboardCheck, FileX, Recycle, Loader2 } from "lucide-react";
import StockOverviewTab from "@/components/inventoryhub/StockOverviewTab";
import InvoicesTab from "@/components/inventoryhub/InvoicesTab";
import ReconciliationTab from "@/components/inventoryhub/ReconciliationTab";
import WriteOffTab from "@/components/inventoryhub/WriteOffTab";
import YieldTab from "@/components/inventoryhub/YieldTab";

const TABS = [
  { key: "stock", label: "Stock Overview", icon: Boxes },
  { key: "invoices", label: "Invoices & Procurement", icon: Receipt },
  { key: "reconciliation", label: "Inventory Reconciliation", icon: ClipboardCheck },
  { key: "writeoff", label: "Write-Off Records", icon: FileX },
  { key: "yield", label: "Yield & Batch Processing", icon: Recycle }
];

export default function InventoryHub() {
  const [user, setUser] = useState(null);
  const [active, setActive] = useState("stock");
  const [visited, setVisited] = useState(() => new Set(["stock"]));

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me();
      if (!u || !["admin", "manager", "super_admin"].includes(u.role)) {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(u);
    };
    init();
  }, []);

  const selectTab = (key) => {
    setActive(key);
    setVisited((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#8B7355]">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const renderTab = (key) => {
    switch (key) {
      case "stock": return <StockOverviewTab />;
      case "invoices": return <InvoicesTab />;
      case "reconciliation": return <ReconciliationTab />;
      case "writeoff": return <WriteOffTab />;
      case "yield": return <YieldTab />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF] pb-16">
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-7xl mx-auto px-5 pt-6 pb-8">
          <Link to={createPageUrl("AdminInventory")} className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Link>
          <h1 className="text-3xl font-bold mt-3">Unified Inventory Hub</h1>
          <p className="text-[#E8DED8] text-sm mt-1">Stock · Procurement · Reconciliation · Write-Offs · Yield — one workspace</p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E8DED8]">
        <div className="max-w-7xl mx-auto px-3 flex items-center gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => selectTab(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-[#8B7355] text-[#5C4A3A]"
                    : "border-transparent text-[#8B7355] hover:text-[#5C4A3A] hover:bg-[#F5EBE8]/40"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content — visited tabs stay mounted (hidden) to preserve draft state */}
      <div className="max-w-7xl mx-auto px-5 py-6">
        {TABS.map((t) => (
          <div key={t.key} className={active === t.key ? "" : "hidden"}>
            {visited.has(t.key) && renderTab(t.key)}
          </div>
        ))}
      </div>
    </div>
  );
}