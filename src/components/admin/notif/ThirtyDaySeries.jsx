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

// 30-day pre-launch series — informational, teaser & behind-the-scenes tone
const DEFAULT_SERIES = [
  { day: 1,  title: "☕ Something Exciting is Brewing!", body: "Bean is coming to Lahore — a specialty coffee experience crafted for real coffee lovers. We're in the final stretch of preparation. Stay tuned!", time_pkt: "09:00", deep_link: "/Home" },
  { day: 2,  title: "💧 Why Water Quality Matters in Coffee", body: "Up to 98% of your cup is water. We've installed premium filtration at Bean so the water never gets in the way of a perfect brew.", time_pkt: "10:00", deep_link: "/Home" },
  { day: 3,  title: "🌟 You're Already Ahead of the Crowd", body: "As an early Bean member, you joined before we even opened. Your loyalty points are sitting in your account, ready for day one.", time_pkt: "14:00", deep_link: "/Rewards" },
  { day: 4,  title: "🌡️ The Perfect Brew Temperature", body: "93°C — that's the sweet spot for espresso extraction. Too hot scorches the beans, too cool and you lose complexity. We obsess over every degree.", time_pkt: "10:00", deep_link: "/Home" },
  { day: 5,  title: "🏗️ Behind the Scenes at Bean", body: "Our team has spent weeks sourcing furniture, calibrating machines, and designing a space where every corner feels intentional. Almost ready!", time_pkt: "11:00", deep_link: "/Community" },
  { day: 6,  title: "🌙 The Science of Evening Caffeine", body: "Caffeine has a half-life of ~5 hours. A 3pm coffee still has half its caffeine in your system at 8pm. That's why we're also curating excellent decaf.", time_pkt: "19:00", deep_link: "/Home" },
  { day: 7,  title: "🏆 One Week of the Bean Community!", body: "You've been part of our pre-launch community for a full week. Thank you — early supporters like you are the reason we're building something special.", time_pkt: "10:00", deep_link: "/Community" },
  { day: 8,  title: "🫘 Arabica vs Robusta — Know the Difference", body: "Arabica = smooth, nuanced, lower caffeine. Robusta = bold, earthy, higher caffeine. We've carefully curated our bean selection around both profiles.", time_pkt: "09:30", deep_link: "/Community" },
  { day: 9,  title: "💡 Coffee & Physical Performance", body: "Research shows caffeine 30–60 mins before exercise can improve endurance by up to 12%. Your morning brew isn't just a ritual — it's functional.", time_pkt: "07:30", deep_link: "/Home" },
  { day: 10, title: "🎁 Early Members Get the Best Start", body: "Everyone who joins Bean before launch gets a head start — bonus points, early access to Flash Drops, and founding member status. That's you!", time_pkt: "13:00", deep_link: "/Rewards" },
  { day: 11, title: "☕ The Light Roast Myth — Busted", body: "Lighter roasts actually have MORE caffeine than dark roasts. Longer roasting breaks down caffeine molecules. Light = more kick, more complexity.", time_pkt: "10:00", deep_link: "/Community" },
  { day: 12, title: "🌿 How We're Building Our Menu", body: "Our menu isn't random — every drink has been tasted, adjusted, and perfected over months. From espresso ratios to cold brew steep times, it's all intentional.", time_pkt: "11:30", deep_link: "/Community" },
  { day: 13, title: "👫 Invite a Friend to the Community", body: "Share your referral link with someone who loves great coffee. They join, you both earn bonus points — and you'll have a coffee companion from day one.", time_pkt: "15:00", deep_link: "/Home" },
  { day: 14, title: "🌙 Two Weeks — Thank You for Waiting", body: "Two weeks of the Bean community. We know anticipation is tough — but we promise the wait is worth it. Something genuinely special is coming.", time_pkt: "10:00", deep_link: "/Community" },
  { day: 15, title: "🧠 Coffee & Cognitive Performance", body: "Caffeine blocks adenosine receptors — the chemical that makes you feel tired. It doesn't give you energy, it prevents your brain from feeling fatigue. Fascinating, right?", time_pkt: "09:00", deep_link: "/Home" },
  { day: 16, title: "🌡️ Iced vs Hot Coffee — The Real Difference", body: "Hot coffee extracts more antioxidants. Cold brew is less acidic and gentler on digestion. Both are great — which you prefer depends on your body and mood.", time_pkt: "12:00", deep_link: "/Home" },
  { day: 17, title: "⚡ Flash Drops — What Are They?", body: "Flash Drops are surprise limited-quantity perks we'll release exclusively for Bean members after launch. Notification speed is everything — stay alert!", time_pkt: "10:00", deep_link: "/Home" },
  { day: 18, title: "💬 What's Your Coffee Personality?", body: "Espresso drinker = decisive and efficient. Latte lover = sociable and creative. Cold brew fan = laid-back but driven. What does your order say about you?", time_pkt: "14:00", deep_link: "/Community" },
  { day: 19, title: "🫀 Coffee & Heart Health — The Research", body: "Multiple large studies link moderate coffee consumption (3–5 cups/day) with reduced cardiovascular risk. Quality matters — and we're obsessing over it.", time_pkt: "10:00", deep_link: "/Home" },
  { day: 20, title: "🏅 Understanding the Bean Loyalty Tiers", body: "Bronze → Silver → Gold → Platinum. Each tier unlocks better perks and exclusive benefits. Your tier will grow every time you engage with Bean.", time_pkt: "13:00", deep_link: "/Rewards" },
  { day: 21, title: "🌄 3 Weeks — You're a True Early Bird!", body: "Three weeks in our pre-launch community. You've been patient and we genuinely appreciate it. The final preparations are happening right now.", time_pkt: "09:00", deep_link: "/Community" },
  { day: 22, title: "💤 The Optimal Caffeine Cut-Off Time", body: "Sleep researchers recommend stopping caffeine 6–8 hours before bed. For most people, 2pm is the sweet spot. Great decaf is part of our menu for a reason.", time_pkt: "13:30", deep_link: "/Home" },
  { day: 23, title: "🌍 Sourcing Beans — Our Journey", body: "We spent months evaluating farms and roasters from Ethiopia, Colombia, and Guatemala. The coffees we selected had to meet strict standards for freshness and taste.", time_pkt: "10:00", deep_link: "/Community" },
  { day: 24, title: "🎯 Your Bean Profile is Ready", body: "Your account, your points, your tier — everything is set up and waiting. The moment Bean opens, you're already a member with history. Not a new face — a regular.", time_pkt: "11:00", deep_link: "/Rewards" },
  { day: 25, title: "☕ The Craft of Latte Art", body: "Latte art isn't just aesthetic — it's a sign of correctly steamed milk at 65°C with the right texture. Our baristas have trained for weeks to get it right.", time_pkt: "10:00", deep_link: "/Community" },
  { day: 26, title: "💪 Why Coffee Drinkers Report More Happiness", body: "Caffeine triggers dopamine production. But researchers also note it's the ritual — the warmth, the pause, the routine — that contributes to wellbeing.", time_pkt: "09:00", deep_link: "/Home" },
  { day: 27, title: "🌟 The Space We've Been Building", body: "Every design decision at Bean — the lighting, the seating, the acoustics — was made with one question: does this make the coffee experience better? We think it does.", time_pkt: "10:30", deep_link: "/Home" },
  { day: 28, title: "🎁 Your Points Have Been Accumulating", body: "Every interaction since you joined — referrals, early sign-up bonuses, community activity — has been adding to your balance. It'll all be there on day one.", time_pkt: "12:00", deep_link: "/Rewards" },
  { day: 29, title: "☕ What Bean Stands For", body: "We started Bean because Lahore deserved a coffee experience built on quality, community, and craft — not just convenience. That belief is in every decision we've made.", time_pkt: "09:00", deep_link: "/Home" },
  { day: 30, title: "🏆 30 Days — You Were Here First", body: "One month of the Bean community before we even opened. You believed in what we were building before anyone else could see it. That means everything to us. ☕", time_pkt: "10:00", deep_link: "/Community" },
];

const STORAGE_KEY = "bean_30day_series_v5";

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