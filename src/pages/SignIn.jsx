import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Coffee } from "lucide-react";

export default function SignIn() {
  useEffect(() => {
    base44.auth.isAuthenticated().then((auth) => {
      if (auth) {
        window.location.href = createPageUrl("Home");
      } else {
        base44.auth.redirectToLogin(createPageUrl("Home"));
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center">
      <Coffee className="h-10 w-10 text-[var(--accent-primary)] animate-pulse" />
      <p className="mt-4 text-[var(--text-secondary)] text-sm">Redirecting to sign in...</p>
    </div>
  );
}