import { useRef, useState } from "react";
import { Play, Download, Trash2, Clock, HardDrive, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

function formatDuration(secs) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RecordingCard({ rec, onDelete }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);

  const jumpTo = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  return (
    <div className="bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[#E8DED8] dark:border-[var(--border-light)] overflow-hidden">
      <div className="aspect-video bg-black relative">
        {playing ? (
          <video ref={videoRef} src={rec.video_url} controls autoPlay className="w-full h-full object-contain" />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="w-full h-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <Play className="h-10 w-10" />
          </button>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="font-semibold text-sm text-[#5C4A3A] dark:text-[var(--text-primary)] truncate">{rec.label}</span>
          <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 flex-shrink-0">{rec.status}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#8B7355] dark:text-[var(--text-secondary)] mb-2 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {rec.started_at ? format(new Date(rec.started_at), "MMM d, h:mm a") : "—"}
          </span>
          <span>{formatDuration(rec.duration_seconds)}</span>
          <span className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            {rec.file_size_mb ? `${rec.file_size_mb} MB` : "—"}
          </span>
          {rec.has_audio && <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-1.5 py-0.5">🎙 Audio</span>}
        </div>

        {rec.activity_markers?.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-[#8B7355] mb-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Activity jump points
            </p>
            <div className="flex flex-wrap gap-1">
              {rec.activity_markers.slice(0, 12).map((m, i) => (
                <button
                  key={i}
                  onClick={() => { setPlaying(true); setTimeout(() => jumpTo(m.time_seconds), 200); }}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5EBE8] text-[#8B7355] border border-[#E8DED8] hover:bg-[#8B7355] hover:text-white transition-colors"
                >
                  {formatDuration(m.time_seconds)}
                </button>
              ))}
            </div>
          </div>
        )}

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
            onClick={() => onDelete(rec.id)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}