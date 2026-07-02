import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Play, Download, Trash2, Clock, HardDrive, Loader2 } from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import AppHeader from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";

export default function SurveillanceVault() {
  const [user, setUser] = useState(null);
  const [activeClip, setActiveClip] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (!["admin", "super_admin", "manager"].includes(u?.role)) {
        window.location.href = "/StaffPortal";
        return;
      }
      setUser(u);
    });
  }, []);

  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ["surveillance-vault-recordings"],
    queryFn: () => base44.entities.CameraRecording.list("-created_date", 500),
    enabled: !!user,
  });

  const sevenDaysAgo = useMemo(() => subDays(new Date(), 7), []);

  const recentRecordings = useMemo(
    () => recordings.filter((r) => isAfter(new Date(r.created_date), sevenDaysAgo)),
    [recordings, sevenDaysAgo]
  );

  const totalStorageMB = recentRecordings.reduce((s, r) => s + (r.file_size_mb || 0), 0);

  const formatDuration = (secs) => {
    if (!secs) return "—";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleDelete = async (id) => {
    await base44.entities.CameraRecording.delete(id);
    queryClient.invalidateQueries({ queryKey: ["surveillance-vault-recordings"] });
    if (activeClip === id) setActiveClip(null);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED] dark:bg-[var(--bg-primary)] pb-20">
      <AppHeader
        title="Surveillance Vault"
        subtitle="7-day rolling store screen recordings"
        icon={ShieldCheck}
        backTo="AdminDashboard"
      />

      <div className="max-w-5xl mx-auto px-4 -mt-4 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[#E8DED8] dark:border-[var(--border-light)] p-4 text-center">
            <div className="text-2xl font-bold text-[#5C4A3A] dark:text-[var(--text-primary)]">{recentRecordings.length}</div>
            <div className="text-xs text-[#8B7355] dark:text-[var(--text-secondary)]">Clips (Last 7 Days)</div>
          </div>
          <div className="bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[#E8DED8] dark:border-[var(--border-light)] p-4 text-center">
            <div className="text-2xl font-bold text-[#5C4A3A] dark:text-[var(--text-primary)]">{totalStorageMB.toFixed(1)} MB</div>
            <div className="text-xs text-[#8B7355] dark:text-[var(--text-secondary)]">Storage Used</div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-[#8B7355]" />
          </div>
        ) : recentRecordings.length === 0 ? (
          <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl border border-[#E8DED8] dark:border-[var(--border-light)] p-12 text-center">
            <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-[#C9B8A6]" />
            <p className="text-[#8B7355] dark:text-[var(--text-secondary)] font-medium">No recordings in the last 7 days</p>
            <p className="text-xs text-[#C9B8A6] mt-1">Clips captured by the POS camera surveillance system will appear here.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {recentRecordings.map((rec) => (
              <div key={rec.id} className="bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[#E8DED8] dark:border-[var(--border-light)] overflow-hidden">
                <div className="aspect-video bg-black relative">
                  {activeClip === rec.id ? (
                    <video src={rec.video_url} controls autoPlay className="w-full h-full object-contain" />
                  ) : (
                    <button
                      onClick={() => setActiveClip(rec.id)}
                      className="w-full h-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                    >
                      <Play className="h-10 w-10" />
                    </button>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-[#5C4A3A] dark:text-[var(--text-primary)]">{rec.label}</span>
                    <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5">{rec.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#8B7355] dark:text-[var(--text-secondary)] mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {rec.started_at ? format(new Date(rec.started_at), "MMM d, h:mm a") : "—"}
                    </span>
                    <span>{formatDuration(rec.duration_seconds)}</span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {rec.file_size_mb ? `${rec.file_size_mb} MB` : "—"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {rec.video_url && (
                      <a href={rec.video_url} download className="flex-1">
                        <Button variant="outline" size="sm" className="w-full border-[#E8DED8] gap-1.5 text-xs">
                          <Download className="h-3.5 w-3.5" /> Download
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-500 hover:bg-red-50 gap-1.5 text-xs"
                      onClick={() => handleDelete(rec.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}