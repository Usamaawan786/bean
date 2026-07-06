import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Capacitor } from "@capacitor/core";
import { CapacitorBarcodeScanner } from "@capacitor/barcode-scanner";
import { X, QrCode, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function QRScanner({ onScan, onClose }) {
  // iOS App Store build runs in a WKWebView that does NOT expose
  // navigator.mediaDevices.getUserMedia (WebKit only surfaces getUserMedia to
  // WKWebView over HTTPS for browser contexts — bugs.webkit.org 188360/220184),
  // so html5-qrcode's live getUserMedia scan cannot run there. Use the official
  // @capacitor/barcode-scanner native plugin instead: it opens a full-screen
  // live AVFoundation camera, continuously scans, and auto-closes on detection,
  // feeding the decoded QR into the existing onScan → processBillScan → points
  // flow. Android WebView and the desktop browser DO expose getUserMedia, so
  // they keep the html5-qrcode live scan (unchanged).
  const useNativeScanner =
    Capacitor.isNativePlatform() && !navigator.mediaDevices?.getUserMedia;

  const onScanRef = useRef(onScan);
  const qrScannerRef = useRef(null);
  const mountedRef = useRef(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const [nativeStarting, setNativeStarting] = useState(false);

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const getScannerInstance = () => {
    if (!qrScannerRef.current) {
      qrScannerRef.current = new Html5Qrcode("qr-reader");
    }
    return qrScannerRef.current;
  };

  // Native live scan: opens the device camera full-screen, continuously scans,
  // and resolves with { ScanResult } on detection (auto-closes). Cancelling the
  // native UI rejects — close the modal.
  const startNativeScan = async () => {
    if (!mountedRef.current) return;
    setError("");
    setNativeStarting(true);
    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: 17, // ALL — receipts carry QR codes; ALL avoids hint mismatches
        cameraDirection: 1, // BACK
      });
      if (!mountedRef.current) return;
      const decoded = result?.ScanResult;
      if (decoded) {
        onScanRef.current(decoded);
      } else {
        onClose();
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = (err?.message || String(err)).toLowerCase();
      if (msg.includes("cancel") || msg.includes("user cancelled")) {
        onClose();
        return;
      }
      setError("Could not access camera. Please check permissions and try again.");
    } finally {
      if (mountedRef.current) setNativeStarting(false);
    }
  };

  // The html5-qrcode live getUserMedia scan (Android + browser) lives in
  // startScanning below. On iOS the native @capacitor/barcode-scanner live scan
  // above replaces it entirely (no getUserMedia, no single-photo fallback).

  const startScanning = async () => {
    if (!mountedRef.current) return;
    setError("");

    // Create scanner instance if needed
    if (!qrScannerRef.current) {
      const container = document.getElementById("qr-reader");
      if (!container) {
        setError("Scanner not ready. Tap retry.");
        return;
      }
      try {
        qrScannerRef.current = new Html5Qrcode("qr-reader");
      } catch (e) {
        setError("Failed to initialize scanner.");
        return;
      }
    }

    const scanner = qrScannerRef.current;
    // Stop if already scanning before restarting
    try { if (scanner.isScanning) await scanner.stop(); } catch (e) { /* ignore */ }

    const scanConfig = {
      fps: 10,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
        return { width: Math.floor(size), height: Math.floor(size) };
      },
      aspectRatio: 1.0,
    };
    const onSuccess = async (decodedText) => {
      try { await scanner.stop(); } catch (e) { /* ignore */ }
      if (mountedRef.current) setIsScanning(false);
      onScanRef.current(decodedText);
    };

    // Guard: some browsers (e.g. insecure context / older iOS Safari) expose no
    // mediaDevices API at all — surface a clear message instead of a generic crash.
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      setError("Camera isn't supported in this browser. If you installed the app via TestFlight, please update to the latest build.");
      setIsScanning(false);
      return;
    }

    // Probe with the simplest possible constraint ({ video: true }) to trigger the
    // iOS Safari permission prompt reliably. Complex facingMode:{ideal:...} syntax
    // throws an unrecognized OverconstrainedError on iOS Safari, which previously
    // fell through to a generic "Could not access camera" message. After the probe
    // we still resolve a rear deviceId when available for html5-qrcode.
    let cameraTarget = { facingMode: "environment" };
    try {
      const probeStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = probeStream.getVideoTracks()[0];
      const settings = track?.getSettings?.() || {};
      const deviceId = settings.deviceId;
      probeStream.getTracks().forEach((t) => t.stop());
      if (deviceId) cameraTarget = deviceId;
    } catch (e) {
      if (!mountedRef.current) return;
      const msg = (e?.message || String(e)).toLowerCase();
      if (msg.includes("permission") || msg.includes("notallowed") || msg.includes("denied")) {
        setError("Camera access was denied. Please allow camera access when prompted, then tap Retry.");
        setIsScanning(false);
        return;
      }
      // Other errors (no camera, insecure context, etc.) — fall through to attempts
    }

    // Try the resolved target first, then automatically fall back through progressively
    // looser constraints — no manual user action required for these fallbacks.
    const attempts = [cameraTarget, { facingMode: "environment" }, { video: true }];
    let lastErr = null;
    for (const target of attempts) {
      try {
        await scanner.start(target, scanConfig, onSuccess, () => {});
        if (mountedRef.current) setIsScanning(true);
        return;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!mountedRef.current) return;
    const msg = (lastErr?.message || String(lastErr)).toLowerCase();
    if (msg.includes("permission") || msg.includes("notallowed") || msg.includes("denied")) {
      setError("Camera access was denied. Please allow camera access when prompted, then tap Retry.");
    } else if (msg.includes("notfounderror") || msg.includes("no camera") || msg.includes("requested device not found")) {
      setError("No camera found on this device.");
    } else if (msg.includes("notreadableerror") || msg.includes("could not start") || msg.includes("already in use")) {
      setError("Camera is busy. Close other apps using the camera and tap Retry.");
    } else {
      setError("Could not access camera. Please check permissions and tap Retry.");
    }
    setIsScanning(false);
  };

  useEffect(() => {
    // iOS native: launch the native live scanner immediately on open — the
    // native camera IS the UI (full-screen, continuous, auto-close on detect).
    if (useNativeScanner) {
      startNativeScan();
      return;
    }
    // Android / browser: delay start to let the modal animation finish and
    // the container render with dimensions, then run the html5-qrcode live scan.
    const timer = setTimeout(startScanning, 700);
    return () => {
      clearTimeout(timer);
      try {
        if (qrScannerRef.current?.isScanning) qrScannerRef.current.stop();
      } catch (e) { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = async () => {
    try {
      if (qrScannerRef.current?.isScanning) await qrScannerRef.current.stop();
    } catch (e) { /* ignore */ }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-[#8B7355]" />
            <h2 className="text-lg font-bold text-[#5C4A3A]">Scan Bill QR Code</h2>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-[#F5EBE8] rounded-full transition-colors">
            <X className="h-5 w-5 text-[#8B7355]" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Container needs explicit min dimensions for html5-qrcode to initialize (web/Android live scan) */}
          <div
            id="qr-reader"
            className="rounded-2xl overflow-hidden border-4 border-[#E8DED8] bg-black"
            style={useNativeScanner ? { display: "none" } : { minHeight: 300, width: "100%" }}
          />

          {useNativeScanner ? (
            <div className="text-center py-4">
              {error ? (
                <Button onClick={startNativeScan} className="w-full bg-[#8B7355] hover:bg-[#6B5744] rounded-xl">
                  <RefreshCw className="h-4 w-4 mr-2" /> Retry
                </Button>
              ) : (
                <p className="text-sm text-[#8B7355] flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Opening camera…
                </p>
              )}
            </div>
          ) : !isScanning ? (
            <Button onClick={startScanning} className="w-full bg-[#8B7355] hover:bg-[#6B5744] rounded-xl">
              <RefreshCw className="h-4 w-4 mr-2" />
              {error ? "Retry" : "Start Scanning"}
            </Button>
          ) : (
            <Button
              onClick={async () => {
                try { if (qrScannerRef.current?.isScanning) await qrScannerRef.current.stop(); } catch (e) {}
                setIsScanning(false);
              }}
              variant="outline"
              className="w-full rounded-xl border-[#E8DED8]"
            >
              Stop Scanning
            </Button>
          )}

          <div className="bg-[#F5EBE8] rounded-2xl p-4 text-center">
            <p className="text-sm text-[#5C4A3A]">Point your camera at the QR code on your receipt to earn reward points!</p>
            <p className="text-xs text-[#8B7355] mt-2">Collect points with every purchase</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}