import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

const TOKEN_KEY = "bean_fcm_token";
const PLATFORM_KEY = "bean_fcm_platform";

async function saveToken(token, platform) {
  try {
    await base44.functions.invoke('saveDeviceToken', { token, platform });
    console.log("[Push] Token saved successfully");
    return true;
  } catch (err) {
    console.error("[Push] Failed to save token:", err?.message || err);
    return false;
  }
}

export default function usePushNotifications() {
  const savedRef = useRef(false);

  // Retry saving stored token — handles both fresh installs (no user yet) and re-logins
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    const platform = localStorage.getItem(PLATFORM_KEY);
    if (!stored || !platform) return;

    console.log('[Push] Found stored token, will retry saving for platform:', platform);

    // Try at multiple intervals to catch post-login state
    const attempts = [500, 2000, 5000, 10000, 20000, 40000];
    const timers = attempts.map(delay =>
      setTimeout(async () => {
        if (savedRef.current) return;
        console.log('[Push] Retry attempt at', delay, 'ms...');
        const ok = await saveToken(stored, platform);
        if (ok) {
          savedRef.current = true;
          console.log('[Push] Token saved successfully on retry at', delay, 'ms');
        }
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const register = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        console.log("[Push] platform:", Capacitor.getPlatform());

        if (!Capacitor.isNativePlatform()) {
          console.log("[Push] Not native, skipping");
          return;
        }

        const { PushNotifications } = await import("@capacitor/push-notifications");
        await PushNotifications.removeAllListeners();

        const permStatus = await PushNotifications.checkPermissions();
        console.log("[Push] Permission status:", permStatus.receive);

        let finalStatus = permStatus.receive;
        if (finalStatus === "prompt" || finalStatus === "prompt-with-rationale") {
          const result = await PushNotifications.requestPermissions();
          finalStatus = result.receive;
          console.log("[Push] Permission result:", finalStatus);
        }

        if (finalStatus !== "granted") {
          console.log("[Push] Permission denied:", finalStatus);
          return;
        }

        PushNotifications.addListener("registration", async (tokenData) => {
          const token = tokenData.value;
          console.log("[Push] FCM token received:", token ? token.substring(0, 40) + "..." : "EMPTY");
          if (!token) return;

          const platform = Capacitor.getPlatform();

          // Persist token locally so we can retry if backend save fails
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(PLATFORM_KEY, platform);

          const ok = await saveToken(token, platform);
          if (ok) savedRef.current = true;
        });

        PushNotifications.addListener("registrationError", (err) => {
          console.error("[Push] Registration ERROR:", JSON.stringify(err));
        });

        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("[Push] Foreground notification:", JSON.stringify(notification));
        });

        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          console.log("[Push] Notification tapped:", JSON.stringify(action));
          const deepLink = action.notification?.data?.deep_link;
          if (deepLink) window.location.hash = deepLink;
        });

        await PushNotifications.register();
        console.log("[Push] register() called, waiting for token...");

      } catch (e) {
        console.error("[Push] Registration error:", e);
      }
    };

    register();
  }, []);
}