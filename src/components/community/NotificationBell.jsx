import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, MessageCircle, Megaphone, Gift, CheckCheck, X, Heart, UserPlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { timeAgo } from "@/utils/timeUtils";
import { useNavigate } from "react-router-dom";

function notifIcon(type) {
  if (type === "like") return <Heart className="h-4 w-4 text-rose-500" />;
  if (type === "comment") return <MessageCircle className="h-4 w-4 text-blue-500" />;
  if (type === "reply") return <MessageCircle className="h-4 w-4 text-purple-500" />;
  if (type === "follow") return <UserPlus className="h-4 w-4 text-green-500" />;
  if (type === "announcement") return <Megaphone className="h-4 w-4 text-amber-500" />;
  if (type === "offer") return <Gift className="h-4 w-4 text-green-500" />;
  return <MessageCircle className="h-4 w-4 text-[#8B7355]" />;
}

function notifBg(type, isRead) {
  if (isRead) return "";
  if (type === "like") return "bg-rose-50";
  if (type === "comment" || type === "reply") return "bg-blue-50";
  if (type === "follow") return "bg-green-50";
  if (type === "announcement") return "bg-amber-50";
  if (type === "offer") return "bg-green-50";
  return "bg-blue-50";
}

export default function NotificationBell({ userEmail }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [adminMsgCount, setAdminMsgCount] = useState(0); // use conversation.unread_by_user
  const [adminMsgs, setAdminMsgs] = useState([]);
  // Track which notification IDs have been read locally (survives re-fetches)
  const localReadIds = useRef(new Set());
  const adminMarkedRead = useRef(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    if (!userEmail) return;
    try {
      const data = await base44.entities.Notification.filter(
        { to_email: userEmail }, "-created_date", 30
      );
      // Merge server data with local read state so polling doesn't undo reads
      setNotifications(data.map((n) =>
        localReadIds.current.has(n.id) ? { ...n, is_read: true } : n
      ));
    } catch (e) {}
  }, [userEmail]);

  const loadConversation = useCallback(async () => {
    if (!userEmail) return;
    try {
      const convs = await base44.entities.Conversation.filter({ user_email: userEmail });
      if (!convs.length) return;
      const conv = convs[0];
      setConversation(conv);
      // Use unread_by_user count from Conversation (source of truth for admin msgs)
      const count = adminMarkedRead.current ? 0 : (conv.unread_by_user || 0);
      setAdminMsgCount(count);

      // Load admin messages for display purposes only
      const msgs = await base44.entities.ChatMessage.filter({ conversation_id: conv.id }, "-created_date", 20);
      setAdminMsgs(msgs.filter((m) => m.sender_role === "admin"));
    } catch (e) {}
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    loadNotifications();
    loadConversation();

    // Real-time: new/updated notifications
    const unsubNotif = base44.entities.Notification.subscribe((event) => {
      if (event.data?.to_email !== userEmail) return;
      if (event.type === "create") {
        setNotifications((prev) => [event.data, ...prev]);
      } else if (event.type === "update") {
        if (event.data?.is_read) localReadIds.current.add(event.id);
        setNotifications((prev) => prev.map((n) => n.id === event.id ? { ...n, ...event.data } : n));
      }
    });

    // Real-time: new admin chat messages → refresh conversation count
    const unsubChat = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === "create" && event.data?.sender_role === "admin") {
        loadConversation();
      }
    });

    // Real-time: conversation unread_by_user changes
    const unsubConv = base44.entities.Conversation.subscribe((event) => {
      if (event.type === "update" && event.data?.user_email === userEmail) {
        const count = adminMarkedRead.current ? 0 : (event.data?.unread_by_user || 0);
        setAdminMsgCount(count);
        setConversation(event.data);
      }
    });

    const interval = setInterval(() => {
      loadNotifications();
      loadConversation();
    }, 30000);

    return () => { unsubNotif(); unsubChat(); unsubConv(); clearInterval(interval); };
  }, [userEmail, loadNotifications, loadConversation]);

  // Click outside closes
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const unreadNotifs = notifications.filter((n) => !n.is_read);
  const totalUnread = unreadNotifs.length + adminMsgCount;

  const markNotifRead = async (notif) => {
    if (notif.is_read) return;
    localReadIds.current.add(notif.id);
    setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
    base44.entities.Notification.update(notif.id, { is_read: true }).catch(() => {});
  };

  const markAllRead = async () => {
    // Mark all notification entities as read
    const unread = notifications.filter((n) => !n.is_read);
    unread.forEach((n) => localReadIds.current.add(n.id));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (unread.length) {
      Promise.all(unread.map((n) => base44.entities.Notification.update(n.id, { is_read: true }))).catch(() => {});
    }

    // Mark admin msgs as read via Conversation entity
    if (conversation && adminMsgCount > 0) {
      adminMarkedRead.current = true;
      setAdminMsgCount(0);
      base44.entities.Conversation.update(conversation.id, { unread_by_user: 0 }).catch(() => {});
    }
  };

  // Merge and sort all items for display
  const allItems = [
    ...notifications.map((n) => ({ ...n, _source: "notif" })),
    ...adminMsgs.map((m) => ({ ...m, _source: "admin", is_read: adminMarkedRead.current || m.is_read, type: m.message_type || "support" })),
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 30);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-[#8B7355] hover:bg-[#F5EBE8] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {totalUnread > 0 && (
          <motion.span
            key={totalUnread}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1"
          >
            {totalUnread > 9 ? "9+" : totalUnread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed right-3 top-16 w-[calc(100vw-24px)] max-w-[340px] bg-white rounded-2xl shadow-2xl border border-[#E8DED8] z-[100] overflow-hidden sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-[340px]"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#E8DED8] flex items-center justify-between bg-[#F9F6F3]">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#8B7355]" />
                <h3 className="font-bold text-[#5C4A3A] text-sm">Notifications</h3>
                {totalUnread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {totalUnread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {totalUnread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-[#8B7355] hover:text-[#5C4A3A] font-semibold flex items-center gap-1"
                  >
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-[#C9B8A6] hover:text-[#8B7355]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto divide-y divide-[#F5EBE8]">
              {allItems.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-[#C9B8A6]" />
                  <p className="text-[#C9B8A6] text-sm">No notifications yet</p>
                </div>
              ) : (
                allItems.map((item) => {
                  const isRead = item.is_read;
                  const isAdminMsg = item._source === "admin";
                  return (
                    <div
                      key={item.id}
                      className={`px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-[#F9F6F3] transition-colors ${notifBg(item.type, isRead)}`}
                      onClick={async () => {
                        if (isAdminMsg) {
                          if (conversation && adminMsgCount > 0) {
                            adminMarkedRead.current = true;
                            setAdminMsgCount(0);
                            base44.entities.Conversation.update(conversation.id, { unread_by_user: 0 }).catch(() => {});
                          }
                          setOpen(false);
                          navigate("/messages");
                        } else {
                          markNotifRead(item);
                          setOpen(false);
                          const type = item.type;
                          if ((type === "like" || type === "comment" || type === "reply") && item.post_id) {
                            navigate(`/Community?post=${item.post_id}`);
                          } else if (type === "follow" && item.from_email) {
                            navigate(`/UserProfile?email=${encodeURIComponent(item.from_email)}`);
                          } else if (type === "offer") {
                            navigate("/Rewards");
                          } else if (type === "announcement") {
                            navigate("/Community");
                          } else if (item.post_id) {
                            navigate(`/Community?post=${item.post_id}`);
                          } else {
                            navigate("/Community");
                          }
                        }
                      }}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-[#F5EBE8] overflow-hidden">
                        {item.from_picture ? (
                          <img src={item.from_picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          notifIcon(item.type)
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#5C4A3A] leading-snug line-clamp-2">
                          {isAdminMsg ? item.content : item.message}
                        </p>
                        <p className="text-[10px] text-[#C9B8A6] mt-1">{timeAgo(item.created_date)}</p>
                      </div>

                      {!isRead && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#8B7355] flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#E8DED8] p-3">
              <button
                onClick={() => { setOpen(false); navigate("/messages"); }}
                className="w-full flex items-center justify-center gap-2 bg-[#8B7355] hover:bg-[#6B5744] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                <MessageCircle className="h-4 w-4" /> Open Messages
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}