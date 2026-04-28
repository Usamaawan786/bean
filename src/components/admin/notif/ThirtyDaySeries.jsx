import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { 
  Play, Pause, Edit2, Check, X, Clock, Send, 
  ChevronDown, ChevronUp, Calendar, Zap, Coffee
} from "lucide-react";
import { Button } from "@/components/ui/button";

// 30-day series — each with a smart scheduled time (PKT = UTC+5)
// PKT times converted to UTC for scheduling
const DEFAULT_SERIES = [
  { day: 1,  title: "☕ Good Morning, Coffee Lover!", body: "Did you know? Your morning cup is best enjoyed 90 minutes after waking up. Give your cortisol a chance to rise first!", time_pkt: "09:00", deep_link: "/Home" },
  { day: 2,  title: "💧 Coffee & Hydration Tip", body: "Coffee is a mild diuretic — drink a glass of water for every cup you have. Your body will thank you!", time_pkt: "10:00", deep_link: "/Home" },
  { day: 3,  title: "🌟 You've Got Points Waiting!", body: "Have you scanned your last bill yet? Every PKR you spend earns you rewards. Don't leave points on the table!", time_pkt: "14:00", deep_link: "/Rewards" },
  { day: 4,  title: "☕ The Perfect Brew Temperature", body: "Hot tip: the ideal water temp for coffee is 93°C — just off the boil. Too hot burns the beans. Too cold = weak flavour.", time_pkt: "10:00", deep_link: "/Community" },
  { day: 5,  title: "🎉 It's the Weekend — Treat Yourself!", body: "You've worked hard this week. Come visit us, grab your favourite brew, and earn points while you're at it!", time_pkt: "11:00", deep_link: "/Rewards" },
  { day: 6,  title: "🌙 Wind Down With Us", body: "Swap your evening coffee for a decaf or matcha — sleep better and wake up ready for your morning cup!", time_pkt: "19:00", deep_link: "/Home" },
  { day: 7,  title: "🏆 One Week In — You're Awesome", body: "You've been with Bean for a week! Check your tier status and see how close you are to your next level.", time_pkt: "10:00", deep_link: "/Rewards" },
  { day: 8,  title: "🫘 Know Your Beans", body: "Arabica = smooth & sweet. Robusta = bold & strong. Which are you? Come in and try both — we've got you covered!", time_pkt: "09:30", deep_link: "/Community" },
  { day: 9,  title: "💡 Coffee Before a Workout?", body: "A cup 30 mins before exercise can boost performance by up to 12%! Try it — just stay hydrated too 💪", time_pkt: "07:30", deep_link: "/Home" },
  { day: 10, title: "🎁 Redeem Your Points Today!", body: "Your points are waiting to become something delicious. Head to Rewards and see what's available for you!", time_pkt: "13:00", deep_link: "/Rewards" },
  { day: 11, title: "☕ Light vs Dark Roast — The Truth", body: "Myth busted: lighter roasts actually have MORE caffeine than dark roasts! Light roast = less roasting = more caffeine retained.", time_pkt: "10:00", deep_link: "/Community" },
  { day: 12, title: "🌿 Try Something New Today", body: "If you always order the same thing — today's the day to be adventurous! Our staff loves helping you find your new favourite.", time_pkt: "11:30", deep_link: "/Home" },
  { day: 13, title: "👫 Bring a Friend, Earn Together", body: "Share your referral code with a friend and you BOTH earn bonus points when they join! Sharing is caring ☕", time_pkt: "15:00", deep_link: "/Home" },
  { day: 14, title: "🌙 Two Weeks — You're a Regular Now!", body: "Two weeks of great coffee choices! Your loyalty means the world to us. Check your points balance — you might surprise yourself!", time_pkt: "10:00", deep_link: "/Rewards" },
  { day: 15, title: "🧠 Coffee & Focus Tip", body: "For deep work sessions, try sipping coffee slowly over 45 mins rather than downing it all at once. Steadier energy, better focus!", time_pkt: "09:00", deep_link: "/Home" },
  { day: 16, title: "🌡️ Iced vs Hot — Which is Healthier?", body: "Both are great! Iced coffee is gentler on the stomach. Hot coffee releases more antioxidants. Pick your mood today!", time_pkt: "12:00", deep_link: "/Home" },
  { day: 17, title: "⚡ Flash Drops Are Coming!", body: "We drop surprise freebies for our Bean community. Keep your notifications on so you never miss a Flash Drop!", time_pkt: "10:00", deep_link: "/FlashDrops" },
  { day: 18, title: "💬 Share Your Coffee Moment", body: "Post a photo of your Bean cup on our Community feed! Your fellow coffee lovers want to see your vibes ☕📸", time_pkt: "14:00", deep_link: "/Community" },
  { day: 19, title: "🫀 Coffee & Your Heart", body: "Studies show 3–5 cups per day is associated with a lower risk of heart disease. Moderation is key — enjoy mindfully!", time_pkt: "10:00", deep_link: "/Home" },
  { day: 20, title: "🏅 You're Almost at the Next Tier!", body: "Keep sipping and earning — your next loyalty tier means bigger rewards and better perks. Every cup counts!", time_pkt: "13:00", deep_link: "/Rewards" },
  { day: 21, title: "🌄 Three Weeks Strong!", body: "3 weeks of being part of the Bean family! We love having you. What's your go-to order? Tell us in the Community!", time_pkt: "09:00", deep_link: "/Community" },
  { day: 22, title: "💤 Cut Off Time Reminder", body: "Pro tip: stop caffeine by 2pm to protect your sleep quality. Switch to decaf after that — we've got great options!", time_pkt: "13:30", deep_link: "/Home" },
  { day: 23, title: "🌍 Where Does Your Coffee Come From?", body: "Our beans travel thousands of kilometres to reach your cup — from Ethiopia, Colombia, and more. Every sip tells a story!", time_pkt: "10:00", deep_link: "/Community" },
  { day: 24, title: "🎯 Points Expiry Reminder", body: "Keep your account active! Regular visits keep your Bean membership in great standing. Come see us soon!", time_pkt: "11:00", deep_link: "/Rewards" },
  { day: 25, title: "☕ The Latte Art Secret", body: "Great latte art starts with perfectly steamed milk at 65°C. Ask our baristas about it next time — they love talking craft!", time_pkt: "10:00", deep_link: "/Community" },
  { day: 26, title: "💪 Coffee for the Soul", body: "A study found people who drink coffee regularly report higher levels of happiness. So your daily cup is literally self-care! 😊", time_pkt: "09:00", deep_link: "/Home" },
  { day: 27, title: "🌟 Weekend Special Reminder", body: "Weekends are for good coffee and great company. Pop in, enjoy your favourite brew, and earn those points!", time_pkt: "10:30", deep_link: "/Home" },
  { day: 28, title: "🎁 You've Earned It — Redeem Now!", body: "Four weeks of being a Bean loyalist! You've been earning points — now treat yourself. Check what rewards are waiting for you!", time_pkt: "12:00", deep_link: "/Rewards" },
  { day: 29, title: "☕ Bean's Promise to You", body: "Every cup we serve is made with love, quality beans, and a passion for great coffee. Thank you for trusting us with your mornings!", time_pkt: "09:00", deep_link: "/Home" },
  { day: 30, title: "🏆 30 Days — You're a Bean Legend!", body: "One month of amazing coffee moments! You are officially a Bean Legend ☕🌟 Check your profile for a special surprise!", time_pkt: "10:00", deep_link: "/Rewards" },
];

