import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function usePushNotifications() {
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

        // Remove any stale listeners first to avoid duplicates
        await PushNotifications.removeAllListeners();

        // Check/request permissions
        const permStatus = await PushNotifications.checkPermissions();
        console.log("[Push] Permission status:", permStatus.receive);

        let finalStatus = permStatus.receive;
        if (finalStatus === "prompt" || finalStatus === "prompt-with-rationale") {
          const result = await PushNotifications.requestPermissions();
          finalStatus = result.receive;
          console.log("[Push] Permission granted:", finalStatus);
        }

        if (finalStatus !== "granted") {
          console.log("[Push] Permission denied");
          return;
        }

        // Attach listeners BEFORE register()
        PushNotifications.addListener("registration", async (tokenData) => {
          const token = tokenData.value;
          console.log("[Push] FCM token received:", token ? token.substring(0, 30) + "..." : "EMPTY");
          if (!token) return;

          const platform = Capacitor.getPlatform();
          try {
            await base44.functions.invoke('saveDeviceToken', { token, platform });
            console.log("[Push] Token saved successfully");
          } catch (err) {
            console.error("[Push] Failed to save token:", err);
          }
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