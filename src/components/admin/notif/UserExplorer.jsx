import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Star, Gift, ChevronDown, ChevronUp,
  Bell, Smartphone, Coffee, Crown, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

const TIER_COLORS = {
  Bronze: "from-amber-600 to-orange-700",
  Silver: "from-gray-400 to-slate-500",
  Gold: "from-yellow-400 to-amber-500",
  Platinum: "from-slate-400 to-gray-600"
};

function UserCard({ customer, userMap, deviceEmails, onSendNotif }) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [notifForm, setNotifForm] = useState({ title: "", body: "" });
  const [sent, setSent] = useState(false);

  const userInfo = userMap[customer.created_by] || {};
  const hasDevice = deviceEmails.has(customer.user_email || customer.created_by);
  const tier = customer.tier || "Bronze";

  const handleSend = async () => {
    if (!notifForm.title.trim() || !notifForm.body.trim()) {
      toast.error("Title and body required");
      return;
    }
    setSending(true);
    const res = await base44.functions.invoke("sendTargetedPushNotification", {
      user_email: customer.user_email || customer.created_by,
      title: notifForm.title,
      body: notifForm.body,
      data: { deep_link: "/Home" }
    });
    setSending(false);
    if (res.data?.success) {
      setSent(true);
      toast.success(`Notification sent!`);
      onSendNotif && onSendNotif();
      setTimeout(() => { setSent(false); setNotifForm({ title: "", body: "" }); setExpanded(false); }, 2000);
    } else {
      toast.error("Failed to send");
    }
  };

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow"
    >
      <div
        className="p-4 flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${TIER_COLORS[tier]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <span className="text-white font-bold text-sm">
            {(userInfo.full_name || customer.display_name || "?")[0]?.toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-800 truncate">
              {userInfo.full_name || customer.display_name || "Unknown"}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-gradient-to-r ${TIER_COLORS[tier]} text-white`}>
              {tier}
            </span>
            {hasDevice ? (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Smartphone className="h-2.5 w-2.5" /> Active
              </span>
            ) : (
              <span className="text-xs text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full">No device</span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate mt-0.5">{customer.user_email || customer.created_by}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-gray-800">{customer.points_balance || 0}</div>
            <div className="text-xs text-gray-400">pts</div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-300" /> : <ChevronDown className="h-4 w-4 text-gray-300" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Balance", value: customer.points_balance || 0, icon: Star },
                  { label: "Earned", value: customer.total_points_earned || 0, icon: Coffee },
                  { label: "Referrals", value: customer.referral_count || 0, icon: Gift },
                  { label: "Cups", value: customer.cups_redeemed || 0, icon: Crown },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <Icon className="h-3 w-3 text-gray-400 mx-auto mb-1" />
                    <div className="text-sm font-bold text-gray-700">{value}</div>
                    <div className="text-xs text-gray-400">{label}</div>
                  </div>
                ))}
              </div>

              {/* Extra info */}
              <div className="flex flex-wrap gap-2 text-xs">
                {customer.phone && <span className="bg-gray-50 rounded-lg px-2 py-1 text-gray-500">📞 {customer.phone}</span>}
                {customer.referred_by && <span className="bg-blue-50 rounded-lg px-2 py-1 text-blue-600">Referred by {customer.referred_by}</span>}
                {customer.is_founding_member && <span className="bg-amber-50 rounded-lg px-2 py-1 text-amber-700 font-medium">⭐ Founding Member</span>}
                {customer.is_eba && <span className="bg-purple-50 rounded-lg px-2 py-1 text-purple-700 font-medium">👑 EBA</span>}
                {customer.total_spend_pkr > 0 && <span className="bg-green-50 rounded-lg px-2 py-1 text-green-700">Rs. {(customer.total_spend_pkr || 0).toLocaleString()} spent</span>}
              </div>

              {/* Send Notification Form */}
              {hasDevice ? (
                <div className="bg-[#F9F6F3] rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-[#8B7355]" /> Send Personal Notification
                  </p>
                  <input
                    value={notifForm.title}
                    onChange={e => setNotifForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Notification title..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 bg-white"
                  />
                  <textarea
                    value={notifForm.body}
                    onChange={e => setNotifForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Message..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30 bg-white"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={sending || sent}
                    size="sm"
                    className="w-full rounded-xl bg-gradient-to-r from-[#8B7355] to-[#5C4A3A] text-white text-xs"
                  >
                    {sent ? <><Check className="h-3 w-3 mr-1.5" /> Sent!</> : sending ? "Sending..." : <><Send className="h-3 w-3 mr-1.5" /> Send Now</>}
                  </Button>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-400 text-center">
                  No active device registered — user hasn't enabled notifications
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function UserExplorer({ onSendNotif }) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["all-customers-explorer"],
    queryFn: () => base44.entities.Customer.list("-total_points_earned", 200)
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users-explorer"],
    queryFn: () => base44.entities.User.list()
  });

  const { data: deviceTokens = [] } = useQuery({
    queryKey: ["device-tokens-explorer"],
    queryFn: () => base44.entities.DeviceToken.filter({ is_active: true })
  });

  const userMap = {};
  allUsers.forEach(u => { userMap[u.email] = u; });
  const deviceEmails = new Set(deviceTokens.map(t => t.user_email).filter(Boolean));

  const filtered = customers.filter(c => {
    const email = c.user_email || c.created_by || "";
    const name = (userMap[c.created_by]?.full_name || c.display_name || "").toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || email.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === "all" || c.tier === tierFilter;
    const hasDevice = deviceEmails.has(email);
    const matchDevice = deviceFilter === "all" || (deviceFilter === "yes" && hasDevice) || (deviceFilter === "no" && !hasDevice);
    return matchSearch && matchTier && matchDevice;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "Bronze", "Silver", "Gold", "Platinum"].map(t => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                tierFilter === t ? "bg-[#8B7355] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {t === "all" ? "All Tiers" : t}
            </button>
          ))}
          <div className="w-px bg-gray-200 mx-1" />
          {[{ v: "all", l: "All" }, { v: "yes", l: "📱 Has Device" }, { v: "no", l: "No Device" }].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setDeviceFilter(v)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                deviceFilter === v ? "bg-[#8B7355] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400 px-1">
        Showing {filtered.length} of {customers.length} users · {deviceEmails.size} with active devices
      </p>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="bg-white rounded-2xl h-16 animate-pulse border border-gray-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No users match your filters</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <UserCard
              key={c.id}
              customer={c}
              userMap={userMap}
              deviceEmails={deviceEmails}
              onSendNotif={onSendNotif}
            />
          ))}
        </div>
      )}
    </div>
  );
}