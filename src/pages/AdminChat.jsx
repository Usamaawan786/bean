import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  MessageCircle, Search, Send, ArrowLeft, MoreVertical,
  CheckCheck, Check, Circle, Users, Bell, BellOff, Trash2,
  Archive, Star, ChevronDown, Loader2, Coffee, Megaphone,
  RefreshCw, X, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

function Avatar({ name, size = "md" }) {
  const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500", "bg-amber-500", "bg-teal-500", "bg-red-500", "bg-indigo-500"];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function MessageBubble({ msg, isAdmin }) {
  const isFromAdmin = msg.sender_role === "admin";
  return (
    <div className={`flex items-end gap-2 ${isFromAdmin ? "flex-row-reverse" : "flex-row"}`}>
      {!isFromAdmin && <Avatar name={msg.sender_name} size="sm" />}
      <div className={`max-w-[70%] ${isFromAdmin ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isFromAdmin
            ? "bg-[#0084FF] text-white rounded-br-sm"
            : "bg-white text-gray-900 rounded-bl-sm border border-gray-100"
        }`}>
          {msg.message_type === "announcement" && (
            <div className={`flex items-center gap-1 text-xs font-semibold mb-1 ${isFromAdmin ? "text-blue-200" : "text-amber-600"}`}>
              <Megaphone className="h-3 w-3" /> Announcement
            </div>
          )}
          {msg.content}
        </div>
        <span className="text-[10px] text-gray-400 px-1">
          {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
          {isFromAdmin && (
            <span className="ml-1">{msg.is_read ? <CheckCheck className="inline h-3 w-3 text-blue-400" /> : <Check className="inline h-3 w-3 text-gray-400" />}</span>
          )}
        </span>
      </div>
    </div>
  );
}

export default function AdminChat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [messageType, setMessageType] = useState("text");
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastType, setBroadcastType] = useState("announcement");
  const [broadcasting, setBroadcasting] = useState(false);
  const [filter, setFilter] = useState("all"); // all | unread | archived
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || u.role !== "admin") window.location.href = "/";
      else setUser(u);
    });
  }, []);

  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: () => base44.entities.Conversation.list("-last_message_at", 100),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["admin-messages", selectedConv?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ conversation_id: selectedConv.id }, "created_date", 200),
    enabled: !!selectedConv,
    refetchInterval: 5000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["admin-chat-users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (!selectedConv || selectedConv.unread_by_admin === 0) return;
    base44.entities.Conversation.update(selectedConv.id, { unread_by_admin: 0 });
    queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
  }, [selectedConv?.id]);

  const filteredConvs = conversations.filter(c => {
    if (filter === "unread") return (c.unread_by_admin || 0) > 0;
    if (filter === "archived") return c.is_archived;
    return !c.is_archived;
  }).filter(c => !search || c.user_name?.toLowerCase().includes(search.toLowerCase()) || c.user_email?.toLowerCase().includes(search.toLowerCase()));

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_by_admin || 0), 0);

  const startConversation = async (u) => {
    // Find or create conversation for this user
    const existing = conversations.find(c => c.user_email === u.email);
    if (existing) { setSelectedConv(existing); return; }
    const conv = await base44.entities.Conversation.create({
      user_email: u.email,
      user_name: u.display_name || u.full_name || u.email,
      last_message: "",
      last_message_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
    setSelectedConv(conv);
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedConv || sending) return;
    setSending(true);
    const content = message.trim();
    setMessage("");
    await base44.entities.ChatMessage.create({
      conversation_id: selectedConv.id,
      sender_role: "admin",
      sender_email: user.email,
      sender_name: "Bean Admin",
      content,
      message_type: messageType,
    });
    await base44.entities.Conversation.update(selectedConv.id, {
      last_message: content,
      last_message_at: new Date().toISOString(),
      last_sender: "admin",
      unread_by_user: (selectedConv.unread_by_user || 0) + 1,
    });
    queryClient.invalidateQueries({ queryKey: ["admin-messages", selectedConv.id] });
    queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
    setSending(false);
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim() || broadcasting) return;
    setBroadcasting(true);
    const usersWithEmail = allUsers.filter(u => u.email);
    for (const u of usersWithEmail) {
      let conv = conversations.find(c => c.user_email === u.email);
      if (!conv) {
        conv = await base44.entities.Conversation.create({
          user_email: u.email,
          user_name: u.display_name || u.full_name || u.email,
          last_message: broadcastMsg.trim(),
          last_message_at: new Date().toISOString(),
          last_sender: "admin",
          unread_by_user: 1,
        });
      } else {
        await base44.entities.Conversation.update(conv.id, {
          last_message: broadcastMsg.trim(),
          last_message_at: new Date().toISOString(),
          last_sender: "admin",
          unread_by_user: (conv.unread_by_user || 0) + 1,
        });
      }
      await base44.entities.ChatMessage.create({
        conversation_id: conv.id,
        sender_role: "admin",
        sender_email: user?.email,
        sender_name: "Bean Admin",
        content: broadcastMsg.trim(),
        message_type: broadcastType,
      });
    }
    setBroadcastMsg("");
    setBroadcastMode(false);
    setBroadcasting(false);
    queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm flex-shrink-0">
        <Link to="/AdminDashboard" className="text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="w-8 h-8 bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] rounded-xl flex items-center justify-center">
          <Coffee className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900 text-sm">Bean Messenger</h1>
          <p className="text-xs text-gray-400">Admin · {conversations.length} conversations</p>
        </div>
        {totalUnread > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnread}</span>
        )}
        <button
          onClick={() => setBroadcastMode(true)}
          className="flex items-center gap-1.5 bg-[#0084FF] text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-blue-600 transition-colors"
        >
          <Megaphone className="h-3.5 w-3.5" /> Broadcast
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — Conversations */}
        <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-gray-100 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-gray-100">
            {[{ id: "all", label: "All" }, { id: "unread", label: `Unread${totalUnread ? ` (${totalUnread})` : ""}` }, { id: "archived", label: "Archived" }].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${filter === f.id ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* New Chat Button */}
          <div className="p-2">
            <details className="group">
              <summary className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 cursor-pointer text-sm font-medium text-gray-700">
                <Users className="h-4 w-4 text-blue-500" />
                Start new conversation
                <ChevronDown className="h-3.5 w-3.5 ml-auto group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-1 max-h-48 overflow-y-auto bg-gray-50 rounded-xl">
                {allUsers.filter(u => u.email && !conversations.find(c => c.user_email === u.email)).map(u => (
                  <button
                    key={u.id}
                    onClick={() => startConversation(u)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-100 text-left text-sm"
                  >
                    <Avatar name={u.display_name || u.full_name || u.email} size="sm" />
                    <span className="text-gray-700 truncate">{u.display_name || u.full_name || u.email}</span>
                  </button>
                ))}
              </div>
            </details>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No conversations yet</div>
            ) : (
              filteredConvs.map(conv => {
                const isSelected = selectedConv?.id === conv.id;
                const unread = conv.unread_by_admin || 0;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 text-left transition-colors ${isSelected ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}`}
                  >
                    <div className="relative">
                      <Avatar name={conv.user_name} />
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{unread}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm truncate ${unread > 0 ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                          {conv.user_name || conv.user_email}
                        </span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                          {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false }) : ""}
                        </span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                        {conv.last_sender === "admin" ? "You: " : ""}{conv.last_message || "No messages yet"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right — Chat Panel */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col bg-[#F0F2F5]">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 shadow-sm">
              <Avatar name={selectedConv.user_name} />
              <div className="flex-1">
                <h2 className="font-bold text-gray-900 text-sm">{selectedConv.user_name || selectedConv.user_email}</h2>
                <p className="text-xs text-gray-400">{selectedConv.user_email}</p>
              </div>
              <button
                onClick={async () => {
                  await base44.entities.Conversation.update(selectedConv.id, { is_archived: !selectedConv.is_archived });
                  queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
                  setSelectedConv(null);
                }}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                title="Archive"
              >
                <Archive className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {msgsLoading ? (
                <div className="flex justify-center pt-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center pt-10 text-gray-400 text-sm">
                  <MessageCircle className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                  Start the conversation
                </div>
              ) : (
                messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Type Selector */}
            <div className="bg-white border-t border-gray-200 px-4 pt-2 pb-0 flex gap-2">
              {[{ id: "text", label: "Message" }, { id: "announcement", label: "📢 Announcement" }, { id: "offer", label: "🎁 Offer" }].map(t => (
                <button
                  key={t.id}
                  onClick={() => setMessageType(t.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${messageType === t.id ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="bg-white px-4 py-3 flex items-end gap-3">
              <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5">
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={messageType === "announcement" ? "Type an announcement..." : messageType === "offer" ? "Type an offer message..." : "Type a message..."}
                  rows={1}
                  className="w-full bg-transparent text-sm resize-none focus:outline-none text-gray-900 placeholder-gray-400 max-h-32"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                className="w-10 h-10 bg-[#0084FF] rounded-full flex items-center justify-center text-white hover:bg-blue-600 disabled:opacity-40 transition-colors flex-shrink-0"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#F0F2F5] flex-col gap-3">
            <div className="w-20 h-20 bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] rounded-full flex items-center justify-center">
              <MessageCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-700">Bean Messenger</h2>
            <p className="text-gray-400 text-sm">Select a conversation or start a new one</p>
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      <AnimatePresence>
        {broadcastMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.93 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Megaphone className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">Broadcast to All Users</h3>
                  <p className="text-xs text-gray-500">Sends to {allUsers.filter(u => u.email).length} users</p>
                </div>
                <button onClick={() => setBroadcastMode(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* Message type */}
              <div className="flex gap-2 mb-3">
                {[{id:"announcement",label:"📢 Announcement"},{id:"offer",label:"🎁 Offer"},{id:"text",label:"💬 Message"}].map(t => (
                  <button key={t.id} onClick={() => setBroadcastType(t.id)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${broadcastType === t.id ? "bg-blue-600 text-white border-blue-600" : "text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Quick Templates */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Quick Templates</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {[
                    { label: "⚡ Flash Drop Live!", msg: "⚡ Flash Drop is LIVE at Bean right now! Head over to the app and claim yours before they run out. Limited items — first come, first served! ☕" },
                    { label: "⭐ Double Points Weekend", msg: "⭐ This weekend only: earn DOUBLE points on every visit! Come in Friday–Sunday and stack those rewards. See you at Bean! ☕" },
                    { label: "🎁 Exclusive Offer", msg: "🎁 Special offer just for you! Visit Bean this week and enjoy an exclusive treat — just show this message at the counter. Limited time only! 🫘" },
                    { label: "📣 New Launch", msg: "📣 Exciting news from Bean! We've just launched something new you're going to love. Come visit us and be among the first to experience it! ☕✨" },
                    { label: "💛 Loyalty Thank You", msg: "💛 Thank you for being a valued Bean member! Your loyalty means the world to us. Keep visiting and keep earning — big rewards are coming your way! 🏆" },
                  ].map((t, i) => (
                    <button key={i} onClick={() => setBroadcastMsg(t.msg)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-700 transition-colors font-medium">
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
                placeholder="Type your message or pick a template above..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none mb-4"
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setBroadcastMode(false)}>Cancel</Button>
                <Button
                  onClick={handleBroadcast}
                  disabled={!broadcastMsg.trim() || broadcasting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2"
                >
                  {broadcasting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send to All</>}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}