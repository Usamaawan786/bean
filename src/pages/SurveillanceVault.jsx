import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Loader2 } from "lucide-react";
import { subDays, isAfter } from "date-fns";
import AppHeader from "@/components/shared/AppHeader";
import SurveillanceSessionsPanel from "@/components/admin/surveillance/SurveillanceSessionsPanel";
import RecordingCard from "@/components/admin/surveillance/RecordingCard";

export default function SurveillanceVault() {
  const [user, setUser] = useState(null);
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

  const handleDelete = async (id) => {
    await base44.entities.CameraRecording.delete(id);
    queryClient.invalidateQueries({ queryKey: ["surveillance-vault-recordings"] });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED] dark:bg-[var(--bg-primary)] pb-20">
      <AppHeader
        title="Surveillance Vault"
        subtitle="7-day rolling store screen & audio recordings"
        icon={ShieldCheck}
        backTo="AdminDashboard"
      />

      <div className="max-w-5xl mx-auto px-4 -mt-4 space-y-5">
        <SurveillanceSessionsPanel />

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
              <RecordingCard key={rec.id} rec={rec} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}