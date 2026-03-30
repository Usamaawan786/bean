import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function usePushNotifications() {
  useEffect(() => {
    const register = async () => {
      try {
        // Only run on native Capacitor (iOS/Android)
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import("@capacitor/push-notifications");

        // Request permission
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== "granted") return;

        // Register with FCM
        await PushNotifications.register();

        // Listen for token
        PushNotifications.addListener("registration", async (tokenData) => {
          const token = tokenData.value;
          if (!token) return;

          const isAuth = await base44.auth.isAuthenticated();
          const user = isAuth ? await base44.auth.me() : null;

          const platform = Capacitor.getPlatform(); // "ios" or "android"

          // Always create — admin can deduplicate; read is admin-only so we skip the check
          await base44.entities.DeviceToken.create({
            token,
            user_email: user?.email || "",
            platform,
            is_active: true
          });
        });

        // Handle foreground notifications
        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("Push received:", notification);
        });

        // Handle notification tap
        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const deepLink = action.notification?.data?.deep_link;
          if (deepLink) {
            window.location.hash = deepLink;
          }
        });
      } catch (e) {
        // Silently fail on web
      }
    };

    register();
  }, []);
}