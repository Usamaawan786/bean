import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Send, ArrowLeft, Loader2, MessageCircle, Coffee, CheckCheck, Check, Megaphone, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

function MessageBubble({ msg }) {
  const isFromAdmin = msg.sender_role === "admin";
  const typeIcon = msg.message_type === "announcement" ? <Megaphone className="h-3 w-3" /> : msg.message_type === "offer" ? <Gift className="h-3 w-3" /> : null;

  return (
    <div className={`flex items-end gap-2 ${isFromAdmin ? "flex-row" : "flex-row-reverse"}`}>
      {isFromAdmin && (
        <div className="w-8 h-8 bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] rounded-full flex items-center justify-center flex-shrink-0">
          <Coffee className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={`max-w-[75%] ${isFromAdmin ? "items-start" : "items-end"} flex flex-col gap-1`}>
        {isFromAdmin && msg.message_type !== "text" && (
          <span className={`text-xs font-semibold flex items-center gap-1 px-2 ${msg.message_type === "announcement" ? "text-amber-600" : "text-green-600"}`}>
            {typeIcon} {msg.message_type === "announcement" ? "Announcement" : "Special Offer"}
          </span>
        )}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isFromAdmin
            ? msg.message_type === "announcement"
              ? "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 text-amber-900 rounded-bl-sm"
              : msg.message_type === "offer"
              ? "bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 text-green-900 rounded-bl-sm"
              : "bg-white border border-gray-100 text-gray-900 rounded-bl-sm"
            : "bg-[#8B7355] text-white rounded-br-sm"
        }`}>
          {msg.content}
        </div>
        <span className="text-[10px] text-gray-400 px-1">
          {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
          {!isFromAdmin && (msg.is_read ? <CheckCheck className="inline h-3 w-3 ml-0.5 text-blue-400" /> : <Check className="inline h-3 w-3 ml-0.5 text-gray-400" />)}
        </span>
      </div>
    </div>
  );
}

export default function UserMessages() {
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { base44.auth.redirectToLogin(); return; }
      const u = await base44.auth.me();
      setUser(u);

      // Find or create conversation for this user
      const convs = await base44.entities.Conversation.filter({ user_email: u.email });
      if (convs.length > 0) {
        setConversation(convs[0]);
        // Mark admin messages as read
        if (convs[0].unread_by_user > 0) {
          await base44.entities.Conversation.update(convs[0].id, { unread_by_user: 0 });
        }
      } else {
        // Auto-create conversation so admin can see the user
        const conv = await base44.entities.Conversation.create({
          user_email: u.email,
          user_name: u.display_name || u.full_name || u.email,
          last_message: "",
          last_message_at: new Date().toISOString(),
        });
        setConversation(conv);
      }
      setLoading(false);
    };
    init();
  }, []);

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["user-messages", conversation?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ conversation_id: conversation.id }, "created_date", 200),
    enabled: !!conversation,
    refetchInterval: 5000,
  });

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
    <div className="h-screen flex flex-col bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8DED8] px-4 py-3 flex items-center gap-3 shadow-sm flex-shrink-0 safe-area-top">
        <Link to="/" className="text-gray-500 hover:text-gray-800 p-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="w-10 h-10 bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] rounded-full flex items-center justify-center">
          <Coffee className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-[#5C4A3A] text-sm">Bean Support</h1>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-gray-400">Always here for you</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Welcome message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <div className="bg-white border border-[#E8DED8] rounded-2xl px-5 py-4 max-w-xs text-center shadow-sm">
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
          messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-[#E8DED8] px-4 py-3 flex items-end gap-3 pb-safe">
        <div className="flex-1 bg-[#F5F1ED] rounded-2xl px-4 py-2.5 border border-[#E8DED8]">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Bean Support..."
            rows={1}
            className="w-full bg-transparent text-sm resize-none focus:outline-none text-[#5C4A3A] placeholder-[#C9B8A6] max-h-24"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="w-10 h-10 bg-[#8B7355] rounded-full flex items-center justify-center text-white hover:bg-[#6B5744] disabled:opacity-40 transition-colors flex-shrink-0"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}