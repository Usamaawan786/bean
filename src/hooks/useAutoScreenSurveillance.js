import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Size-based chunking: keep each recording as large as possible while staying
// safely under the 100MB video upload cap (10MB safety margin = 90MB target).
const TARGET_CHUNK_BYTES = 90 * 1024 * 1024;
// Safety net in case bitrate is unexpectedly low and a chunk would otherwise
// never reach the size target — still rotate periodically so nothing is lost.
const MAX_CHUNK_DURATION_MS = 15 * 60 * 1000;
const HEARTBEAT_MS = 30 * 1000;
// Grace window to recover from a dropped screen/mic share before hard-locking
// the POS — protects against small bugs/blips without allowing real bypass.
const RECONNECT_GRACE_MS = 20 * 1000;

// Automatically screen + audio records cashier/manager POS sessions in large,
// size-capped chunks that loop continuously while the POS is open. If the
// screen or microphone share is lost, staff get a short grace period to
// resume before the POS is hard-locked. Recording can only be stopped for
// real from the admin side (SurveillanceSession.status).
export default function useAutoScreenSurveillance(user) {
  const [needsShare, setNeedsShare] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectSecondsLeft, setReconnectSecondsLeft] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);

  const displayStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const combinedStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const bytesRef = useRef(0);
  const rotatingRef = useRef(false);
  const heartbeatTimerRef = useRef(null);
  const reconnectTickRef = useRef(null);
  const reconnectDeadlineRef = useRef(null);
  const interruptedHandledRef = useRef(false);
  const activityRef = useRef([]);
  const chunkStartRef = useRef(null);
  const sessionRef = useRef(null);
  const isRecordingRef = useRef(false);

  const eligible = !!user && ["cashier", "manager"].includes(user.role);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  const refreshSession = useCallback(async (extra = {}) => {
    if (!eligible) return null;
    try {
      const res = await base44.functions.invoke("heartbeatSurveillanceSession", extra);
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

  // Warn before an accidental tab close/refresh mid-recording
  useEffect(() => {
    const handler = (e) => {
      if (!isRecordingRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

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

  const stopEverything = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      rotatingRef.current = false; // this is a real stop, not a rotation
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    [displayStreamRef.current, micStreamRef.current].forEach(s => s?.getTracks().forEach(t => t.stop()));
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    displayStreamRef.current = null;
    micStreamRef.current = null;
    combinedStreamRef.current = null;
    setIsRecording(false);
  }, []);

  const handleInterruption = useCallback((reason) => {
    if (interruptedHandledRef.current) return;
    interruptedHandledRef.current = true;
    stopEverything();
    refreshSession({ interrupted: true });
    setError(reason);
    setIsReconnecting(true);
    const deadline = Date.now() + RECONNECT_GRACE_MS;
    reconnectDeadlineRef.current = deadline;
    setReconnectSecondsLeft(Math.ceil(RECONNECT_GRACE_MS / 1000));
    if (reconnectTickRef.current) clearInterval(reconnectTickRef.current);
    reconnectTickRef.current = setInterval(() => {
      const secondsLeft = Math.max(0, Math.round((reconnectDeadlineRef.current - Date.now()) / 1000));
      setReconnectSecondsLeft(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(reconnectTickRef.current);
        reconnectTickRef.current = null;
        setIsReconnecting(false);
        setNeedsShare(true);
      }
    }, 250);
  }, [stopEverything, refreshSession]);

  const rotateChunk = useCallback(() => {
    if (rotatingRef.current) return;
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      rotatingRef.current = true;
      recorder.stop();
    }
  }, []);

  const startChunkRecording = useCallback(() => {
    const stream = combinedStreamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    activityRef.current = [];
    bytesRef.current = 0;
    const start = new Date();
    chunkStartRef.current = start.getTime();

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const hasAudio = stream.getAudioTracks().length > 0;
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 800_000,
      audioBitsPerSecond: 96_000
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size <= 0) return;
      chunksRef.current.push(e.data);
      bytesRef.current += e.data.size;
      const elapsed = Date.now() - chunkStartRef.current;
      if (bytesRef.current >= TARGET_CHUNK_BYTES || elapsed >= MAX_CHUNK_DURATION_MS) {
        rotateChunk();
      }
    };
    recorder.onerror = () => handleInterruption("A recording error occurred.");
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      saveChunk(blob, start, hasAudio);
      chunksRef.current = [];
      if (rotatingRef.current && combinedStreamRef.current) {
        rotatingRef.current = false;
        startChunkRecording();
      }
    };

    recorder.start(1000); // gather data every second so size checks stay responsive
    recorderRef.current = recorder;
  }, [saveChunk, rotateChunk, handleInterruption]);

  const startSharing = useCallback(async () => {
    setError(null);
    interruptedHandledRef.current = false;
    if (reconnectTickRef.current) { clearInterval(reconnectTickRef.current); reconnectTickRef.current = null; }
    setIsReconnecting(false);

    let displayStream = null;
    let micStream = null;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 6 }, audio: true });
      displayStreamRef.current = displayStream;

      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        throw new Error("Microphone permission is required alongside screen sharing to continue.");
      }
      micStreamRef.current = micStream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      if (displayStream.getAudioTracks().length > 0) {
        audioCtx.createMediaStreamSource(displayStream).connect(dest);
      }
      audioCtx.createMediaStreamSource(micStream).connect(dest);

      const videoTrack = displayStream.getVideoTracks()[0];
      combinedStreamRef.current = new MediaStream([videoTrack, ...dest.stream.getAudioTracks()]);

      videoTrack.onended = () => handleInterruption("Screen sharing was stopped or lost.");
      micStream.getAudioTracks()[0].onended = () => handleInterruption("Microphone access was stopped or lost.");

      setNeedsShare(false);
      setIsRecording(true);
      startChunkRecording();
      refreshSession({ recording_active: true, interrupted: false });
    } catch (err) {
      [displayStream, micStream].forEach(s => s?.getTracks().forEach(t => t.stop()));
      displayStreamRef.current = null;
      micStreamRef.current = null;
      setError(err?.message || "Screen & microphone sharing are both required to continue using the POS.");
      setIsReconnecting(false);
      setNeedsShare(true);
    }
  }, [startChunkRecording, handleInterruption, refreshSession]);

  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;

    (async () => {
      const s = await refreshSession();
      if (cancelled) return;
      if (s?.status === "active") setNeedsShare(true);
    })();

    heartbeatTimerRef.current = setInterval(async () => {
      const s = await refreshSession({ recording_active: isRecordingRef.current });
      if (!s) return;
      if (s.status === "stopped_by_admin" || s.status === "ended") {
        if (combinedStreamRef.current) stopEverything();
        setIsReconnecting(false);
        setNeedsShare(false);
      } else if (s.status === "active" && !combinedStreamRef.current && !isReconnecting) {
        setNeedsShare(true);
      }
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (reconnectTickRef.current) clearInterval(reconnectTickRef.current);
      stopEverything();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible]);

  return { eligible, needsShare, isReconnecting, reconnectSecondsLeft, isRecording, error, startSharing };
}