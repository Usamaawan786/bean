import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

const TOKEN_KEY = "bean_fcm_token";
const PLATFORM_KEY = "bean_fcm_platform";

async function saveToken(token, platform) {
  try {
    const res = await base44.functions.invoke('saveDeviceToken', { token, platform });
    console.log("[Push] Token saved successfully for platform:", platform, "res:", JSON.stringify(res?.data));
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
        const platform = Capacitor.getPlatform();
        console.log("[Push] ===== Push Registration Start =====");
        console.log("[Push] Platform:", platform);
        console.log("[Push] isNativePlatform:", Capacitor.isNativePlatform());

        if (!Capacitor.isNativePlatform()) {
          console.log("[Push] Not native, skipping");
          return;
        }

        const { PushNotifications } = await import("@capacitor/push-notifications");
        console.log("[Push] PushNotifications loaded, removing old listeners...");
        await PushNotifications.removeAllListeners();

        // Create notification channel for Android 8+ (required for notifications to show)
        if (platform === "android") {
          try {
            await PushNotifications.createChannel({
              id: "default",
              name: "Default Notifications",
              description: "Bean app notifications",
              importance: 5, // IMPORTANCE_HIGH
              visibility: 1, // PUBLIC
              sound: "default",
              vibration: true,
              lights: true,
            });
            console.log("[Push] Android notification channel created");
          } catch (e) {
            console.log("[Push] Channel creation error (may already exist):", e.message);
          }
        }

        // Register listeners BEFORE calling register()
        PushNotifications.addListener("registration", async (tokenData) => {
          const token = tokenData.value;
          console.log("[Push] ===== TOKEN RECEIVED =====");
          console.log("[Push] Platform:", platform);
          console.log("[Push] Token (first 50):", token ? token.substring(0, 50) + "..." : "EMPTY/NULL");
          console.log("[Push] Token length:", token ? token.length : 0);
          if (!token) {
            console.error("[Push] Token is empty, aborting save");
            return;
          }

          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(PLATFORM_KEY, platform);
          console.log("[Push] Token stored in localStorage, attempting save...");

          const ok = await saveToken(token, platform);
          if (ok) savedRef.current = true;
        });

        PushNotifications.addListener("registrationError", (err) => {
          console.error("[Push] ===== REGISTRATION ERROR =====");
          console.error("[Push] Error details:", JSON.stringify(err));
        });

        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("[Push] Foreground notification:", JSON.stringify(notification));
          // Force-display on Android when app is in foreground
          if (platform === "android" && "Notification" in window && Notification.permission === "granted") {
            new Notification(notification.title || "Bean", {
              body: notification.body || "",
              icon: "/icons/icon-192.png",
            });
          }
        });

        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          console.log("[Push] Notification tapped:", JSON.stringify(action));
          const deepLink = action.notification?.data?.deep_link;
          if (deepLink) window.location.hash = deepLink;
        });

        const permStatus = await PushNotifications.checkPermissions();
        console.log("[Push] Permission status:", permStatus.receive);

        let finalStatus = permStatus.receive;
        // On Android < 13, permission is auto-granted
        if (finalStatus === "prompt" || finalStatus === "prompt-with-rationale") {
          console.log("[Push] Requesting permission...");
          const result = await PushNotifications.requestPermissions();
          finalStatus = result.receive;
          console.log("[Push] Permission result:", finalStatus);
        }

        if (finalStatus !== "granted") {
          console.log("[Push] Permission denied:", finalStatus);
          return;
        }

        console.log("[Push] Permission granted, calling register()...");
        await PushNotifications.register();
        console.log("[Push] register() called, waiting for token callback...");

      } catch (e) {
        console.error("[Push] Registration error:", e);
      }
    };

    register();
  }, []);
}