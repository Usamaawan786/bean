import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { 
  Play, Pause, Edit2, Check, X, Clock, Send, 
  ChevronDown, ChevronUp, Calendar, Zap, Coffee
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Series start date: April 28, 2026
const SERIES_START = new Date("2026-04-28T00:00:00+05:00"); // PKT

// 30-day pre-launch series — building excitement before Bean opens
const DEFAULT_SERIES = [
  { day: 1,  title: "☕ Something Exciting is Brewing!", body: "Bean is almost here — Lahore's newest specialty coffee experience. We're putting the final touches on everything. Stay tuned!", time_pkt: "09:00", deep_link: "/Home" },
  { day: 2,  title: "💧 Did You Know? Coffee & Water", body: "Great coffee starts with great water. We've invested in the best filtration so every sip you take at Bean is exactly as it should be.", time_pkt: "10:00", deep_link: "/Home" },
  { day: 3,  title: "🌟 Your Points Are Ready & Waiting", body: "You already have points in your account just for joining early! When we open, you'll be ready to earn even more. Check your balance!", time_pkt: "14:00", deep_link: "/Rewards" },
  { day: 4,  title: "☕ The Perfect Brew Temperature", body: "Hot tip: the ideal water temp for coffee is 93°C — just off the boil. Too hot burns the beans. Too cold = weak flavour. We obsess over this!", time_pkt: "10:00", deep_link: "/Community" },
  { day: 5,  title: "🎉 Opening Week is Almost Here!", body: "We're getting closer! Our baristas are training, the machines are calibrated, and the beans are roasted. Bean opens very soon!", time_pkt: "11:00", deep_link: "/Home" },
  { day: 6,  title: "🌙 Evening Ritual — Wind Down Right", body: "Swap your evening coffee for a decaf or matcha — sleep better and wake up energised for your first visit to Bean!", time_pkt: "19:00", deep_link: "/Home" },
  { day: 7,  title: "🏆 One Week of the Bean Community!", body: "You've been part of our pre-launch community for a week. Thank you! Check your points — early members get the best head start.", time_pkt: "10:00", deep_link: "/Rewards" },
  { day: 8,  title: "🫘 Know Your Beans", body: "Arabica = smooth & sweet. Robusta = bold & strong. We've carefully curated our menu around both. Which sounds like you?", time_pkt: "09:30", deep_link: "/Community" },
  { day: 9,  title: "💡 Coffee Before a Workout?", body: "A cup 30 mins before exercise can boost performance by up to 12%! Come to Bean before your morning workout — we'll be open early!", time_pkt: "07:30", deep_link: "/Home" },
  { day: 10, title: "🎁 Early Member Perks — Just for You", body: "As a pre-launch member, you're already ahead of the crowd. When Bean opens, you'll walk in with points, perks, and priority. You earned it!", time_pkt: "13:00", deep_link: "/Rewards" },
  { day: 11, title: "☕ Light vs Dark Roast — The Truth", body: "Myth busted: lighter roasts actually have MORE caffeine than dark roasts! Light roast = less roasting = more caffeine retained. Mind blown?", time_pkt: "10:00", deep_link: "/Community" },
  { day: 12, title: "🌿 The Menu is Coming Together!", body: "From classic espresso to specialty cold brews — our menu is almost finalised. What are you most excited to try first?", time_pkt: "11:30", deep_link: "/Community" },
  { day: 13, title: "👫 Bring a Friend Before We Open!", body: "Share your referral link with a friend and you BOTH get bonus points on launch day! The more the merrier ☕", time_pkt: "15:00", deep_link: "/Home" },
  { day: 14, title: "🌙 Two Weeks Strong — Thank You!", body: "Two weeks of being part of the Bean pre-launch family! We couldn't do this without early supporters like you. Something special is coming!", time_pkt: "10:00", deep_link: "/Rewards" },
  { day: 15, title: "🧠 Coffee & Focus — Science Says So", body: "For deep work sessions, sip coffee slowly over 45 mins rather than downing it all. Steadier energy, better focus. Bean is your new office away from office!", time_pkt: "09:00", deep_link: "/Home" },
  { day: 16, title: "🌡️ Iced vs Hot — Your Mood, Your Choice", body: "Hot coffee releases more antioxidants. Iced coffee is gentler on the stomach. We'll have both perfected for you from day one!", time_pkt: "12:00", deep_link: "/Home" },
  { day: 17, title: "⚡ Flash Drops — Coming at Launch!", body: "Once we open, we'll drop surprise freebies for our Bean community. Flash Drops are exclusive — keep your notifications on!", time_pkt: "10:00", deep_link: "/Home" },
  { day: 18, title: "💬 Share Your Coffee Story", body: "What does your perfect morning look like? Share it in our Community — your fellow Bean members want to know your vibe ☕📸", time_pkt: "14:00", deep_link: "/Community" },
  { day: 19, title: "🫀 Coffee & Your Heart", body: "Studies show 3–5 cups per day is linked to lower heart disease risk. At Bean, we make it easy to enjoy quality coffee mindfully every day.", time_pkt: "10:00", deep_link: "/Home" },
  { day: 20, title: "🏅 Your Loyalty Tier Awaits!", body: "Once Bean opens and you start visiting, your tier climbs fast — Bronze → Silver → Gold → Platinum. Each level means bigger rewards!", time_pkt: "13:00", deep_link: "/Rewards" },
  { day: 21, title: "🌄 3 Weeks — You're a True Early Bird!", body: "3 weeks in the Bean pre-launch community! You've stuck with us and that means everything. Big things are coming very soon!", time_pkt: "09:00", deep_link: "/Community" },
  { day: 22, title: "💤 The 2PM Caffeine Cut-Off", body: "Pro tip: stop caffeine by 2pm to protect your sleep. After that, our decaf options are genuinely delicious — no compromise needed!", time_pkt: "13:30", deep_link: "/Home" },
  { day: 23, title: "🌍 Where Our Beans Come From", body: "Our beans travel thousands of kilometres — from Ethiopia, Colombia, and beyond. Every sip at Bean tells the story of that journey.", time_pkt: "10:00", deep_link: "/Community" },
  { day: 24, title: "🎯 Keep Your Account Active!", body: "Make sure your Bean app is set up and ready. When we open, you won't want to miss a single point or Flash Drop!", time_pkt: "11:00", deep_link: "/Rewards" },
  { day: 25, title: "☕ The Latte Art Secret", body: "Perfect latte art starts with milk steamed to exactly 65°C. Our baristas have been practicing for weeks — you're going to love it!", time_pkt: "10:00", deep_link: "/Community" },
  { day: 26, title: "💪 Coffee is Literally Self-Care", body: "Studies show regular coffee drinkers report higher happiness levels. Your daily Bean visit isn't an indulgence — it's a wellness ritual 😊", time_pkt: "09:00", deep_link: "/Home" },
  { day: 27, title: "🌟 Almost There — Final Countdown!", body: "The wait is nearly over. Everything at Bean has been crafted with care — the space, the menu, the team. We can't wait to welcome you!", time_pkt: "10:30", deep_link: "/Home" },
  { day: 28, title: "🎁 Your Pre-Launch Points Are Yours!", body: "Every point you've accumulated as an early member is yours to use the moment we open. You've been loyal — now come enjoy the rewards!", time_pkt: "12:00", deep_link: "/Rewards" },
  { day: 29, title: "☕ Bean's Promise to You", body: "Every cup we serve will be made with love, quality beans, and a genuine passion for great coffee. Thank you for trusting us with your mornings!", time_pkt: "09:00", deep_link: "/Home" },
  { day: 30, title: "🏆 30 Days — You're a Bean Legend!", body: "One month of the Bean community! You believed in us before anyone else. Walk in on launch day like you own the place — because you kind of do ☕🌟", time_pkt: "10:00", deep_link: "/Rewards" },
];

const STORAGE_KEY = "bean_30day_series_v3";

// Get the scheduled date for a given day index (0-based), starting April 28 2026
function getScheduledDate(index, timePkt) {
  const [h, m] = timePkt.split(":").map(Number);
  // Start from April 28 PKT and add index days
  const pktDate = new Date(SERIES_START);
  pktDate.setDate(pktDate.getDate() + index);
  // Set PKT hour/min, then convert to UTC (PKT = UTC+5)
  const utcDate = new Date(pktDate);
  utcDate.setHours(h - 5, m, 0, 0);
  // Handle midnight rollover
  if (h - 5 < 0) {
    utcDate.setDate(utcDate.getDate() - 1);
    utcDate.setHours(h - 5 + 24, m, 0, 0);
  }
  return utcDate;
}

function formatDate(index, timePkt) {
  const d = getScheduledDate(index, timePkt);
  // Show in PKT
  const pktDate = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  return pktDate.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" });
}

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

  const scheduledDateLabel = formatDate(index, day.time_pkt);

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
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="h-3 w-3" />{scheduledDateLabel}
            </span>
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
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" />{scheduledDateLabel} · {getTimeLabel()}
                </span>
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
                    <><Calendar className="h-3 w-3 mr-1" /> Schedule for {scheduledDateLabel}</>
                  )}
                </Button>
              )}
              {day.automationId && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Scheduled for {scheduledDateLabel} at {getTimeLabel()}
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
              <p className="text-xs text-gray-400">📅 Will send on: {formatDate(index, draft.time_pkt)} at {draft.time_pkt} PKT</p>
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
  const [scheduling, setScheduling] = useState(null);
  const [schedulingAll, setSchedulingAll] = useState(false);

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

  const scheduleDay = async (index) => {
    const day = series[index];
    if (!day.enabled) return;

    const sendDate = getScheduledDate(index, day.time_pkt);

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
        toast.success(`Day ${day.day} scheduled for ${formatDate(index, day.time_pkt)} at ${day.time_pkt} PKT`);
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
              <p className="text-white/50 text-xs mt-0.5">Starts Apr 28 · Pre-launch campaign</p>
            </div>
          </div>
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
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <div className="text-2xl font-bold">{enabledCount}</div>
              <div className="text-xs text-white/70">Enabled</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <div className="text-2xl font-bold">{scheduledCount}</div>
              <div className="text-xs text-white/70">Scheduled</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <div className="text-2xl font-bold">{enabledCount - scheduledCount}</div>
              <div className="text-xs text-white/70">Remaining</div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {masterOn && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-amber-800 font-semibold mb-1">📅 Pre-launch campaign — starts Apr 28, 2026</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Day 1 goes out today (Apr 28) at its scheduled time. Each subsequent day fires exactly 24 hours later. 
            All times are in Pakistan Time (PKT). Click "Schedule All" to queue the entire series at once.
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
          <p className="text-sm">Toggle the series ON to manage and schedule your 30-day pre-launch coffee campaign</p>
        </div>
      )}
    </div>
  );
}