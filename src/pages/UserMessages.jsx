import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, ArrowLeft, Loader2, MessageCircle, Coffee,
  CheckCheck, Check, Megaphone, Gift, Pin, Pencil, Trash2, X, MoreVertical
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

function formatMsgTime(dateStr) {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "h:mm a");
  } catch {
    return "";
  }
}

function ReadReceipt({ msg, isUser }) {
  if (!isUser) return null;
  if (msg.is_read) return <CheckCheck className="inline h-3.5 w-3.5 text-[#53bdeb]" />;
  return <CheckCheck className="inline h-3.5 w-3.5 text-gray-400" />;
}

function MessageBubble({ msg, onEdit, onDelete, onPin, currentUserEmail }) {
  const isFromAdmin = msg.sender_role === "admin";
  const isOwn = !isFromAdmin;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);
  const menuRef = useRef(null);
  const longPressTimer = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => setMenuOpen(true), 500);
  };
  const handleLongPressEnd = () => clearTimeout(longPressTimer.current);

  const handleEditSave = () => {
    if (editText.trim() && editText.trim() !== msg.content) {
      onEdit(msg.id, editText.trim());
    }
    setEditing(false);
  };

  const typeLabel = msg.message_type === "announcement" ? "📢 Announcement" : msg.message_type === "offer" ? "🎁 Special Offer" : null;

  return (
    <div
      className={`flex items-end gap-2 group ${isFromAdmin ? "flex-row" : "flex-row-reverse"}`}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onTouchCancel={handleLongPressEnd}
    >
      {isFromAdmin && (
        <div className="w-8 h-8 bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] rounded-full flex items-center justify-center flex-shrink-0 mb-5">
          <Coffee className="h-4 w-4 text-white" />
        </div>
      )}

      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isFromAdmin ? "items-start" : "items-end"} relative`}>
        {msg.is_pinned && (
          <span className="text-[10px] text-amber-600 flex items-center gap-0.5 px-1">
            <Pin className="h-2.5 w-2.5" /> Pinned
          </span>
        )}
        {typeLabel && (
          <span className={`text-[11px] font-semibold px-2 flex items-center gap-1 ${msg.message_type === "announcement" ? "text-amber-600" : "text-green-600"}`}>
            {typeLabel}
          </span>
        )}

        {editing ? (
          <div className="flex gap-2 items-end">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              autoFocus
              rows={2}
              className="border border-[#8B7355] rounded-xl px-3 py-2 text-sm resize-none focus:outline-none bg-white text-[#5C4A3A] min-w-[160px]"
            />
            <div className="flex flex-col gap-1">
              <button onClick={handleEditSave} className="w-7 h-7 bg-[#8B7355] rounded-full flex items-center justify-center text-white text-xs">✓</button>
              <button onClick={() => setEditing(false)} className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-gray-600"><X className="h-3 w-3" /></button>
            </div>
          </div>
        ) : (
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm relative ${
              isFromAdmin
                ? msg.message_type === "announcement"
                  ? "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 text-amber-900 rounded-bl-sm"
                  : msg.message_type === "offer"
                  ? "bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 text-green-900 rounded-bl-sm"
                  : "bg-white border border-gray-100 text-gray-900 rounded-bl-sm"
                : "bg-[#8B7355] text-white rounded-br-sm"
            }`}
            onContextMenu={e => { e.preventDefault(); setMenuOpen(true); }}
          >
            {msg.content}
            {msg.is_edited && (
              <span className={`text-[10px] ml-1 ${isFromAdmin ? "text-gray-400" : "text-white/60"}`}>edited</span>
            )}
          </div>
        )}

        <div className={`flex items-center gap-1 px-1 ${isFromAdmin ? "flex-row" : "flex-row-reverse"}`}>
          <span className="text-[10px] text-gray-400">{formatMsgTime(msg.created_date)}</span>
          <ReadReceipt msg={msg} isUser={isOwn} />
        </div>

        {/* Context Menu */}
        {menuOpen && !editing && (
          <div
            ref={menuRef}
            className={`absolute z-50 bottom-8 ${isFromAdmin ? "left-0" : "right-0"} bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden min-w-[160px]`}
          >
            {isOwn && (
              <button onClick={() => { setEditing(true); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700">
                <Pencil className="h-4 w-4 text-gray-400" /> Edit
              </button>
            )}
            <button onClick={() => { onPin(msg.id, !msg.is_pinned); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700">
              <Pin className="h-4 w-4 text-amber-400" /> {msg.is_pinned ? "Unpin" : "Pin"}
            </button>
            {isOwn && (
              <button onClick={() => { onDelete(msg.id); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-sm text-red-500">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
            <button onClick={() => setMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-400">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* Desktop hover action button */}
      <button
        onClick={() => setMenuOpen(v => !v)}
        className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200 text-gray-400 flex-shrink-0 self-center mb-5 ${isFromAdmin ? "order-last" : "order-first"}`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function UserMessages() {
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pinnedMsg, setPinnedMsg] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { base44.auth.redirectToLogin(); return; }
      const u = await base44.auth.me();
      setUser(u);

      const convs = await base44.entities.Conversation.filter({ user_email: u.email });
      let conv;
      if (convs.length > 0) {
        conv = convs[0];
        if (conv.unread_by_user > 0) {
          await base44.entities.Conversation.update(conv.id, { unread_by_user: 0 });
        }
      } else {
        conv = await base44.entities.Conversation.create({
          user_email: u.email,
          user_name: u.display_name || u.full_name || u.email,
          last_message: "",
          last_message_at: new Date().toISOString(),
        });
      }
      setConversation(conv);
      setLoading(false);
    };
    init();
  }, []);

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["user-messages", conversation?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ conversation_id: conversation.id }, "created_date", 200),
    enabled: !!conversation,
    refetchInterval: 4000,
  });

  // Mark admin messages as read when viewed
  useEffect(() => {
    if (!messages.length || !conversation) return;
    const unreadAdminMsgs = messages.filter(m => m.sender_role === "admin" && !m.is_read);
    if (unreadAdminMsgs.length > 0) {
      Promise.all(unreadAdminMsgs.map(m => base44.entities.ChatMessage.update(m.id, { is_read: true })));
    }
  }, [messages]);

  // Track pinned message
  useEffect(() => {
    const pinned = messages.find(m => m.is_pinned);
    setPinnedMsg(pinned || null);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !conversation || sending) return;
    setSending(true);
    const content = message.trim();
    setMessage("");
    await base44.entities.ChatMessage.create({
      conversation_id: conversation.id,
      sender_role: "user",
      sender_email: user.email,
      sender_name: user.display_name || user.full_name || "Customer",
      content,
      message_type: "text",
      is_read: false,
    });
    await base44.entities.Conversation.update(conversation.id, {
      last_message: content,
      last_message_at: new Date().toISOString(),
      last_sender: "user",
      unread_by_admin: (conversation.unread_by_admin || 0) + 1,
    });
    queryClient.invalidateQueries({ queryKey: ["user-messages", conversation.id] });
    setSending(false);
  };

  const handleEdit = async (msgId, newContent) => {
    await base44.entities.ChatMessage.update(msgId, { content: newContent, is_edited: true });
    queryClient.invalidateQueries({ queryKey: ["user-messages", conversation.id] });
  };

  const handleDelete = async (msgId) => {
    await base44.entities.ChatMessage.delete(msgId);
    queryClient.invalidateQueries({ queryKey: ["user-messages", conversation.id] });
  };

  const handlePin = async (msgId, pin) => {
    // Unpin all first, then pin selected
    if (pin) {
      const pinned = messages.filter(m => m.is_pinned);
      await Promise.all(pinned.map(m => base44.entities.ChatMessage.update(m.id, { is_pinned: false })));
    }
    await base44.entities.ChatMessage.update(msgId, { is_pinned: pin });
    queryClient.invalidateQueries({ queryKey: ["user-messages", conversation.id] });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F1ED]">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#ECE5DD]" style={{ height: "100dvh", backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9b8a6' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
      {/* Header */}
      <div className="bg-[#075E54] text-white px-4 pt-safe flex-shrink-0 shadow-md" style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}>
        <div className="flex items-center gap-3 py-3">
        <Link to="/" className="text-white/80 hover:text-white p-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="w-10 h-10 bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] rounded-full flex items-center justify-center">
          <Coffee className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-sm">Bean Support</h1>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            <span className="text-xs text-white/70">Always here for you</span>
          </div>
        </div>
        </div>
      </div>

      {/* Pinned Message Banner */}
      <AnimatePresence>
        {pinnedMsg && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-2 overflow-hidden"
          >
            <Pin className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-amber-600 font-semibold">Pinned Message</p>
              <p className="text-xs text-gray-700 truncate">{pinnedMsg.content}</p>
            </div>
            <button onClick={() => handlePin(pinnedMsg.id, false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {/* Welcome card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mb-4">
          <div className="bg-white/90 border border-[#E8DED8] rounded-2xl px-5 py-4 max-w-xs text-center shadow-sm">
            <div className="w-12 h-12 bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] rounded-full flex items-center justify-center mx-auto mb-2">
              <Coffee className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-bold text-[#5C4A3A]">Welcome to Bean Support ☕</p>
            <p className="text-xs text-[#8B7355] mt-1">We're here for any questions, updates, or offers!</p>
          </div>
        </motion.div>

        {msgsLoading ? (
          <div className="flex justify-center pt-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center pt-4 text-gray-400 text-sm">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-200" />
            No messages yet. Say hi! 👋
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPin={handlePin}
              currentUserEmail={user?.email}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-[#F0F2F5] px-3 pt-2.5 flex items-end gap-2 flex-shrink-0" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 10px)" }}>
        <div className="flex-1 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Bean Support..."
            rows={1}
            style={{ fontSize: '16px' }}
            className="w-full bg-transparent text-sm resize-none focus:outline-none text-[#5C4A3A] placeholder-[#C9B8A6] max-h-24 leading-relaxed"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="w-11 h-11 bg-[#075E54] rounded-full flex items-center justify-center text-white hover:bg-[#054c44] disabled:opacity-40 transition-colors flex-shrink-0 shadow-md"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}