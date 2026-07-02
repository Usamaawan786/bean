import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const CHUNK_DURATION_MS = 5 * 60 * 1000; // 5 minutes per chunk
const HEARTBEAT_MS = 30 * 1000;

// Automatically screen + audio records cashier/manager POS sessions in 5-minute
// chunks. Recording can only be stopped from the admin side (SurveillanceSession.status).
export default function useAutoScreenSurveillance(user) {
  const [needsShare, setNeedsShare] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);

  const displayStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const combinedStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const chunkTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const activityRef = useRef([]);
  const chunkStartRef = useRef(null);
  const sessionRef = useRef(null);

  const eligible = !!user && ["cashier", "manager"].includes(user.role);

  const refreshSession = useCallback(async () => {
    if (!eligible) return null;
    try {
      const res = await base44.functions.invoke("heartbeatSurveillanceSession", {});
      const s = res.data?.session || null;
      if (s) sessionRef.current = s;
      return s;
    } catch (e) {
      return null;
    }
  }, [eligible]);

  // Track screen activity while recording, for jump-to markers
  useEffect(() => {
    if (!isRecording) return;
    const record = (label) => {
      if (!chunkStartRef.current) return;
      const t = Math.round((Date.now() - chunkStartRef.current) / 1000);
      const arr = activityRef.current;
      const last = arr[arr.length - 1];
      if (last && t - last.time_seconds < 2) return;
      arr.push({ time_seconds: t, label });
    };
    const onClick = () => record("click");
    const onKey = () => record("key");
    window.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [isRecording]);

  const saveChunk = useCallback(async (blob, startTime, hasAudio) => {
    if (blob.size < 1000) return;
    try {
      const file = new File([blob], `screen-${Date.now()}.webm`, { type: "video/webm" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const endTime = new Date();
      await base44.entities.CameraRecording.create({
        label: `${user.full_name || user.email} — POS Screen`,
        video_url: file_url,
        duration_seconds: Math.round((endTime - startTime) / 1000),
        started_at: startTime.toISOString(),
        ended_at: endTime.toISOString(),
        file_size_mb: parseFloat((blob.size / (1024 * 1024)).toFixed(2)),
        status: "stored",
        recording_type: "screen_audio",
        staff_email: user.email,
        staff_name: user.full_name || "",
        session_id: sessionRef.current?.id || "",
        has_audio: hasAudio,
        activity_markers: activityRef.current
      });
    } catch (e) {
      console.error("Failed to save surveillance chunk", e);
    }
  }, [user]);

  const startChunkRecording = useCallback(() => {
    const stream = combinedStreamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    activityRef.current = [];
    const start = new Date();
    chunkStartRef.current = start.getTime();

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const hasAudio = stream.getAudioTracks().length > 0;
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 800_000 });

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      saveChunk(blob, start, hasAudio);
      chunksRef.current = [];
    };

    recorder.start(1000);
    recorderRef.current = recorder;
  }, [saveChunk]);

  const stopEverything = useCallback(() => {
    if (chunkTimerRef.current) { clearInterval(chunkTimerRef.current); chunkTimerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    [displayStreamRef.current, micStreamRef.current].forEach(s => s?.getTracks().forEach(t => t.stop()));
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    displayStreamRef.current = null;
    micStreamRef.current = null;
    combinedStreamRef.current = null;
    setIsRecording(false);
  }, []);

  const startSharing = useCallback(async () => {
    setError(null);
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 6 }, audio: true });
      displayStreamRef.current = displayStream;

      let micStream = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;
      } catch (e) { /* mic is optional */ }

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      let hasAudio = false;
      if (displayStream.getAudioTracks().length > 0) {
        audioCtx.createMediaStreamSource(displayStream).connect(dest);
        hasAudio = true;
      }
      if (micStream) {
        audioCtx.createMediaStreamSource(micStream).connect(dest);
        hasAudio = true;
      }

      const videoTrack = displayStream.getVideoTracks()[0];
      const tracks = [videoTrack];
      if (hasAudio) tracks.push(...dest.stream.getAudioTracks());
      combinedStreamRef.current = new MediaStream(tracks);

      videoTrack.onended = () => {
        // Staff stopped sharing via the browser control — force them to re-share.
        stopEverything();
        setNeedsShare(true);
      };

      setNeedsShare(false);
      setIsRecording(true);
      startChunkRecording();

      if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = setInterval(() => {
        if (recorderRef.current && recorderRef.current.state === "recording") {
          recorderRef.current.stop();
          setTimeout(() => {
            if (combinedStreamRef.current) startChunkRecording();
          }, 300);
        }
      }, CHUNK_DURATION_MS);
    } catch (err) {
      setError("Screen sharing is required to continue using the POS.");
      setNeedsShare(true);
    }
  }, [startChunkRecording, stopEverything]);

  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;

    (async () => {
      const s = await refreshSession();
      if (cancelled) return;
      if (s?.status === "active") setNeedsShare(true);
    })();

    heartbeatTimerRef.current = setInterval(async () => {
      const s = await refreshSession();
      if (!s) return;
      if (s.status === "stopped_by_admin" || s.status === "ended") {
        if (combinedStreamRef.current) stopEverything();
        setNeedsShare(false);
      } else if (s.status === "active" && !combinedStreamRef.current) {
        setNeedsShare(true);
      }
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      stopEverything();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible]);

  return { eligible, needsShare, isRecording, error, startSharing };
}