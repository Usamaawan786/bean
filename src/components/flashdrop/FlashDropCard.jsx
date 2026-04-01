import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Coffee, Zap, Users, X, ScanLine, ShieldCheck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import QRCode from "qrcode";

export default function FlashDropCard({ drop, currentUserEmail, onClaim }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claim, setClaim] = useState(null);
  const [claimLoaded, setClaimLoaded] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [dropExpired, setDropExpired] = useState(false);

  const isActive = drop.status === "active";
  const isUpcoming = drop.status === "upcoming";
  const isEnded = drop.status === "ended" || (drop.items_remaining !== undefined && drop.items_remaining <= 0);

  const loadClaim = useCallback(async () => {
    if (!currentUserEmail || !drop.id) { setClaimLoaded(true); return; }
    try {
      const claims = await base44.entities.FlashDropClaim.filter({ drop_id: drop.id, user_email: currentUserEmail });
      if (claims.length > 0) {
        const c = claims[0];
        setClaim(c);
        const url = await QRCode.toDataURL(c.qr_code, {
          width: 220,
          margin: 2,
          color: { dark: "#5C4A3A", light: "#FFFFFF" },
        });
        setQrDataUrl(url);
      }
    } catch {}
    setClaimLoaded(true);
  }, [currentUserEmail, drop.id]);

  useEffect(() => {
    if (currentUserEmail) loadClaim();
    else setClaimLoaded(true);
  }, [loadClaim, currentUserEmail]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const target = isUpcoming ? new Date(drop.start_time) : new Date(drop.end_time);
      const diff = target - now;
      if (isActive && diff <= 0) { setDropExpired(true); setTimeLeft("Ended"); return; }
      if (diff <= 0) { setTimeLeft(isUpcoming ? "Starting now!" : "Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [drop, isUpcoming, isActive]);

  const handleClaim = async () => {
    if (!currentUserEmail) return;
    setIsClaiming(true);
    await onClaim(drop);
    await loadClaim();
    setIsClaiming(false);
    setShowQR(true);
  };

  const isQRValid = claim && !claim.is_redeemed && isActive && !dropExpired && !isEnded;
  const hasClaimed = !!claim || drop.claimed_by?.includes(currentUserEmail);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative rounded-3xl overflow-hidden shadow-lg ${isActive ? "ring-2 ring-[#C9B8A6] ring-offset-2" : ""}`}
      >
        {isActive && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-r from-[#D4C4B0]/20 to-[#C9B8A6]/20 pointer-events-none"
          />
        )}

        <div className="relative bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white p-6">
          {isActive && (
            <div className="bg-red-500 px-3 py-1 rounded-full absolute top-4 right-4 flex items-center gap-1.5">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }} className="h-2 w-2 rounded-full bg-white" />
              <span className="text-xs font-bold uppercase">Live</span>
            </div>
          )}
          {isUpcoming && (
            <div className="absolute top-4 right-4 bg-[#C9B8A6] px-3 py-1 rounded-full">
              <span className="text-xs font-bold uppercase">Upcoming</span>
            </div>
          )}

          <div className="my-4 flex items-start gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-[#D4C4B0] to-[#C9B8A6] p-3">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{drop.title}</h3>
              <p className="text-[#E8DED8] text-sm mt-1">{drop.description}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-[#E8DED8]">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{drop.location_name || drop.location}</span>
            </div>
            <div className="flex items-center gap-2 text-[#E8DED8]">
              <Coffee className="h-4 w-4" />
              <span className="text-sm">{drop.items_remaining || 0} / {drop.total_items} left</span>
            </div>
            <div className="flex items-center gap-2 text-[#E8DED8]">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{isUpcoming ? "Starts in " : isActive ? "Ends in " : ""}{timeLeft}</span>
            </div>
            <div className="flex items-center gap-2 text-[#E8DED8]">
              <Users className="h-4 w-4" />
              <span className="text-sm">{drop.claimed_by?.length || 0} claimed</span>
            </div>
          </div>

          <div className="mt-6">
            {!claimLoaded ? (
              <div className="flex justify-center py-2">
                <div className="h-5 w-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              </div>
            ) : claim?.is_redeemed ? (
              <div className="flex items-center justify-center gap-2 bg-green-500/20 border border-green-400/30 text-white py-3 rounded-xl">
                <ShieldCheck className="h-5 w-5" />
                <span className="font-semibold">Flash Drop Redeemed ✓</span>
              </div>
            ) : isQRValid ? (
              <Button
                onClick={() => setShowQR(true)}
                className="w-full rounded-xl bg-white text-[#5C4A3A] hover:bg-[#F5F1ED] font-bold py-3 gap-2"
              >
                <ScanLine className="h-5 w-5" /> Show My QR Code
              </Button>
            ) : hasClaimed && (isEnded || dropExpired) ? (
              <div className="flex items-center justify-center gap-2 bg-white/10 text-[#E8DED8] py-3 rounded-xl">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold text-sm">Drop Ended · QR Expired</span>
              </div>
            ) : isEnded ? (
              <Button disabled className="w-full rounded-xl bg-[#8B7355]/30 text-[#D4C4B0]">Drop Ended</Button>
            ) : isUpcoming ? (
              <Button disabled className="w-full rounded-xl bg-[#8B7355]/30 text-[#E8DED8]">
                <Clock className="h-4 w-4 mr-2" />Starts {format(new Date(drop.start_time), "h:mm a")}
              </Button>
            ) : (
              <Button
                onClick={handleClaim}
                disabled={isClaiming || !currentUserEmail || (drop.items_remaining !== undefined && drop.items_remaining <= 0)}
                className="w-full rounded-xl bg-gradient-to-r from-[#D4C4B0] to-[#C9B8A6] hover:from-[#C9B8A6] hover:to-[#B8AFA4] text-[#5C4A3A] font-bold py-3"
              >
                {isClaiming ? "Claiming..." : "Claim Your Free Coffee! ☕"}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && claim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowQR(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-[#5C4A3A] text-lg">{drop.title}</h3>
                <p className="text-xs text-[#8B7355] mt-1">Show this to the barista at the counter</p>
              </div>

              {claim.is_redeemed ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                  <ShieldCheck className="h-10 w-10 text-green-500 mx-auto mb-2" />
                  <p className="text-green-700 font-bold">Already Redeemed</p>
                  <p className="text-xs text-green-500 mt-1">You've successfully claimed this drop.</p>
                </div>
              ) : isQRValid && qrDataUrl ? (
                <>
                  <div className="bg-[#F9F6F3] rounded-2xl p-4 mb-3 flex items-center justify-center">
                    <img src={qrDataUrl} alt="Flash Drop QR" className="w-52 h-52" />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                    <p className="text-xs text-amber-700 font-semibold">⏰ Valid while drop is live · {timeLeft} left</p>
                  </div>
                  <p className="font-mono text-[10px] text-[#C9B8A6] break-all">{claim.qr_code}</p>
                </>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                  <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-2" />
                  <p className="text-red-600 font-bold">QR Code Expired</p>
                  <p className="text-xs text-red-400 mt-1">This drop has ended.</p>
                </div>
              )}

              <button
                onClick={() => setShowQR(false)}
                className="w-full mt-4 text-sm text-[#8B7355] font-semibold py-2 rounded-xl hover:bg-[#F5EBE8] transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}