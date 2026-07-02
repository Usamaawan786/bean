import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import NegativeBalancePanel from "@/components/admin/inventory/NegativeBalancePanel";

export default function InventoryAudit() {
  const [user, setUser] = useState(null);
  const [t0, setT0] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); });
  const [t1, setT1] = useState(() => new Date().toISOString().slice(0, 10));
  const [actualCounts, setActualCounts] = useState({});
  const [theoretical, setTheoretical] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!["admin", "manager", "super_admin"].includes(u?.role)) {
        window.location.href = "/StaffPortal";
        return;
      }
      setUser(u);
    });
  }, []);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory-items-audit"],
    queryFn: () => base44.entities.InventoryItem.list("name"),
    enabled: !!user
  });

  const totalExposure = useMemo(() => {
    return items.reduce((sum, item) => {
      const actual = parseFloat(actualCounts[item.id]);
      const theo = theoretical[item.id];
      if (isNaN(actual) || theo === undefined) return sum;
      return sum + Math.abs(actual - theo) * (item.moving_average_cost || 0);
    }, 0);
  }, [items, actualCounts, theoretical]);

  const handleStartAudit = () => {
    // Local preview of current stock, so staff can compare against actual counts.
    // The authoritative theoretical stock (from ledger replay) is computed on submit.
    const preview = {};
    items.forEach(item => { preview[item.id] = item.current_stock_base_qty || 0; });
    setTheoretical(preview);
    toast.success("Enter actual counts, then submit the audit");
  };

  const handleSubmit = async () => {
    const payloadItems = items
      .filter(item => actualCounts[item.id] !== undefined && actualCounts[item.id] !== "")
      .map(item => ({ inventory_item_id: item.id, actual_count: parseFloat(actualCounts[item.id]) }));

    if (payloadItems.length === 0) return toast.error("Enter at least one actual count");

    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("runInventoryAudit", {
        t0: new Date(t0).toISOString(),
        t1: new Date(t1 + "T23:59:59").toISOString(),
        items: payloadItems
      });
      setLastResult(res.data.reports);
      toast.success(`Audit complete — ${res.data.reports.length} item(s) reconciled`);
    } catch (err) {
      toast.error("Audit failed: " + (err?.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED] pb-20">
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-6xl mx-auto px-5 pt-6 pb-8">
          <Link to="/AdminInventory" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldCheck className="h-7 w-7" /> Inventory Audit</h1>
          <p className="text-[#E8DED8] text-sm mt-1">Theoretical vs. actual stock variance</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-5">
        <NegativeBalancePanel />

        <div className="bg-white rounded-3xl border border-[#E8DED8] p-5 flex flex-wrap items-end gap-3">
          <div>
            <Label>From</Label>
            <Input type="date" value={t0} onChange={e => setT0(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={t1} onChange={e => setT1(e.target.value)} />
          </div>
          <Button onClick={handleStartAudit} className="bg-[#8B7355] hover:bg-[#6B5744]">Start Audit</Button>
        </div>

        <div className="bg-white rounded-3xl border border-[#E8DED8] p-5 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" /></div>
          ) : (
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-[#E8DED8]">
                  <th className="text-left py-2 px-3 text-[#5C4A3A] font-semibold">Item</th>
                  <th className="text-left py-2 px-3 text-[#5C4A3A] font-semibold">Unit</th>
                  <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Theoretical</th>
                  <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Actual Count</th>
                  <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Variance</th>
                  <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">Financial Impact</th>
                  <th className="text-right py-2 px-3 text-[#5C4A3A] font-semibold">MAC</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const theo = theoretical[item.id];
                  const actual = parseFloat(actualCounts[item.id]);
                  const variance = (theo !== undefined && !isNaN(actual)) ? actual - theo : null;
                  const impact = variance !== null ? Math.abs(variance) * (item.moving_average_cost || 0) : null;
                  return (
                    <tr key={item.id} className="border-b border-[#F5EBE8]">
                      <td className="py-2 px-3 text-[#5C4A3A] font-medium">{item.name}</td>
                      <td className="py-2 px-3 text-[#8B7355]">{item.base_unit}</td>
                      <td className="py-2 px-3 text-right text-[#8B7355]">{theo !== undefined ? theo.toFixed(1) : "—"}</td>
                      <td className="py-2 px-3 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24 text-right ml-auto"
                          value={actualCounts[item.id] || ""}
                          onChange={e => setActualCounts(c => ({ ...c, [item.id]: e.target.value }))}
                        />
                      </td>
                      <td className={`py-2 px-3 text-right font-semibold ${variance < 0 ? "text-red-600" : "text-[#5C4A3A]"}`}>
                        {variance !== null ? variance.toFixed(1) : "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-[#8B7355]">{impact !== null ? `Rs. ${impact.toFixed(0)}` : "—"}</td>
                      <td className="py-2 px-3 text-right text-[#8B7355]">Rs. {(item.moving_average_cost || 0).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-[#E8DED8] p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-[#8B7355]">Total Financial Exposure</p>
            <p className="text-2xl font-bold text-[#5C4A3A]">Rs. {totalExposure.toFixed(0)}</p>
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Submit Audit
          </Button>
        </div>

        {lastResult && (
          <div className="bg-green-50 border border-green-200 rounded-3xl p-5">
            <h3 className="font-bold text-green-800 mb-2">Audit Submitted</h3>
            <p className="text-sm text-green-700">{lastResult.length} item(s) reconciled and stock levels adjusted to match actual counts.</p>
          </div>
        )}
      </div>
    </div>
  );
}