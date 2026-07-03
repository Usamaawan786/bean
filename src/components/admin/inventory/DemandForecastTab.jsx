import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp } from "lucide-react";

export default function DemandForecastTab() {
  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ["demand-forecast"],
    queryFn: async () => {
      const res = await base44.functions.invoke('getDemandForecast', {});
      return res.data?.forecasts || [];
    }
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" /></div>;

  const statusConfig = {
    green: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Well Stocked" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Prep Needed" },
    red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", label: "Critical" }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-[#8B7355]" />
        <div>
          <h3 className="font-semibold text-[#5C4A3A] text-lg">Demand Forecast</h3>
          <p className="text-sm text-[#8B7355]">Rolling 4-week same-day average · 15% buffer</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {forecasts.map(f => {
          const s = statusConfig[f.status] || statusConfig.green;
          return (
            <div key={f.inventory_item_id} className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-[#5C4A3A] text-sm truncate">{f.name}</h4>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.text} bg-white/60`}>{s.label}</span>
              </div>
              <div className="text-3xl font-bold text-[#5C4A3A]">
                {f.target_prep_qty} <span className="text-sm font-normal text-[#8B7355]">{f.unit}</span>
              </div>
              <p className="text-xs text-[#8B7355] mt-0.5">Prep Needed Today</p>
              <div className="text-xs text-[#8B7355] mt-2 flex gap-3">
                <span>Stock: {f.current_stock}</span>
                <span>Avg: {f.avg_daily_velocity}/{f.unit}/day</span>
              </div>
              {f.weekly_data?.length > 0 && (
                <div className="h-10 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={f.weekly_data}>
                      <Area type="monotone" dataKey="deduction" stroke="#8B7355" fill="#F5EBE8" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {forecasts.length === 0 && <p className="text-center text-[#C9B8A6] py-8">No ingredient data for forecasting</p>}
    </div>
  );
}