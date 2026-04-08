import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function usePushNotifications() {
  useEffect(() => {
    const register = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        console.log("[Push] isNativePlatform:", Capacitor.isNativePlatform());
        console.log("[Push] platform:", Capacitor.getPlatform());

        if (!Capacitor.isNativePlatform()) {
          console.log("[Push] Not native, skipping registration");
          return;
        }

        const { PushNotifications } = await import("@capacitor/push-notifications");

        // Check current permission status first
        const permissionStatus = await PushNotifications.checkPermissions();
        console.log("[Push] Current permission status:", permissionStatus.receive);

        let finalStatus = permissionStatus.receive;
        if (finalStatus === "prompt" || finalStatus === "prompt-with-rationale") {
          const result = await PushNotifications.requestPermissions();
          finalStatus = result.receive;
          console.log("[Push] Permission request result:", finalStatus);
        }

        if (finalStatus !== "granted") {
          console.log("[Push] Permission not granted, skipping");
          return;
        }

        // Register with FCM
        await PushNotifications.register();
        console.log("[Push] Registered with FCM, waiting for token...");

        // Listen for token
        PushNotifications.addListener("registration", async (tokenData) => {
          const token = tokenData.value;
          console.log("[Push] Got FCM token:", token ? token.substring(0, 20) + "..." : "EMPTY");

          if (!token) return;

          const platform = Capacitor.getPlatform();

          // Save token — try with user email if authenticated, else save anonymously
          try {
            const isAuth = await base44.auth.isAuthenticated();
            const user = isAuth ? await base44.auth.me() : null;
            console.log("[Push] User authenticated:", isAuth, "email:", user?.email);

            await base44.entities.DeviceToken.create({
              token,
              user_email: user?.email || "",
              platform,
              is_active: true
            });
            console.log("[Push] Token saved successfully!");
          } catch (saveErr) {
            console.error("[Push] Failed to save token:", saveErr);
          }
        });

        // Handle foreground notifications
        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("[Push] Notification received in foreground:", notification);
        });

        // Handle notification tap
        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          console.log("[Push] Notification tapped:", action);
          const deepLink = action.notification?.data?.deep_link;
          if (deepLink) {
            window.location.hash = deepLink;
          }
        });
      } catch (e) {
        console.error("[Push] Registration error:", e);
      }
    };

    register();
  }, []);
}