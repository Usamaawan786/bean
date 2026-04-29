import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

const TOKEN_KEY = "bean_fcm_token";
const PLATFORM_KEY = "bean_fcm_platform";

async function saveToken(token, platform, userEmail) {
  try {
    const payload = { token, platform };
    if (userEmail) payload.user_email = userEmail;
    const res = await base44.functions.invoke('saveDeviceToken', payload);
    console.log("[Push] Token saved, user_email:", res?.data?.user_email || 'none');
    return res?.data?.user_email || null;
  } catch (err) {
    console.error("[Push] Failed to save token:", err?.message || err);
    return null;
  }
}

async function saveTokenWithRetry(token, platform, retries = 5, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    // Try to get user email from auth
    let userEmail = null;
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const u = await base44.auth.me();
        userEmail = u?.email || null;
      }
    } catch (_) {}

    const email = await saveToken(token, platform, userEmail);
    if (email) {
      console.log("[Push] Token saved with user email:", email);
      return email;
    }
    console.log(`[Push] No user email yet, retrying in ${delayMs}ms (attempt ${i + 1}/${retries})...`);
    await new Promise(r => setTimeout(r, delayMs));
  }
  console.warn("[Push] Could not associate token with user after retries");
  return null;
}

export default function usePushNotifications() {
  // On every mount: re-save stored token to attach user email if not already set
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    const platform = localStorage.getItem(PLATFORM_KEY);
    if (!stored || !platform) return;

    console.log('[Push] Found stored token, re-saving to sync user email...');
    // Wait for auth to be ready before attempting to link the token
    const attemptResave = async () => {
      for (let i = 0; i < 10; i++) {
        try {
          const isAuth = await base44.auth.isAuthenticated();
          if (isAuth) {
            console.log('[Push] User authenticated, re-saving token now...');
            await saveTokenWithRetry(stored, platform, 5, 2000);
            return;
          }
        } catch (e) {
          // ignore
        }
        console.log(`[Push] Not authenticated yet, waiting... (attempt ${i + 1}/10)`);
        await new Promise(r => setTimeout(r, 2000));
      }
      console.warn('[Push] Could not confirm auth for token re-save');
    };
    attemptResave();
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
          console.log("[Push] Token stored in localStorage, attempting save with retry...");

          await saveTokenWithRetry(token, platform);
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
          if (deepLink) {
            // Navigate to the deep link path using React Router compatible navigation
            window.location.href = deepLink.startsWith("http") ? deepLink : window.location.origin + deepLink;
          }
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