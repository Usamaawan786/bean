import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, PackageSearch, AlertTriangle, Wallet } from "lucide-react";

function fmt(n, dp = 2) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

export default function StockOverviewTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await base44.entities.InventoryItem.list("-name", 1000);
        setItems(list);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#8B7355]">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading stock…
      </div>
    );
  }

  const totalValue = items.reduce((s, i) => s + (i.current_stock_base_qty || 0) * (i.moving_average_cost || i.cost_per_base_unit || 0), 0);
  const lowStock = items.filter((i) => (i.current_stock_base_qty || 0) <= (i.min_par_level_base_qty || 0));
  const outStock = items.filter((i) => (i.current_stock_base_qty || 0) <= 0);

  const cards = [
    { label: "Total Items", value: items.length, icon: PackageSearch, tint: "bg-[#8B7355]/10 text-[#8B7355]" },
    { label: "Stock Valuation", value: `PKR ${fmt(totalValue)}`, icon: Wallet, tint: "bg-green-100 text-green-700" },
    { label: "Low Stock", value: lowStock.length, icon: AlertTriangle, tint: "bg-yellow-100 text-yellow-700" },
    { label: "Out of Stock", value: outStock.length, icon: AlertTriangle, tint: "bg-red-100 text-red-700" }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-2xl border border-[#E8DED8] p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.tint}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-[#8B7355]">{c.label}</div>
                <div className="text-lg font-bold text-[#5C4A3A]">{c.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-[#F5EBE8] text-[#8B7355] text-xs">
              <tr>
                <th className="text-left font-semibold px-4 py-2.5">Item</th>
                <th className="text-left font-semibold px-2 py-2.5">Code</th>
                <th className="text-left font-semibold px-2 py-2.5">Class</th>
                <th className="text-right font-semibold px-2 py-2.5">Stock</th>
                <th className="text-right font-semibold px-2 py-2.5">Par Level</th>
                <th className="text-right font-semibold px-2 py-2.5">MAC (PKR)</th>
                <th className="text-right font-semibold px-4 py-2.5">Value (PKR)</th>
                <th className="text-center font-semibold px-2 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const stock = i.current_stock_base_qty || 0;
                const par = i.min_par_level_base_qty || 0;
                const mac = i.moving_average_cost || i.cost_per_base_unit || 0;
                const value = stock * mac;
                const out = stock <= 0;
                const low = !out && stock <= par;
                return (
                  <tr key={i.id} className={`border-t border-[#F0EAE4] ${out ? "bg-red-50/50" : low ? "bg-yellow-50/40" : ""}`}>
                    <td className="px-4 py-2 text-[#5C4A3A] font-medium">{i.name}</td>
                    <td className="px-2 py-2 text-[#8B7355]">{i.sku || "—"}</td>
                    <td className="px-2 py-2 text-[#8B7355]">{i.item_class || "Item"}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-[#5C4A3A]">{fmt(stock, 3)} {i.base_unit}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-[#8B7355]">{fmt(par, 3)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-[#5C4A3A]">{fmt(mac)}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-[#5C4A3A]">{fmt(value)}</td>
                    <td className="px-2 py-2 text-center">
                      {out ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">OUT</span>
                      ) : low ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">LOW</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}