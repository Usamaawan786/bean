import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function NotificationBell({ userEmail }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!userEmail) return;
    loadNotifications();
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.data?.to_email === userEmail) {
        loadNotifications();
      }
    });
    return unsub;
  }, [userEmail]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadNotifications = async () => {
    const data = await base44.entities.Notification.filter({ to_email: userEmail }, "-created_date", 20);
    setNotifications(data);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const typeIcons = { follow: "👤", like: "❤️", comment: "💬", mention: "📢", reply: "↩️" };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open && unreadCount > 0) markAllRead(); }}
        className="relative p-2 rounded-xl text-[#8B7355] hover:bg-[#F5EBE8] transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E8DED8] z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#E8DED8]">
              <h3 className="font-bold text-[#5C4A3A]">Notifications</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-[#C9B8A6] text-sm">No notifications yet</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 border-b border-[#F5EBE8] last:border-0 flex gap-3 items-start ${!n.is_read ? "bg-amber-50/50" : ""}`}>
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-[#F5EBE8] flex items-center justify-center text-base">
                      {n.from_picture ? <img src={n.from_picture} className="w-full h-full object-cover" /> : typeIcons[n.type] || "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#5C4A3A] leading-snug">{n.message}</p>
                      <p className="text-xs text-[#C9B8A6] mt-0.5">{n.created_date ? format(new Date(n.created_date), "MMM d, h:mm a") : ""}</p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}