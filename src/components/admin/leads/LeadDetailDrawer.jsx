import { X, Gift, Phone, Mail, Calendar, Award } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const statusColor = {
  pending: "bg-green-100 text-green-700 border-green-200",
  claimed: "bg-gray-100 text-gray-500 border-gray-200",
  expired: "bg-red-100 text-red-600 border-red-200",
};

export default function LeadDetailDrawer({ lead, redemptions, onClose }) {
  if (!lead) return null;
  const isCustomer = lead.type === "customer";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="bg-white dark:bg-[var(--bg-card)] w-full max-w-md h-full overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-br from-[#8B7355] to-[#5C4A3A] text-white p-5">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                {(lead.name || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-bold text-lg">{lead.name}</h2>
                <Badge className={`mt-1 ${isCustomer ? "bg-emerald-500" : "bg-amber-500"} text-white border-0 text-xs`}>
                  {isCustomer ? "App User" : "Waitlist"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-[#F5F1ED] dark:bg-[var(--bg-elevated)] rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-[#5C4A3A] dark:text-[var(--text-primary)]">
                <Phone className="h-4 w-4 text-[#8B7355]" /> {lead.phone || "—"}
              </div>
              <div className="flex items-center gap-2 text-sm text-[#5C4A3A] dark:text-[var(--text-primary)]">
                <Mail className="h-4 w-4 text-[#8B7355]" /> {lead.email || "—"}
              </div>
              <div className="flex items-center gap-2 text-sm text-[#5C4A3A] dark:text-[var(--text-primary)]">
                <Calendar className="h-4 w-4 text-[#8B7355]" /> Joined {format(new Date(lead.created_date), "MMM d, yyyy")}
              </div>
            </div>

            {isCustomer ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#F5F1ED] dark:bg-[var(--bg-elevated)] rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-[#8B7355]">{lead.raw.points_balance || 0}</div>
                  <div className="text-xs text-[#C9B8A6]">Points</div>
                </div>
                <div className="bg-[#F5F1ED] dark:bg-[var(--bg-elevated)] rounded-xl p-3 text-center">
                  <div className="text-sm font-bold text-[#8B7355] capitalize">{lead.raw.tier || "Bronze"}</div>
                  <div className="text-xs text-[#C9B8A6]">Tier</div>
                </div>
                <div className="bg-[#F5F1ED] dark:bg-[var(--bg-elevated)] rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-[#8B7355]">PKR {(lead.raw.total_spend_pkr || 0).toLocaleString()}</div>
                  <div className="text-xs text-[#C9B8A6]">Total Spent</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#F5F1ED] dark:bg-[var(--bg-elevated)] rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-[#8B7355]">#{lead.raw.position ?? "—"}</div>
                  <div className="text-xs text-[#C9B8A6]">Waitlist Position</div>
                </div>
                <div className="bg-[#F5F1ED] dark:bg-[var(--bg-elevated)] rounded-xl p-3 text-center">
                  <div className="text-sm font-bold text-[#8B7355] capitalize">{lead.raw.status || "waiting"}</div>
                  <div className="text-xs text-[#C9B8A6]">Status</div>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-[#5C4A3A] dark:text-[var(--text-primary)] flex items-center gap-2 mb-2">
                <Gift className="h-4 w-4 text-[#8B7355]" /> Redemption History
              </h3>
              {redemptions.length === 0 ? (
                <p className="text-sm text-[#8B7355] dark:text-[var(--text-secondary)] text-center py-6">No redemptions yet</p>
              ) : (
                <div className="space-y-2">
                  {redemptions.map((r) => (
                    <div key={r.id} className="bg-[#F5F1ED] dark:bg-[var(--bg-elevated)] rounded-xl p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-[#5C4A3A] dark:text-[var(--text-primary)] truncate">{r.reward_name}</p>
                        <p className="text-xs text-[#8B7355] dark:text-[var(--text-secondary)]">
                          {r.points_spent} pts · {format(new Date(r.created_date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge className={`${statusColor[r.status] || statusColor.pending} border text-xs flex-shrink-0`}>
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isCustomer && (lead.raw.is_founding_member || lead.raw.is_eba) && (
              <div className="flex gap-2">
                {lead.raw.is_founding_member && (
                  <Badge className="bg-amber-500 text-white border-0 flex items-center gap-1"><Award className="h-3 w-3" /> Founding Member</Badge>
                )}
                {lead.raw.is_eba && (
                  <Badge className="bg-purple-600 text-white border-0 flex items-center gap-1"><Award className="h-3 w-3" /> EBA</Badge>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}