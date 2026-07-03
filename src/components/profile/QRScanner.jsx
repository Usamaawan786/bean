import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, QrCode, AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function QRScanner({ onScan, onClose }) {
  const onScanRef = useRef(onScan);
  const qrScannerRef = useRef(null);
  const mountedRef = useRef(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => () => { mountedRef.current = false; }, []);

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

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
            return { width: Math.floor(size), height: Math.floor(size) };
          },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          try { await scanner.stop(); } catch (e) { /* ignore */ }
          if (mountedRef.current) setIsScanning(false);
          onScanRef.current(decodedText);
        },
        () => {}
      );
      if (mountedRef.current) setIsScanning(true);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = (err?.message || String(err)).toLowerCase();
      if (msg.includes("permission") || msg.includes("notallowed") || msg.includes("denied")) {
        setError("Camera access denied. Please allow camera permission in your browser or device settings, then tap Retry.");
      } else if (msg.includes("notfounderror") || msg.includes("no camera") || msg.includes("requested device not found")) {
        setError("No camera found on this device.");
      } else if (msg.includes("notreadableerror") || msg.includes("could not start") || msg.includes("already in use")) {
        setError("Camera is busy. Close other apps using the camera and tap Retry.");
      } else {
        setError("Could not access camera. Please check permissions and tap Retry.");
      }
      setIsScanning(false);
    }
  };

  useEffect(() => {
    // Delay start to let the modal animation finish and container render with dimensions
    const timer = setTimeout(startScanning, 700);

    return () => {
      clearTimeout(timer);
      try {
        if (qrScannerRef.current?.isScanning) qrScannerRef.current.stop();
      } catch (e) { /* ignore */ }
    };
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
          {/* Container needs explicit min dimensions for html5-qrcode to initialize */}
          <div
            id="qr-reader"
            className="rounded-2xl overflow-hidden border-4 border-[#E8DED8] bg-black"
            style={{ minHeight: 300, width: "100%" }}
          />

          {!isScanning ? (
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