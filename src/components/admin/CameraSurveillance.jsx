import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Video, VideoOff, Circle, Square, Play, Trash2,
  Download, Clock, HardDrive, Camera, RotateCcw,
  ChevronDown, ChevronUp, AlertCircle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const CHUNK_DURATION_MS = 5 * 60 * 1000; // 5 minutes per chunk

export default function CameraSurveillance() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const chunkTimerRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStart, setRecordingStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [cameraLabel, setCameraLabel] = useState("POS Counter");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [showRecordings, setShowRecordings] = useState(false);
  const [autoRecord, setAutoRecord] = useState(false);

  const { data: recordings = [], refetch: refetchRecordings } = useQuery({
    queryKey: ["camera-recordings"],
    queryFn: () => base44.entities.CameraRecording.list("-created_date", 100),
  });

  // Elapsed timer
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - recordingStart) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording, recordingStart]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (isRecording) stopRecording();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setAutoRecord(false);
  };

  const flipCamera = async () => {
    const wasRecording = isRecording;
    if (wasRecording) stopRecording();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      if (wasRecording) startRecording();
    } catch (err) {
      setError("Could not switch camera.");
    }
  };

  const saveChunk = useCallback(async (blob, startTime) => {
    if (blob.size < 1000) return; // skip tiny chunks
    setUploading(true);
    try {
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: "video/webm" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const endTime = new Date();
      const durationSec = Math.round((endTime - startTime) / 1000);
      await base44.entities.CameraRecording.create({
        label: cameraLabel,
        video_url: file_url,
        duration_seconds: durationSec,
        started_at: startTime.toISOString(),
        ended_at: endTime.toISOString(),
        file_size_mb: parseFloat((blob.size / (1024 * 1024)).toFixed(2)),
        status: "stored",
      });
      refetchRecordings();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }, [cameraLabel, refetchRecordings]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const start = new Date();
    setRecordingStart(start.getTime());
    setElapsed(0);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, {
      mimeType,
      videoBitsPerSecond: 1_000_000, // 1 Mbps for smaller files
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      saveChunk(blob, start);
      chunksRef.current = [];
    };

    recorder.start(1000); // collect data every second
    mediaRecorderRef.current = recorder;
    setIsRecording(true);

    // Auto-save chunk every CHUNK_DURATION_MS
    if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
    chunkTimerRef.current = setInterval(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        // Restart immediately for next chunk
        setTimeout(() => {
          if (streamRef.current && autoRecord) {
            startRecording();
          }
        }, 500);
      }
    }, CHUNK_DURATION_MS);
  }, [saveChunk, autoRecord]);

  const stopRecording = () => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAutoRecord(false);
  };

  const startContinuousRecording = () => {
    setAutoRecord(true);
    startRecording();
  };

  const deleteRecording = async (id) => {
    await base44.entities.CameraRecording.delete(id);
    refetchRecordings();
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const totalStorageMB = recordings.reduce((sum, r) => sum + (r.file_size_mb || 0), 0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-[#E8DED8] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E8DED8] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-red-50 rounded-xl p-2 border border-red-100">
            <Camera className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-[#5C4A3A]">POS Camera Surveillance</h2>
            <p className="text-xs text-[#8B7355]">
              Live camera feed · Record & store clips · {recordings.length} recordings saved
            </p>
          </div>
        </div>
        {isRecording && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-full px-3 py-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-600">REC {formatDuration(elapsed)}</span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Camera Label */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-[#8B7355] mb-1 block">Camera Label</label>
            <input
              value={cameraLabel}
              onChange={e => setCameraLabel(e.target.value)}
              className="w-full border border-[#E8DED8] rounded-xl px-3 py-2 text-sm bg-white text-[#5C4A3A] focus:outline-none"
              placeholder="e.g. Counter 1, Kitchen..."
              disabled={isRecording}
            />
          </div>
          {!cameraActive ? (
            <Button onClick={startCamera} className="bg-[#8B7355] hover:bg-[#6B5744] text-white gap-2">
              <Video className="h-4 w-4" /> Start Camera
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={flipCamera} variant="outline" className="border-[#E8DED8] gap-1" size="sm">
                <RotateCcw className="h-4 w-4" /> Flip
              </Button>
              <Button onClick={stopCamera} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 gap-1" size="sm">
                <VideoOff className="h-4 w-4" /> Stop
              </Button>
            </div>
          )}
        </div>

        {/* Video Feed */}
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
              <Camera className="h-12 w-12 mb-2" />
              <p className="text-sm">Camera is off</p>
              <p className="text-xs mt-1">Click "Start Camera" to begin</p>
            </div>
          )}
          {/* Overlay info */}
          {cameraActive && (
            <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
              <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs">
                {cameraLabel} · {format(new Date(), "dd MMM yyyy, hh:mm:ss a")}
              </div>
              {uploading && (
                <div className="bg-blue-500/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Saving clip...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        {cameraActive && (
          <div className="flex flex-wrap gap-2">
            {!isRecording ? (
              <>
                <Button onClick={startRecording} className="bg-red-500 hover:bg-red-600 text-white gap-2 flex-1">
                  <Circle className="h-4 w-4 fill-current" /> Record Clip
                </Button>
                <Button onClick={startContinuousRecording} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 gap-2 flex-1">
                  <Circle className="h-4 w-4" /> Auto Record (5 min chunks)
                </Button>
              </>
            ) : (
              <Button onClick={stopRecording} className="bg-gray-800 hover:bg-gray-900 text-white gap-2 flex-1">
                <Square className="h-4 w-4 fill-current" /> Stop Recording
              </Button>
            )}
          </div>
        )}

        {/* Storage Info */}
        <div className="flex items-center justify-between bg-[#F9F6F3] rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-[#8B7355]">
            <HardDrive className="h-4 w-4" />
            <span>{recordings.length} clips · {totalStorageMB.toFixed(1)} MB stored</span>
          </div>
          <button
            onClick={() => setShowRecordings(v => !v)}
            className="flex items-center gap-1 text-sm font-medium text-[#8B7355] hover:text-[#5C4A3A]"
          >
            {showRecordings ? "Hide" : "View"} Recordings
            {showRecordings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Recordings List */}
        {showRecordings && (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {recordings.length === 0 ? (
              <div className="text-center py-8 text-[#C9B8A6] text-sm">
                No recordings yet. Start the camera and hit Record.
              </div>
            ) : (
              recordings.map(rec => (
                <div key={rec.id} className="bg-[#FDFAF8] border border-[#E8DED8] rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#5C4A3A]">{rec.label}</span>
                        <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                          {rec.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[#8B7355]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {rec.started_at ? format(new Date(rec.started_at), "dd MMM, hh:mm a") : "—"}
                        </span>
                        <span>{rec.duration_seconds ? formatDuration(rec.duration_seconds) : "—"}</span>
                        <span>{rec.file_size_mb ? `${rec.file_size_mb} MB` : "—"}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {rec.video_url && (
                        <>
                          <a href={rec.video_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="border-[#E8DED8] h-8 w-8 p-0">
                              <Play className="h-3.5 w-3.5 text-[#8B7355]" />
                            </Button>
                          </a>
                          <a href={rec.video_url} download>
                            <Button variant="outline" size="sm" className="border-[#E8DED8] h-8 w-8 p-0">
                              <Download className="h-3.5 w-3.5 text-[#8B7355]" />
                            </Button>
                          </a>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-500 hover:bg-red-50 h-8 w-8 p-0"
                        onClick={() => deleteRecording(rec.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {/* Inline player */}
                  {rec.video_url && (
                    <video
                      src={rec.video_url}
                      controls
                      className="w-full rounded-lg mt-2 max-h-48 bg-black"
                      preload="metadata"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}