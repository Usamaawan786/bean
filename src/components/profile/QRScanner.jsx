import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, QrCode, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export default function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    const qrScanner = new Html5Qrcode("qr-reader");
    setScanner(qrScanner);

    return () => {
      if (qrScanner.isScanning) {
        qrScanner.stop();
      }
    };
  }, []);

  const startScanning = async () => {
    if (!scanner) return;

    try {
      setIsScanning(true);
      setError("");
      setPermissionDenied(false);

      // Try to start scanner directly
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          // Stop scanner immediately
          await scanner.stop();
          setIsScanning(false);

          // Process the scanned QR code
          onScan(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors, they happen frequently
        }
      );
    } catch (err) {
      console.error("Scanner error:", err);
      const errorMsg = err?.message || String(err);

      // Handle permission errors
      if (errorMsg.includes("Permission") || errorMsg.includes("NotAllowedError") || errorMsg.includes("denied")) {
        setError("Camera permission required. Enable it in settings or upload an image instead.");
        setPermissionDenied(true);
      } else if (errorMsg.includes("NotFoundError") || errorMsg.includes("No camera")) {
        setError("No camera found. Please upload an image instead.");
        setPermissionDenied(true);
      } else {
        setError("Failed to start camera. Please upload an image instead.");
        setPermissionDenied(true);
      }
      setIsScanning(false);
    }
  };

  const handleImageUpload = async () => {
    if (!scanner) return;

    // Stop scanning if active
    if (isScanning) {
      await stopScanning();
    }

    try {
      setError("");

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (!image.webPath) return;

      // Fetch the file to pass to html5-qrcode
      const response = await fetch(image.webPath);
      const blob = await response.blob();
      const file = new File([blob], `scan_${Date.now()}.${image.format}`, { type: blob.type });

      const decodedText = await scanner.scanFile(file, true);
      onScan(decodedText);
    } catch (err) {
      if (err.message && err.message.includes("User cancelled")) return;

      console.error("QR scan error:", err);
      if (err.message && err.message.includes("No QR code found")) {
        setError("No QR code found in the image. Please try another image.");
      } else if (err.message && err.message.includes("Permission")) {
        setError("Gallery permission denied.");
        toast.error("Gallery permission required to scan images.");
      } else {
        setError("Failed to scan image. Please try again.");
      }
    }
  };

  const stopScanning = async () => {
    if (scanner && isScanning) {
      await scanner.stop();
      setIsScanning(false);
    }
  };

  const handleClose = async () => {
    await stopScanning();
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
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[#F5EBE8] rounded-full transition-colors"
          >
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
          <div
            id="qr-reader"
            className="rounded-2xl overflow-hidden border-4 border-[#E8DED8]"
          />

          {!isScanning ? (
            <>
              <Button
                onClick={startScanning}
                className="w-full bg-[#8B7355] hover:bg-[#6B5744] rounded-xl"
              >
                Start Scanning
              </Button>

              <div className="relative mt-2">
                <Button
                  onClick={handleImageUpload}
                  variant="outline"
                  className="w-full rounded-xl border-[#8B7355] text-[#8B7355] hover:bg-[#F5EBE8]"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image Instead
                </Button>
              </div>
            </>
          ) : (
            <Button
              onClick={stopScanning}
              variant="outline"
              className="w-full rounded-xl border-[#E8DED8]"
            >
              Stop Scanning
            </Button>
          )}

          <div className="bg-[#F5EBE8] rounded-2xl p-4 text-center">
            <p className="text-sm text-[#5C4A3A]">
              Point your camera at the QR code on your receipt to earn rewards points!
            </p>
            <p className="text-xs text-[#8B7355] mt-2">
              Collect points with every purchase
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}