// Convert PKT (UTC+5) time string "HH:MM" to a cron UTC expression
function pktToCronUTC(timePkt) {
  const [h, m] = timePkt.split(":").map(Number);
  let utcH = h - 5;
  if (utcH < 0) utcH += 24;
  return { utcH, utcM: m };
}

const STORAGE_KEY = "bean_30day_series_v2";

function loadSeries() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_SERIES.map(d => ({ ...d, enabled: true, automationId: null }));
}

function saveSeries(series) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(series));
}

function DayCard({ day, index, onEdit, onToggle, onSchedule, scheduling }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: day.title, body: day.body, time_pkt: day.time_pkt, deep_link: day.deep_link });

  const handleSave = () => {
    onEdit(index, draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft({ title: day.title, body: day.body, time_pkt: day.time_pkt, deep_link: day.deep_link });
    setEditing(false);
  };

  const getTimeLabel = () => {
    const [h, m] = day.time_pkt.split(":");
    const hNum = parseInt(h);
    const period = hNum >= 12 ? "PM" : "AM";
    const h12 = hNum > 12 ? hNum - 12 : hNum === 0 ? 12 : hNum;
    return `${h12}:${m} ${period} PKT`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`bg-white rounded-2xl border transition-all ${
        day.enabled ? "border-gray-100 shadow-sm" : "border-gray-100 opacity-50"
      } ${day.automationId ? "ring-1 ring-green-300" : ""}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          day.automationId ? "bg-green-100 text-green-700" : "bg-[#F5EBE8] text-[#8B7355]"
        }`}>
          {day.automationId ? "✓" : day.day}
        </div>

        <div className="flex-1 min-w-0" onClick={() => setExpanded(e => !e)} role="button">
          <p className="text-sm font-semibold text-gray-800 truncate">{day.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />{getTimeLabel()}
            </span>
            {day.automationId && <span className="text-xs text-green-600 font-medium">Scheduled</span>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setEditing(e => !e)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#8B7355] hover:bg-[#F5EBE8] transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onToggle(index)}
            className={`p-1.5 rounded-lg transition-colors ${
              day.enabled ? "text-green-500 hover:bg-green-50" : "text-gray-300 hover:bg-gray-50"
            }`}
            title={day.enabled ? "Disable this day" : "Enable this day"}
          >
            {day.enabled ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 text-gray-300">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && !editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
              <p className="text-xs text-gray-500 leading-relaxed">{day.body}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {day.deep_link && (
                  <span className="text-xs bg-[#F5EBE8] text-[#8B7355] px-2 py-0.5 rounded-full">→ {day.deep_link}</span>
                )}
              </div>
              {!day.automationId && day.enabled && (
                <Button
                  onClick={() => onSchedule(index)}
                  disabled={scheduling === index}
                  size="sm"
                  className="bg-[#8B7355] hover:bg-[#6B5744] text-white rounded-xl text-xs"
                >
                  {scheduling === index ? (
                    <><Clock className="h-3 w-3 mr-1 animate-spin" /> Scheduling…</>
                  ) : (
                    <><Calendar className="h-3 w-3 mr-1" /> Schedule This Day</>
                  )}
                </Button>
              )}
              {day.automationId && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Automation active
                </span>
              )}
            </div>
          </motion.div>
        )}

        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Title</label>
                <input
                  value={draft.title}
                  onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  maxLength={65}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Message</label>
                <textarea
                  value={draft.body}
                  onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                  rows={3}
                  maxLength={200}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Send Time (PKT)</label>
                  <input
                    type="time"
                    value={draft.time_pkt}
                    onChange={e => setDraft(d => ({ ...d, time_pkt: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Deep Link</label>
                  <input
                    value={draft.deep_link}
                    onChange={e => setDraft(d => ({ ...d, deep_link: e.target.value }))}
                    placeholder="/Rewards"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" className="bg-[#8B7355] hover:bg-[#6B5744] text-white rounded-xl text-xs">
                  <Check className="h-3 w-3 mr-1" /> Save
                </Button>
                <Button onClick={handleCancel} size="sm" variant="outline" className="rounded-xl text-xs">
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ThirtyDaySeries() {
  const [series, setSeries] = useState(loadSeries);
  const [masterOn, setMasterOn] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bean_30day_master") ?? "false"); } catch { return false; }
  });
  const [scheduling, setScheduling] = useState(null); // index being scheduled
  const [schedulingAll, setSchedulingAll] = useState(false);

  // Persist whenever series changes
  useEffect(() => { saveSeries(series); }, [series]);
  useEffect(() => { localStorage.setItem("bean_30day_master", JSON.stringify(masterOn)); }, [masterOn]);

  const enabledCount = series.filter(d => d.enabled).length;
  const scheduledCount = series.filter(d => d.automationId).length;

  const updateDay = (index, newData) => {
    setSeries(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...newData };
      return next;
    });
  };

  const toggleDay = (index) => {
    setSeries(prev => {
      const next = [...prev];
      next[index] = { ...next[index], enabled: !next[index].enabled };
      return next;
    });
  };

  // Schedule a single day as a one-time automation
  const scheduleDay = async (index, targetDate) => {
    const day = series[index];
    if (!day.enabled) return;

    // Calculate the send datetime
    const date = targetDate || new Date();
    const [h, m] = day.time_pkt.split(":").map(Number);

    // If no targetDate provided, schedule for "day N from now" starting tomorrow
    const sendDate = targetDate ? new Date(targetDate) : new Date();
    if (!targetDate) {
      sendDate.setDate(sendDate.getDate() + index); // day 1 = tomorrow, day 2 = day after, etc.
    }
    sendDate.setHours(h - 5, m, 0, 0); // convert PKT to UTC (PKT = UTC+5)
    if (sendDate.getHours() < 0) {
      sendDate.setDate(sendDate.getDate() - 1);
      sendDate.setHours(sendDate.getHours() + 24);
    }

    // Create an automation via backend function
    try {
      const res = await base44.functions.invoke("scheduleSeriesNotification", {
        dayIndex: index,
        title: day.title,
        body: day.body,
        deep_link: day.deep_link,
        scheduledAt: sendDate.toISOString(),
      });
      if (res?.data?.automationId) {
        updateDay(index, { automationId: res.data.automationId });
        toast.success(`Day ${day.day} scheduled for ${sendDate.toLocaleDateString()} at ${day.time_pkt} PKT`);
      } else {
        toast.error(res?.data?.error || "Failed to schedule");
      }
    } catch (e) {
      toast.error("Error scheduling: " + e.message);
    }
  };

  const handleScheduleOne = async (index) => {
    setScheduling(index);
    await scheduleDay(index);
    setScheduling(null);
  };

  const handleScheduleAll = async () => {
    setSchedulingAll(true);
    const enabledDays = series.map((d, i) => ({ d, i })).filter(({ d }) => d.enabled && !d.automationId);
    for (const { i } of enabledDays) {
      setScheduling(i);
      await scheduleDay(i);
    }
    setScheduling(null);
    setSchedulingAll(false);
    toast.success("All enabled days scheduled!");
  };

  const handleToggleMaster = () => {
    const newVal = !masterOn;
    setMasterOn(newVal);
    if (newVal) {
      toast.success("30-Day Series is ON — schedule your days below");
    } else {
      toast.info("30-Day Series paused");
    }
  };

  return (
    <div className="space-y-4">
      {/* Master control */}
      <div className={`rounded-3xl p-5 text-white transition-all ${
        masterOn
          ? "bg-gradient-to-br from-[#5C4A3A] to-[#8B7355]"
          : "bg-gradient-to-br from-gray-500 to-gray-600"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Coffee className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">30-Day Coffee Series</h2>
              <p className="text-white/70 text-sm">{enabledCount} of 30 days enabled · {scheduledCount} scheduled</p>
            </div>
          </div>
          {/* Toggle switch */}
          <button
            onClick={handleToggleMaster}
            className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${
              masterOn ? "bg-green-400" : "bg-white/30"
            }`}
          >
            <motion.div
              animate={{ x: masterOn ? 28 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow"
            />
          </button>
        </div>

        {masterOn && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <div className="text-2xl font-bold">{enabledCount}</div>
              <div className="text-xs text-white/70">Days Enabled</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <div className="text-2xl font-bold">{scheduledCount}</div>
              <div className="text-xs text-white/70">Scheduled</div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {masterOn && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-amber-800 font-semibold mb-1">📅 How to use:</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Edit any day's copy and time, then click "Schedule This Day" to set it up. Times are in Pakistan Time (PKT). 
            Use "Schedule All" to queue all enabled days starting from tomorrow, one per day.
          </p>
        </div>
      )}

      {/* Schedule all button */}
      {masterOn && scheduledCount < enabledCount && (
        <Button
          onClick={handleScheduleAll}
          disabled={schedulingAll}
          className="w-full rounded-2xl bg-gradient-to-r from-[#8B7355] to-[#5C4A3A] text-white font-semibold py-3"
        >
          {schedulingAll ? (
            <><Clock className="h-4 w-4 mr-2 animate-spin" /> Scheduling All Days…</>
          ) : (
            <><Zap className="h-4 w-4 mr-2" /> Schedule All {enabledCount - scheduledCount} Remaining Days</>
          )}
        </Button>
      )}

      {/* Day cards */}
      {masterOn && (
        <div className="space-y-2">
          {series.map((day, i) => (
            <DayCard
              key={day.day}
              day={day}
              index={i}
              onEdit={(idx, data) => updateDay(idx, data)}
              onToggle={toggleDay}
              onSchedule={handleScheduleOne}
              scheduling={scheduling}
            />
          ))}
        </div>
      )}

      {!masterOn && (
        <div className="text-center py-12 text-gray-400">
          <Coffee className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Toggle the series ON to manage and schedule your 30-day coffee campaign</p>
        </div>
      )}
    </div>
  );
}