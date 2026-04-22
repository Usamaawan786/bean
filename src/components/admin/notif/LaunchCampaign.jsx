import { useState } from "react";
import { motion } from "framer-motion";
import { Rocket, Send, Clock, Bell, Users, Sparkles, Coffee, Gift, Star, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const LAUNCH_SEQUENCES = [
  {
    id: "teaser_1",
    phase: "T-3 Days",
    phaseColor: "from-violet-500 to-purple-600",
    label: "👀 Teaser #1 — The Mystery",
    title: "Something big is brewing, {{first_name}}… ☕",
    body: "We can't say much yet, but something really special is coming to Islamabad. Stay tuned — you won't want to miss this.",
    deepLink: "/Home",
    audience: "all",
    tip: "Build curiosity before the reveal. No details yet — just intrigue.",
  },
  {
    id: "teaser_2",
    phase: "T-2 Days",
    phaseColor: "from-indigo-500 to-blue-600",
    label: "☕ Teaser #2 — The Hint",
    title: "{{first_name}}, your mornings are about to change ☕",
    body: "Two days away. Premium coffee. Real rewards. A community unlike any other. Bean Islamabad opens very soon — and you're on the list.",
    deepLink: "/Home",
    audience: "all",
    tip: "Drop the hint — coffee, rewards, community. Still no full reveal.",
  },
  {
    id: "eve",
    phase: "T-1 Day",
    phaseColor: "from-amber-500 to-orange-500",
    label: "🔥 Launch Eve — Tomorrow It's Happening",
    title: "{{first_name}} — tomorrow is the day! 🔥",
    body: "Bean Islamabad opens TOMORROW. Be one of the first through the door, earn founding member rewards, and enjoy a cup on us. See you there! ☕",
    deepLink: "/Home",
    audience: "all",
    tip: "High energy, urgency, exclusivity for early visitors.",
  },
  {
    id: "launch_morning",
    phase: "Launch Day 🌅",
    phaseColor: "from-yellow-400 to-amber-500",
    label: "🚀 Launch Morning — We're OPEN",
    title: "{{first_name}}, Bean is officially OPEN! ☕🎉",
    body: "The wait is over! Bean Islamabad is NOW open. Walk in today, earn bonus points on your first visit, and be part of something special from day one.",
    deepLink: "/Home",
    audience: "all",
    tip: "Send between 9–10am on launch day. Maximum impact.",
  },
  {
    id: "launch_midday",
    phase: "Launch Day ☀️",
    phaseColor: "from-orange-400 to-red-400",
    label: "⚡ Launch Flash Drop — Midday Surprise",
    title: "⚡ LIVE NOW — Flash Drop at Bean, {{first_name}}!",
    body: "A surprise Flash Drop just went live to celebrate our opening! Come in right now and claim your free reward — limited quantities, first come first served! 🏃",
    deepLink: "/FlashDrops",
    audience: "all",
    tip: "Fire this at 12pm on launch day to pull lunch crowd in.",
  },
  {
    id: "launch_evening",
    phase: "Launch Evening 🌙",
    phaseColor: "from-slate-600 to-slate-800",
    label: "🌙 Launch Evening — Last Chance Today",
    title: "{{first_name}}, today's your last chance for opening day perks 🌙",
    body: "Bean has been buzzing all day — but there's still time! Come by before closing and earn your opening day bonus points. Today only. ☕",
    deepLink: "/Home",
    audience: "all",
    tip: "Send at 6pm to catch the evening crowd before closing.",
  },
  {
    id: "post_launch",
    phase: "Day 2+",
    phaseColor: "from-emerald-500 to-teal-600",
    label: "🎁 Post-Launch — FOMO Push",
    title: "{{first_name}}, did you hear what happened at Bean? 🎁",
    body: "Our opening day was incredible — hundreds of cups, happy faces, and rewards flying. If you missed it, don't worry. We're open daily and your points are waiting!",
    deepLink: "/Home",
    audience: "all",
    tip: "Send day 2 to those who didn't visit on day 1.",
  },
  {
    id: "founding_vip",
    phase: "VIP Only",
    phaseColor: "from-yellow-600 to-amber-600",
    label: "👑 Founding Members — Your Exclusive Invite",
    title: "{{first_name}}, you're a Founding Member 👑",
    body: "As one of Bean's earliest supporters, you have an exclusive 10% discount waiting — valid on your first 3 orders. Thank you for believing in us from the start. ☕",
    deepLink: "/Rewards",
    audience: "all",
    tip: "Send to your FM list right before or on launch day.",
  },
];

function MergeTagBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-200">
      <Sparkles className="h-3 w-3" /> {"{{first_name}}"}
    </span>
  );
}

