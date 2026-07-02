import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Monitor, Circle, PauseCircle, PlayCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function SurveillanceSessionsPanel() {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["surveillance-sessions"],
    queryFn: () => base44.entities.SurveillanceSession.list("-last_heartbeat_at", 50),
    refetchInterval: 15000
  });

  const isLive = (s) =>
    s.status === "active" && s.last_heartbeat_at && (Date.now() - new Date(s.last_heartbeat_at).getTime()) < 60000;

  const handleToggle = async (session) => {
    try {
      if (session.status === "stopped_by_admin") {
        await base44.functions.invoke("resumeSurveillanceSession", { session_id: session.id });
        toast.success(`Resumed recording for ${session.staff_name || session.staff_email}`);
      } else {
        await base44.functions.invoke("stopSurveillanceSession", { session_id: session.id });
        toast.success(`Stopped recording for ${session.staff_name || session.staff_email}`);
      }
      queryClient.invalidateQueries({ queryKey: ["surveillance-sessions"] });
    } catch (err) {
      toast.error("Failed to update session: " + (err?.message || "Unknown error"));
    }
  };

  if (isLoading) return null;

  return (
    <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl border border-[#E8DED8] dark:border-[var(--border-light)] p-6 shadow-sm">
      <h2 className="font-bold text-[#5C4A3A] dark:text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Monitor className="h-5 w-5 text-[#8B7355]" /> POS Screen Recording Sessions
      </h2>
      {sessions.length === 0 ? (
        <p className="text-sm text-[#C9B8A6] text-center py-6">No staff sessions recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-3 bg-[#F9F6F3] dark:bg-[var(--bg-elevated)] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Circle className={`h-2.5 w-2.5 flex-shrink-0 ${
                  isLive(s) ? "fill-red-500 text-red-500 animate-pulse"
                    : s.status === "stopped_by_admin" ? "fill-gray-300 text-gray-300"
                    : "fill-amber-400 text-amber-400"
                }`} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#5C4A3A] dark:text-[var(--text-primary)] truncate">{s.staff_name || s.staff_email}</p>
                  <p className="text-xs text-[#8B7355] dark:text-[var(--text-secondary)] truncate">
                    {s.role} · {s.status === "active" ? (isLive(s) ? "Recording live" : "Awaiting screen share") : s.status === "stopped_by_admin" ? "Stopped by admin" : "Ended"}
                    {s.last_heartbeat_at && ` · ${formatDistanceToNow(new Date(s.last_heartbeat_at), { addSuffix: true })}`}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleToggle(s)}
                size="sm"
                variant="outline"
                className={s.status === "stopped_by_admin" ? "border-green-300 text-green-600 hover:bg-green-50" : "border-red-200 text-red-600 hover:bg-red-50"}
              >
                {s.status === "stopped_by_admin" ? <PlayCircle className="h-4 w-4 mr-1.5" /> : <PauseCircle className="h-4 w-4 mr-1.5" />}
                {s.status === "stopped_by_admin" ? "Resume" : "Stop"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}