import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, ScanLine, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function FlashDropScannerModal({ onClose, onRedeemed }) {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState(null); // { status: "success"|"already_used"|"not_found", claim, message }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let html5Qr;
    const startScanner = async () => {
      html5Qr = new Html5Qrcode("fd-qr-reader");
      scannerRef.current = html5Qr;
      try {
        await html5Qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          handleScan,
          () => {}
        );
      } catch {
        toast.error("Camera access denied or not available.");
        onClose();
      }
    };
    startScanner();
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
    }
    setScanning(false);
  };

  const handleScan = async (qrCode) => {
    if (loading || !scanning) return;
    if (!qrCode.startsWith("FD-")) return; // ignore non-flash-drop QR codes
    await stopScanner();
    setLoading(true);

    const claims = await base44.entities.FlashDropClaim.filter({ qr_code: qrCode });
    if (claims.length === 0) {
      setResult({ status: "not_found", message: "QR code not recognised. Do NOT honour." });
      setLoading(false);
      return;
    }

    const claim = claims[0];
    if (claim.is_redeemed) {
      setResult({ status: "already_used", claim, message: "Already redeemed! Do NOT honour again." });
      setLoading(false);
      return;
    }

    // Mark as redeemed
    await base44.entities.FlashDropClaim.update(claim.id, { is_redeemed: true });
    setResult({ status: "success", claim: { ...claim, is_redeemed: true }, message: "Valid — Redeemed successfully!" });
    setLoading(false);
    onRedeemed && onRedeemed({ ...claim, is_redeemed: true });
    toast.success("Flash drop QR redeemed!");
  };

  const handleReset = async () => {
    setResult(null);
    setLoading(false);
    setScanning(true);
    // restart scanner
    if (scannerRef.current) {
      try {
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          handleScan,
          () => {}
        );
      } catch {}
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8B7355] to-[#6B5744] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            <span className="font-bold">Scan Flash Drop QR</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Camera view */}
          {scanning && !result && (
            <>
              <p className="text-sm text-[#8B7355] text-center mb-3">Point camera at customer's flash drop QR code</p>
              <div className="rounded-2xl overflow-hidden bg-black relative" style={{ minHeight: 280 }}>
                <div id="fd-qr-reader" className="w-full" />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="border-2 border-white/60 rounded-xl w-56 h-56" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)" }} />
                </div>
              </div>
            </>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-10 w-10 animate-spin text-[#8B7355]" />
              <p className="text-sm text-[#8B7355]">Verifying QR code...</p>
            </div>
          )}

          {result && !loading && (
            <div className="py-2">
              {result.status === "success" && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-9 w-9 text-green-500" />
                  </div>
                  <h3 className="font-bold text-green-700 text-lg mb-1">✅ Valid — Honour This!</h3>
                  <p className="text-sm text-green-600 mb-4">{result.message}</p>
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-left space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#8B7355]">Customer</span>
                      <span className="font-semibold text-[#5C4A3A]">{result.claim.user_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8B7355]">Drop</span>
                      <span className="font-semibold text-[#5C4A3A]">{result.claim.drop_title || "Flash Drop"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8B7355]">QR Code</span>
                      <span className="font-mono text-xs text-[#5C4A3A]">{result.claim.qr_code}</span>
                    </div>
                  </div>
                </div>
              )}

              {result.status === "already_used" && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="h-9 w-9 text-red-500" />
                  </div>
                  <h3 className="font-bold text-red-700 text-lg mb-1">⚠️ Already Redeemed</h3>
                  <p className="text-sm text-red-600 mb-4">Do NOT honour this again.</p>
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-left text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#8B7355]">Customer</span>
                      <span className="font-semibold text-[#5C4A3A]">{result.claim.user_email}</span>
                    </div>
                  </div>
                </div>
              )}

              {result.status === "not_found" && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <XCircle className="h-9 w-9 text-gray-400" />
                  </div>
                  <h3 className="font-bold text-gray-700 text-lg mb-1">❌ Not Found</h3>
                  <p className="text-sm text-gray-500">{result.message}</p>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <Button onClick={handleReset} variant="outline" className="flex-1 rounded-xl border-[#E8DED8]">
                  Scan Another
                </Button>
                <Button onClick={onClose} className="flex-1 rounded-xl bg-[#5C4A3A] hover:bg-[#4A3829]">
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}