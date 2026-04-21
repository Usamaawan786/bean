import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Send, Plus, Minus, Star, Bell, Crown, Shield } from "lucide-react";

export default function AdminToolsTab({ customer, userRecord, email, deviceTokens }) {
  const [ptsAmount, setPtsAmount] = useState("");
  const [ptsReason, setPtsReason] = useState("");
  const [ptsLoading, setPtsLoading] = useState(false);

  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifLoading, setNotifLoading] = useState(false);

  const [tierLoading, setTierLoading] = useState(false);
  const [fmLoading, setFmLoading] = useState(false);
  const [ebaLoading, setEbaLoading] = useState(false);

  const hasDevice = deviceTokens.length > 0;

  const adjustPoints = async (direction) => {
    const amt = parseInt(ptsAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid points amount"); return; }
    setPtsLoading(true);
    try {
      const delta = direction === "add" ? amt : -amt;
      const newBalance = Math.max(0, (customer.points_balance || 0) + delta);
      const newTotal = direction === "add" ? (customer.total_points_earned || 0) + amt : customer.total_points_earned;
      await base44.entities.Customer.update(customer.id, { points_balance: newBalance, total_points_earned: newTotal });
      await base44.entities.Activity.create({
        user_email: email,
        action_type: "points_earned",
        description: `Admin ${direction === "add" ? "added" : "deducted"} ${amt} pts${ptsReason ? `: ${ptsReason}` : ""}`,
        points_amount: delta,
        metadata: { manual: true }
      });
      toast.success(`${direction === "add" ? "Added" : "Deducted"} ${amt} points`);
      setPtsAmount(""); setPtsReason("");
    } catch (e) { toast.error(e.message); }
    finally { setPtsLoading(false); }
  };

  const sendPush = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) { toast.error("Title and body required"); return; }
    if (!hasDevice) { toast.error("User has no active device token"); return; }
    setNotifLoading(true);
    try {
      const res = await base44.functions.invoke("sendTargetedPushNotification", {
        userEmail: email,
        title: notifTitle,
        body: notifBody,
      });
      if (res.data?.success !== false) {
        toast.success("Push notification sent!");
        setNotifTitle(""); setNotifBody("");
      } else {
        toast.error(res.data?.error || "Failed to send");
      }
    } catch (e) { toast.error(e.message); }
    finally { setNotifLoading(false); }
  };

  const toggleFM = async () => {
    setFmLoading(true);
    try {
      await base44.entities.Customer.update(customer.id, { is_founding_member: !customer.is_founding_member });
      toast.success(`Founding Member status ${customer.is_founding_member ? "removed" : "granted"}`);
    } catch (e) { toast.error(e.message); }
    finally { setFmLoading(false); }
  };

  const toggleEBA = async () => {
    setEbaLoading(true);
    try {
      await base44.entities.Customer.update(customer.id, { is_eba: !customer.is_eba });
      toast.success(`EBA status ${customer.is_eba ? "removed" : "granted"}`);
    } catch (e) { toast.error(e.message); }
    finally { setEbaLoading(false); }
  };

  const setTier = async (tier) => {
    setTierLoading(true);
    try {
      await base44.entities.Customer.update(customer.id, { tier });
      toast.success(`Tier set to ${tier}`);
    } catch (e) { toast.error(e.message); }
    finally { setTierLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Points Adjustment */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-amber-500" /> Adjust Points
          <span className="ml-auto text-xs text-gray-400">Balance: <strong className="text-gray-700">{customer.points_balance || 0}</strong></span>
        </h4>
        <input
          type="number"
          value={ptsAmount}
          onChange={e => setPtsAmount(e.target.value)}
          placeholder="Points amount"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
        />
        <input
          value={ptsReason}
          onChange={e => setPtsReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
        />
        <div className="flex gap-2">
          <button
            onClick={() => adjustPoints("add")}
            disabled={ptsLoading}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add Points
          </button>
          <button
            onClick={() => adjustPoints("deduct")}
            disabled={ptsLoading}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Minus className="h-4 w-4" /> Deduct Points
          </button>
        </div>
      </div>

      {/* Send Push Notification */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-blue-500" /> Send Push Notification
          {!hasDevice && <span className="ml-auto text-xs text-red-400">No active device</span>}
        </h4>
        <input
          value={notifTitle}
          onChange={e => setNotifTitle(e.target.value)}
          placeholder="Title"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
        />
        <textarea
          value={notifBody}
          onChange={e => setNotifBody(e.target.value)}
          placeholder="Message body"
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#8B7355]/30"
        />
        <button
          onClick={sendPush}
          disabled={notifLoading || !hasDevice}
          className="w-full bg-[#8B7355] hover:bg-[#6B5744] text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> {notifLoading ? "Sending…" : "Send Notification"}
        </button>
      </div>

      {/* Manual Tier Override */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2 mb-3">
          <Crown className="h-4 w-4 text-yellow-500" /> Manual Tier Override
          <span className="ml-auto text-xs text-gray-400">Current: <strong>{customer.tier || "Bronze"}</strong></span>
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {["Bronze", "Silver", "Gold", "Platinum"].map(tier => (
            <button
              key={tier}
              onClick={() => setTier(tier)}
              disabled={tierLoading || customer.tier === tier}
              className={`py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
                customer.tier === tier
                  ? "bg-[#8B7355] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Special Status */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-purple-500" /> Special Status
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Founding Member ⭐</p>
              <p className="text-xs text-gray-400">3× 10% discounts</p>
            </div>
            <button
              onClick={toggleFM}
              disabled={fmLoading}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                customer.is_founding_member
                  ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
                  : "bg-green-100 text-green-600 hover:bg-green-200"
              }`}
            >
              {customer.is_founding_member ? "Revoke" : "Grant"}
            </button>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-700">Elite Bean Ambassador 👑</p>
              <p className="text-xs text-gray-400">EBA discount perks</p>
            </div>
            <button
              onClick={toggleEBA}
              disabled={ebaLoading}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                customer.is_eba
                  ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
                  : "bg-purple-100 text-purple-600 hover:bg-purple-200"
              }`}
            >
              {customer.is_eba ? "Revoke" : "Grant"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}