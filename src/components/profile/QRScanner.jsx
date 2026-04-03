import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, QrCode, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function QRScanner({ onScan, onClose }) {
  const onScanRef = useRef(onScan);
  const qrScannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  const startScanning = async (qrScanner) => {
    const instance = qrScanner || qrScannerRef.current;
    if (!instance) return;
    try {
      setIsScanning(true);
      setError("");
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          try { await instance.stop(); } catch (e) { /* ignore */ }
          setIsScanning(false);
          onScanRef.current(decodedText);
        },
        () => {}
      );
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        setError("Camera permission required. Please enable it in your browser settings.");
      } else if (msg.includes("NotFoundError") || msg.includes("No camera")) {
        setError("No camera found on this device.");
      } else {
        setError("Failed to start camera. Tap 'Start Scanning' to retry.");
      }
      setIsScanning(false);
    }
  };

  useEffect(() => {
    const qrScanner = new Html5Qrcode("qr-reader");
    qrScannerRef.current = qrScanner;

    // Auto-start on mount
    startScanning(qrScanner);

    return () => {
      try {
        if (qrScanner.isScanning) qrScanner.stop();
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div id="qr-reader" className="rounded-2xl overflow-hidden border-4 border-[#E8DED8]" />

          {!isScanning ? (
            <Button onClick={() => startScanning()} className="w-full bg-[#8B7355] hover:bg-[#6B5744] rounded-xl">
              Start Scanning
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