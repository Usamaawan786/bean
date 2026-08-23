import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { isStaff2FAVerified, setStaff2FAVerified } from "@/lib/staff2FA";
import { Shield, Loader2, KeyRound, Mail } from "lucide-react";
import { motion } from "framer-motion";

// Wraps staff-only content. If the current staff member hasn't completed 2FA
// for this session, shows a one-time-code challenge instead of the children.
// On success the verified flag is stored (per email) in sessionStorage and the
// children render. The flag is cleared on logout / tab close so 2FA is required
// again next time.
export default function Staff2FAGate({ user, children }) {
  const [verified, setVerified] = useState(() => isStaff2FAVerified(user?.email));
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);
  const issuedRef = useRef(false);
  const cooldownRef = useRef(null);

  const startCooldown = () => {
    setCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const issue = async () => {
    setIssuing(true);
    setError("");
    try {
      await base44.functions.invoke("issueStaff2FA", {});
      setSent(true);
      startCooldown();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to send code");
    } finally {
      setIssuing(false);
    }
  };

  useEffect(() => {
    if (!verified && !issuedRef.current) {
      issuedRef.current = true;
      issue();
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified]);

  const handleVerify = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await base44.functions.invoke("verifyStaff2FA", { code });
      if (res.data?.ok) {
        setStaff2FAVerified(user.email);
        setVerified(true);
      } else {
        setError(res.data?.error || "Incorrect code");
        setCode("");
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Verification failed");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => base44.auth.logout("/staff");

  if (verified) return children;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="w-16 h-16 bg-amber-400/10 border-2 border-amber-400/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Shield className="h-8 w-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Two-Factor Verification</h1>
        <p className="text-gray-400 text-sm text-center leading-relaxed mb-6">
          For security, confirm it's you before opening the staff portal.
          {sent ? (
            <>
              <br />
              <span className="inline-flex items-center gap-1.5 text-amber-400 mt-2">
                <Mail className="h-3.5 w-3.5" /> A 6-digit code was sent to {user?.email}
              </span>
            </>
          ) : null}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-3 py-2 mb-4 text-center">
            {error}
          </div>
        )}

        <div className="relative mb-4">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && code.length === 6 && handleVerify()}
            placeholder="••••••"
            className="w-full bg-gray-900 border border-gray-800 focus:border-amber-400 rounded-2xl pl-10 pr-4 py-4 text-center text-2xl tracking-[0.5em] font-bold outline-none transition-colors"
          />
        </div>

        <button
          onClick={handleVerify}
          disabled={busy || code.length !== 6}
          className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-gray-950 font-bold py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Continue →"}
        </button>

        <div className="flex items-center justify-between mt-4 text-xs">
          <button
            onClick={issue}
            disabled={issuing || cooldown > 0}
            className="text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {issuing ? "Sending…" : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
          <button onClick={handleSignOut} className="text-gray-500 hover:text-gray-300 underline">
            Sign out
          </button>
        </div>
      </motion.div>
    </div>
  );
}