import { Monitor, ShieldAlert, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import useAutoScreenSurveillance from "@/hooks/useAutoScreenSurveillance";

// Wraps the POS UI for cashiers/managers: blocks access until they share their
// screen + mic for recording. A short grace period lets them recover from a
// dropped share before being hard-locked. Only an admin can turn this off.
export default function ScreenShareGate({ user, children }) {
  const { eligible, needsShare, isReconnecting, reconnectSecondsLeft, isRecording, error, startSharing } = useAutoScreenSurveillance(user);

  if (eligible && isReconnecting) {
    return (
      <div className="min-h-screen bg-[#1a1612] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl">
          <div className="bg-amber-50 rounded-2xl p-4 inline-flex mb-4">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-[#5C4A3A] mb-2">Reconnect Recording</h2>
          <p className="text-sm text-[#8B7355] mb-2">{error || "Screen or microphone sharing was interrupted."}</p>
          <p className="text-sm font-semibold text-amber-600 mb-6">
            POS access will be suspended in {reconnectSecondsLeft}s unless you resume sharing.
          </p>
          <Button onClick={startSharing} className="w-full bg-[#8B7355] hover:bg-[#6B5744] gap-2">
            <Monitor className="h-4 w-4" /> Resume Sharing Now
          </Button>
        </div>
      </div>
    );
  }

  if (eligible && needsShare) {
    return (
      <div className="min-h-screen bg-[#1a1612] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl">
          <div className="bg-red-50 rounded-2xl p-4 inline-flex mb-4">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-[#5C4A3A] mb-2">Screen & Microphone Recording Required</h2>
          <p className="text-sm text-[#8B7355] mb-6">
            For security, this POS session must be screen and audio recorded while in use.
            Click below to share your screen and microphone to continue. This cannot be turned off from this device — only an admin can stop it.
          </p>
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <Button onClick={startSharing} className="w-full bg-[#8B7355] hover:bg-[#6B5744] gap-2">
            <Monitor className="h-4 w-4" /> Share Screen & Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {eligible && isRecording && (
        <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" /> REC
        </div>
      )}
      {children}
    </>
  );
}