import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Monitor, Circle, PauseCircle, PlayCircle, Video } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function SurveillanceSessionsPanel() {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["surveillance-sessions"],
    queryFn: () => base44.entities.SurveillanceSession.list("-last_heartbeat_at", 50),
    refetchInterval: 15000
  });

  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ["surveillance-eligible-staff"],
    queryFn: async () => {
      const users = await base44.entities.User.list("-created_date", 200);
      return users.filter(u => ["cashier", "manager"].includes(u.role));
    }
  });

  const isLive = (s) =>
    s.status === "active" && s.recording_active !== false && s.last_heartbeat_at && (Date.now() - new Date(s.last_heartbeat_at).getTime()) < 60000;

  // Merge every eligible staff member with their most recent session (if any),
  // so admins can start monitoring someone who has never opened the POS yet.
  const rows = staff.map(u => {
    const session = sessions.find(s => s.staff_email === u.email) || null;
    return { email: u.email, name: u.full_name || u.email, role: u.role, session };
  });

  const handleStart = async (row) => {
    try {
      await base44.functions.invoke("startSurveillanceSession", {
        staff_email: row.email,
        staff_name: row.name,
        role: row.role
      });
      toast.success(`Recording required for ${row.name} — they'll be prompted to share their screen next time they open the POS`);
      queryClient.invalidateQueries({ queryKey: ["surveillance-sessions"] });
    } catch (err) {
      toast.error("Failed to start recording: " + (err?.message || "Unknown error"));
    }
  };

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

  if (loadingSessions || loadingStaff) return null;

  return (
    <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl border border-[#E8DED8] dark:border-[var(--border-light)] p-6 shadow-sm">
      <h2 className="font-bold text-[#5C4A3A] dark:text-[var(--text-primary)] mb-1 flex items-center gap-2">
        <Monitor className="h-5 w-5 text-[#8B7355]" /> POS Screen Recording Sessions
      </h2>
      <p className="text-xs text-[#8B7355] dark:text-[var(--text-secondary)] mb-4">
        Screen + audio recording is required automatically the moment a cashier or manager opens the POS. Use "Start" to require it ahead of time, or "Stop" / "Resume" to control an ongoing session.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-[#C9B8A6] text-center py-6">No cashier or manager accounts found yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(row => {
            const s = row.session;
            const status = !s ? "not_started"
              : s.status === "active" ? (isLive(s) ? "live" : "awaiting")
              : s.status === "stopped_by_admin" ? "stopped"
              : "ended";

            return (
              <div key={row.email} className="flex items-center justify-between gap-3 bg-[#F9F6F3] dark:bg-[var(--bg-elevated)] rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Circle className={`h-2.5 w-2.5 flex-shrink-0 ${
                    status === "live" ? "fill-red-500 text-red-500 animate-pulse"
                      : status === "stopped" ? "fill-gray-300 text-gray-300"
                      : status === "not_started" ? "fill-gray-200 text-gray-200"
                      : "fill-amber-400 text-amber-400"
                  }`} />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[#5C4A3A] dark:text-[var(--text-primary)] truncate">{row.name}</p>
                    <p className="text-xs text-[#8B7355] dark:text-[var(--text-secondary)] truncate">
                      {row.role} · {
                        status === "live" ? "Recording live"
                        : status === "awaiting" ? "Awaiting screen share"
                        : status === "stopped" ? "Stopped by admin"
                        : status === "not_started" ? "Not yet monitored"
                        : "Ended"
                      }
                      {s?.last_heartbeat_at && ` · ${formatDistanceToNow(new Date(s.last_heartbeat_at), { addSuffix: true })}`}
                    </p>
                    {s?.interruption_count > 0 && (
                      <p className="text-xs text-amber-600 font-medium mt-0.5">
                        ⚠ {s.interruption_count} sharing interruption{s.interruption_count > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
                {status === "not_started" || status === "ended" ? (
                  <Button
                    onClick={() => handleStart(row)}
                    size="sm"
                    variant="outline"
                    className="border-[#8B7355] text-[#8B7355] hover:bg-[#F5EBE8]"
                  >
                    <Video className="h-4 w-4 mr-1.5" /> Start
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleToggle(s)}
                    size="sm"
                    variant="outline"
                    className={status === "stopped" ? "border-green-300 text-green-600 hover:bg-green-50" : "border-red-200 text-red-600 hover:bg-red-50"}
                  >
                    {status === "stopped" ? <PlayCircle className="h-4 w-4 mr-1.5" /> : <PauseCircle className="h-4 w-4 mr-1.5" />}
                    {status === "stopped" ? "Resume" : "Stop"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}