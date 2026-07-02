import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Wifi, WifiOff, RefreshCw, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import AppHeader from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG = {
  success: { label: "Success", cls: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  failed: { label: "Failed", cls: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  not_configured: { label: "Not Configured", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle },
};

export default function SyrveIntegrationHub() {
  const [user, setUser] = useState(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectionState, setConnectionState] = useState(null); // null | true | false
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (!["admin", "super_admin"].includes(u?.role)) {
        window.location.href = "/StaffPortal";
        return;
      }
      setUser(u);
    });
  }, []);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["syrve-sync-logs"],
    queryFn: () => base44.entities.SyrveSyncLog.list("-created_date", 50),
    enabled: !!user,
  });

  const handleTestConnection = async () => {
    setTesting(true);
    const res = await base44.functions.invoke("syrveSync", { action: "test_connection" });
    setConnectionState(res.data.connected);
    queryClient.invalidateQueries({ queryKey: ["syrve-sync-logs"] });
    setTesting(false);
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    await base44.functions.invoke("syrveSync", { action: "trigger_sync" });
    queryClient.invalidateQueries({ queryKey: ["syrve-sync-logs"] });
    setSyncing(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED] dark:bg-[var(--bg-primary)] pb-20">
      <AppHeader
        title="Syrve Integration Hub"
        subtitle="Manage the Syrve POS loyalty connection"
        icon={Settings}
        backTo="AdminDashboard"
      />

      <div className="max-w-5xl mx-auto px-4 -mt-4 space-y-5">
        <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl border border-[#E8DED8] dark:border-[var(--border-light)] p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-2xl p-3 ${connectionState ? "bg-green-50" : "bg-amber-50"}`}>
                {connectionState ? (
                  <Wifi className="h-6 w-6 text-green-600" />
                ) : (
                  <WifiOff className="h-6 w-6 text-amber-600" />
                )}
              </div>
              <div>
                <h2 className="font-bold text-[#5C4A3A] dark:text-[var(--text-primary)]">
                  {connectionState === null ? "Connection Status Unknown" : connectionState ? "Connected" : "Not Connected"}
                </h2>
                <p className="text-xs text-[#8B7355] dark:text-[var(--text-secondary)]">
                  {connectionState === null
                    ? "Run a connection test to check the Syrve API key."
                    : connectionState
                    ? "Syrve API key is configured and ready to sync."
                    : "Add the SYRVE_API_KEY secret to connect to Syrve."}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleTestConnection} disabled={testing} variant="outline" className="border-[#E8DED8] gap-2">
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                Test Connection
              </Button>
              <Button onClick={handleTriggerSync} disabled={syncing} className="bg-[#5C4A3A] hover:bg-[#4A3829] text-white gap-2">
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Trigger Manual Sync
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl border border-[#E8DED8] dark:border-[var(--border-light)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8DED8] dark:border-[var(--border-light)]">
            <h2 className="font-bold text-[#5C4A3A] dark:text-[var(--text-primary)]">Recent Sync Logs</h2>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center text-[#8B7355] dark:text-[var(--text-secondary)] text-sm">
              No sync activity yet. Test the connection or trigger a manual sync to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8DED8] dark:border-[var(--border-light)] text-left bg-[#F9F6F3] dark:bg-[var(--bg-elevated)]">
                    <th className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)] font-medium">Type</th>
                    <th className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)] font-medium">Status</th>
                    <th className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)] font-medium">Message</th>
                    <th className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)] font-medium">Triggered By</th>
                    <th className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)] font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.not_configured;
                    const Icon = cfg.icon;
                    return (
                      <tr key={log.id} className="border-b border-[#F5EBE8] dark:border-[var(--border-light)] last:border-0">
                        <td className="py-3 px-4 capitalize text-[#5C4A3A] dark:text-[var(--text-primary)]">{log.sync_type?.replace("_", " ")}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
                            <Icon className="h-3 w-3" /> {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)] max-w-xs truncate">{log.message}</td>
                        <td className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)]">{log.triggered_by || "—"}</td>
                        <td className="py-3 px-4 text-[#8B7355] dark:text-[var(--text-secondary)] whitespace-nowrap">
                          {format(new Date(log.created_date), "MMM d, h:mm a")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}