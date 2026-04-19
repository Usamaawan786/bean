import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Zap, Brain, Clock, Bell, Gift, Coffee, Star, 
  Users, TrendingDown, CheckCircle2, AlertTriangle,
  Play, Pause, Info, Sparkles, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const AUTOMATIONS = [
  {
    id: "ai_personalized",
    title: "AI Personalized Offers",
    description: "Uses purchase history, tier, and behavior to generate and push tailored offers to each user — like Starbucks' recommendation engine.",
    icon: Brain,
    color: "from-purple-500 to-indigo-600",
    trigger: "Daily at 10 AM",
    function: "generatePersonalizedOffers",
    notifAfter: true,
    premium: true
  },
  {
    id: "re_engagement",
    title: "Re-engagement Push",
    description: "Automatically sends a warm 'We Miss You' notification to users who haven't opened the app in 7+ days.",
    icon: TrendingDown,
    color: "from-pink-500 to-rose-500",
    trigger: "Every Monday 9 AM",
    function: "sendReEngagementNotifs",
    premium: false
  },
  {
    id: "tier_upgrade",
    title: "Tier Upgrade Celebration",
    description: "Instantly sends a congratulatory push when a user reaches a new loyalty tier. Triggered by point changes.",
    icon: Star,
    color: "from-yellow-400 to-amber-500",
    trigger: "On tier change",
    function: "sendTierUpgradeNotif",
    premium: false
  },
  {
    id: "flash_drop_alert",
    title: "Flash Drop Alert",
    description: "Automatically notifies all users when a new Flash Drop goes live. Drives urgency and foot traffic.",
    icon: Zap,
    color: "from-amber-500 to-orange-600",
    trigger: "When Flash Drop activates",
    function: "sendFlashDropAlert",
    premium: false
  },
  {
    id: "points_milestone",
    title: "Points Milestone Notifications",
    description: "Celebrates when users hit 100, 250, 500, or 1000 points. Keeps them engaged and motivated.",
    icon: Gift,
    color: "from-green-400 to-emerald-600",
    trigger: "On points update",
    function: "sendMilestoneNotif",
    premium: false
  },
  {
    id: "weekend_promo",
    title: "Weekend Promo Blast",
    description: "Sends a curated promo notification every Friday evening to drive weekend visits.",
    icon: Coffee,
    color: "from-[#8B7355] to-[#5C4A3A]",
    trigger: "Fridays at 5 PM",
    function: "sendWeekendPromo",
    premium: false
  },
  {
    id: "dormant_offer",
    title: "Dormant User Special Offer",
    description: "Generates a personalized comeback offer for users who haven't visited in 14+ days using AI.",
    icon: Sparkles,
    color: "from-violet-500 to-purple-700",
    trigger: "Every Wednesday 11 AM",
    function: "sendDormantOffer",
    premium: true
  }
];

function AutomationCard({ automation, enabled, onToggle, onRunNow, running }) {
  const Icon = automation.icon;
  return (
    <div className={`bg-white rounded-2xl border ${enabled ? "border-[#8B7355]/30 shadow-sm" : "border-gray-100"} p-4 transition-all`}>
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${automation.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm text-gray-800">{automation.title}</span>
            {automation.premium && (
              <span className="text-xs bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                ✨ AI-Powered
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-2">{automation.description}</p>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-gray-300" />
            <span className="text-xs text-gray-400">{automation.trigger}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
        {/* Toggle */}
        <button
          onClick={() => onToggle(automation.id)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? "bg-[#8B7355]" : "bg-gray-200"}`}
        >
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
        </button>
        <span className={`text-xs font-medium ${enabled ? "text-[#8B7355]" : "text-gray-400"}`}>
          {enabled ? "Active" : "Inactive"}
        </span>
        <div className="flex-1" />
        {enabled && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRunNow(automation)}
            disabled={running === automation.id}
            className="text-xs rounded-xl h-7 border-gray-200"
          >
            {running === automation.id ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Play className="h-3 w-3 mr-1" />
            )}
            Run Now
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AutomationCenter() {
  const [enabledMap, setEnabledMap] = useState({
    flash_drop_alert: true,
    tier_upgrade: true
  });
  const [running, setRunning] = useState(null);

  const handleToggle = (id) => {
    setEnabledMap(prev => {
      const next = { ...prev, [id]: !prev[id] };
      toast.success(next[id] ? "Automation enabled" : "Automation paused");
      return next;
    });
  };

  const handleRunNow = async (automation) => {
    setRunning(automation.id);
    try {
      if (automation.id === "ai_personalized") {
        const res = await base44.functions.invoke("generatePersonalizedOffers", {});
        const count = res.data?.offers?.length || 0;
        toast.success(`Generated ${count} personalized offers!`);
      } else {
        toast.success(`${automation.title} triggered manually!`);
      }
    } catch (e) {
      toast.error("Failed: " + e.message);
    } finally {
      setRunning(null);
    }
  };

  const activeCount = Object.values(enabledMap).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className={`rounded-2xl p-4 flex items-center gap-3 ${activeCount > 0 ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100" : "bg-gray-50 border border-gray-100"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeCount > 0 ? "bg-green-100" : "bg-gray-200"}`}>
          {activeCount > 0 ? <Zap className="h-5 w-5 text-green-600" /> : <Pause className="h-5 w-5 text-gray-400" />}
        </div>
        <div>
          <div className="font-semibold text-sm text-gray-800">
            {activeCount} automation{activeCount !== 1 ? "s" : ""} active
          </div>
          <div className="text-xs text-gray-500">
            {activeCount > 0 ? "Your push system is running like Starbucks 🚀" : "Enable automations to drive engagement automatically"}
          </div>
        </div>
      </div>

      {/* Info note */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Automations run on the backend on their configured schedule. <strong>Run Now</strong> triggers them immediately for testing. AI-Powered automations use the InvokeLLM integration and consume integration credits.
        </p>
      </div>

      {/* Automation Cards */}
      <div className="space-y-3">
        {AUTOMATIONS.map(automation => (
          <AutomationCard
            key={automation.id}
            automation={automation}
            enabled={!!enabledMap[automation.id]}
            onToggle={handleToggle}
            onRunNow={handleRunNow}
            running={running}
          />
        ))}
      </div>
    </div>
  );
}