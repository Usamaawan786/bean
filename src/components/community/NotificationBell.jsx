import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, MessageCircle, Megaphone, Gift, CheckCheck, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { timeAgo } from "@/utils/timeUtils";
import { Link, useNavigate } from "react-router-dom";

function msgIcon(type) {
  if (type === "announcement") return <Megaphone className="h-4 w-4 text-amber-500" />;
  if (type === "offer") return <Gift className="h-4 w-4 text-green-500" />;
  return <MessageCircle className="h-4 w-4 text-[#8B7355]" />;
}

function msgBg(type) {
  if (type === "announcement") return "bg-amber-50";
  if (type === "offer") return "bg-green-50";
  return "bg-blue-50";
}

export default function NotificationBell({ userEmail }) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Load conversation + unread admin messages
  const loadMessages = useCallback(async () => {
    if (!userEmail) return;
    try {
      const convs = await base44.entities.Conversation.filter({ user_email: userEmail });
      if (!convs.length) return;
      const conv = convs[0];
      setConversation(conv);
      const msgs = await base44.entities.ChatMessage.filter({ conversation_id: conv.id }, "-created_date", 30);
      const adminMsgs = msgs.filter((m) => m.sender_role === "admin");
      setMessages(adminMsgs);
    } catch (e) {

      // Network errors ignored silently
    }}, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    loadMessages();
    // Real-time subscription on ChatMessage
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type === "create" && event.data?.sender_role === "admin") {
        loadMessages();
      } else if (event.type === "update") {
        setMessages((prev) => prev.map((m) => m.id === event.id ? { ...m, ...event.data } : m));
      }
    });
    // Also poll every 15s as fallback
    const interval = setInterval(loadMessages, 15000);
    return () => {unsub();clearInterval(interval);};
  }, [userEmail, loadMessages]);

  // Click outside closes
  useEffect(() => {
    const h = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const unreadMsgs = messages.filter((m) => !m.is_read);
  const totalUnread = unreadMsgs.length;

  const markOneRead = async (msg) => {
    if (msg.is_read) return;
    await base44.entities.ChatMessage.update(msg.id, { is_read: true });
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_read: true } : m));
    // Update conversation counter
    if (conversation) {
      const newCount = Math.max(0, (conversation.unread_by_user || 0) - 1);
      await base44.entities.Conversation.update(conversation.id, { unread_by_user: newCount });
      setConversation((prev) => ({ ...prev, unread_by_user: newCount }));
    }
  };

  const markAllRead = async () => {
    const unread = messages.filter((m) => !m.is_read);
    if (!unread.length) return;
    await Promise.all(unread.map((m) => base44.entities.ChatMessage.update(m.id, { is_read: true })));
    setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
    if (conversation) {
      await base44.entities.Conversation.update(conversation.id, { unread_by_user: 0 });
      setConversation((prev) => ({ ...prev, unread_by_user: 0 }));
    }
  };

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  const handleGoToMessages = async () => {
    await markAllRead();
    setOpen(false);
    navigate("/messages");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl text-[#8B7355] hover:bg-[#F5EBE8] transition-colors"
        aria-label="Notifications">
        
        <Bell className="mx-2 my-8 lucide lucide-bell h-5 w-5" />
        {totalUnread > 0 &&
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1">
          
            {totalUnread > 9 ? "9+" : totalUnread}
          </motion.span>
        }
      </button>

      <AnimatePresence>
        {open &&
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.15 }}
          className="fixed right-3 top-16 w-[calc(100vw-24px)] max-w-[340px] bg-white rounded-2xl shadow-2xl border border-[#E8DED8] z-[100] overflow-hidden sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-[340px] sm:fixed-none">
          
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#E8DED8] flex items-center justify-between bg-[#F9F6F3]">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#8B7355]" />
                <h3 className="font-bold text-[#5C4A3A] text-sm">Messages from Bean</h3>
                {totalUnread > 0 &&
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {totalUnread} new
                  </span>
              }
              </div>
              <div className="flex items-center gap-2">
                {totalUnread > 0 &&
              <button
                onClick={markAllRead}
                className="text-[10px] text-[#8B7355] hover:text-[#5C4A3A] font-semibold flex items-center gap-1">
                
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </button>
              }
                <button onClick={() => setOpen(false)} className="text-[#C9B8A6] hover:text-[#8B7355]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Message list */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-[#F5EBE8]">
              {messages.length === 0 ?
            <div className="px-4 py-10 text-center">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-[#C9B8A6]" />
                  <p className="text-[#C9B8A6] text-sm">No messages from Bean yet</p>
                </div> :

            messages.map((msg) =>
            <div
              key={msg.id}
              className={`px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-[#F9F6F3] transition-colors ${!msg.is_read ? msgBg(msg.message_type) : ""}`}
              onClick={() => {markOneRead(msg);setOpen(false);navigate("/messages");}}>
              
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${msg.message_type === "announcement" ? "bg-amber-100" : msg.message_type === "offer" ? "bg-green-100" : "bg-[#F5EBE8]"}`}>
                      {msgIcon(msg.message_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-[#5C4A3A]">
                          {msg.message_type === "announcement" ? "📢 Announcement" : msg.message_type === "offer" ? "🎁 Special Offer" : "☕ Bean Support"}
                        </span>
                      </div>
                      <p className="text-sm text-[#5C4A3A] leading-snug line-clamp-2">{msg.content}</p>
                      <p className="text-[10px] text-[#C9B8A6] mt-1">
                        {timeAgo(msg.created_date)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!msg.is_read &&
              <div className="w-2.5 h-2.5 rounded-full bg-[#8B7355] flex-shrink-0 mt-1.5" />
              }
                  </div>
            )
            }
            </div>

            {/* Footer */}
            <div className="border-t border-[#E8DED8] p-3">
              <button
              onClick={handleGoToMessages}
              className="w-full flex items-center justify-center gap-2 bg-[#8B7355] hover:bg-[#6B5744] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
              
                <MessageCircle className="h-4 w-4" /> Open Messages
              </button>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}