export default function LaunchCampaign({ onApply }) {
  const [sending, setSending] = useState(null);
  const [sentIds, setSentIds] = useState([]);
  const [previewName, setPreviewName] = useState("Sarah");

  const preview = (text) => text.replace(/\{\{first_name\}\}/g, previewName || "there");

  const handleSend = async (seq) => {
    setSending(seq.id);
    try {
      const res = await base44.functions.invoke("sendPushNotification", {
        title: seq.title,
        body: seq.body,
        audience: seq.audience,
        deep_link: seq.deepLink,
        personalize_first_name: true,
      });
      if (res.data?.success !== false) {
        toast.success(`Sent! Reached ${res.data?.sent_count || 0} devices.`);
        setSentIds(prev => [...prev, seq.id]);
      } else {
        toast.error(res.data?.error || "Failed to send");
      }
    } catch (e) {
      toast.error("Error: " + e.message);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Rocket className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-purple-800 text-sm">Bean Launch Campaign — {LAUNCH_SEQUENCES.length} Notifications</p>
            <p className="text-xs text-purple-600 mt-1 leading-relaxed">
              A complete launch sequence from teaser to post-launch. Each notification supports <strong>personalised first names</strong> — we automatically replace <code className="bg-purple-100 px-1 rounded">{"{{first_name}}"}</code> with each user's actual name before sending.
            </p>
          </div>
        </div>
      </div>

      {/* Merge tag explainer */}
      <div className="bg-white border border-[#E8DED8] rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#8B7355]" />
          <p className="font-bold text-sm text-[#5C4A3A]">Personalisation — First Name Merge Tag</p>
        </div>
        <p className="text-xs text-[#8B7355] leading-relaxed">
          Just like GHL's <code className="bg-gray-100 px-1 rounded">{"{{contact.first_name}}"}</code>, you can use <MergeTagBadge /> anywhere in the title or message. When sent, each user receives their own name — making the notification feel personal and dramatically increasing open rates.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#8B7355]">Preview with name:</span>
          <input
            value={previewName}
            onChange={e => setPreviewName(e.target.value)}
            placeholder="e.g. Sarah"
            className="border border-[#E8DED8] rounded-lg px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-[#8B7355]/30"
          />
        </div>
      </div>

      {/* Also apply to composer */}
      <div className="flex items-center gap-2 text-xs text-[#8B7355]">
        <Info className="h-3.5 w-3.5" />
        <span>Tap <strong>"Use Template"</strong> to load into Compose, or <strong>"Send Now"</strong> to fire immediately.</span>
      </div>

      {/* Notification cards */}
      <div className="space-y-3">
        {LAUNCH_SEQUENCES.map((seq, i) => {
          const isSent = sentIds.includes(seq.id);
          const isSending = sending === seq.id;
          return (
            <motion.div
              key={seq.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-2xl border overflow-hidden ${isSent ? "border-green-200" : "border-[#E8DED8]"}`}
            >
              {/* Phase label */}
              <div className={`bg-gradient-to-r ${seq.phaseColor} px-4 py-2 flex items-center justify-between`}>
                <span className="text-white font-bold text-xs">{seq.phase}</span>
                {isSent && <span className="text-white/80 text-xs font-medium">✅ Sent</span>}
              </div>

              <div className="p-4 space-y-3">
                <p className="font-semibold text-sm text-[#5C4A3A]">{seq.label}</p>

                {/* Preview */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-3 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                    <Coffee className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[10px] text-white/60 font-medium">Bean</span>
                      <span className="text-[10px] text-white/40">now</span>
                    </div>
                    <p className="text-xs font-semibold text-white leading-tight">{preview(seq.title)}</p>
                    <p className="text-[10px] text-white/70 mt-0.5 leading-relaxed line-clamp-2">{preview(seq.body)}</p>
                  </div>
                </div>

                {/* Tip */}
                <p className="text-[10px] text-[#C9B8A6] italic">💡 {seq.tip}</p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onApply({ ...seq, title: seq.title, body: seq.body, deepLink: seq.deepLink })}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-[#E8DED8] rounded-xl py-2 text-xs font-medium text-[#8B7355] hover:bg-[#F9F6F3] transition-colors"
                  >
                    Use Template <ChevronRight className="h-3 w-3" />
                  </button>
                  <Button
                    onClick={() => handleSend(seq)}
                    disabled={isSending || isSent}
                    className={`flex-1 rounded-xl text-xs h-8 gap-1.5 ${isSent ? "bg-green-500 hover:bg-green-500" : `bg-gradient-to-r ${seq.phaseColor} hover:opacity-90`}`}
                  >
                    {isSending ? (
                      <><Clock className="h-3 w-3 animate-spin" /> Sending…</>
                    ) : isSent ? (
                      <>✅ Sent</>
                    ) : (
                      <><Send className="h-3 w-3" /> Send Now</>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}