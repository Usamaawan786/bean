import { motion } from "framer-motion";
import { X } from "lucide-react";
import UserDetailTabs from "./UserDetailTabs";

export default function UserDetailDrawer({ customer, userRecord, deviceTokens, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[#F5F1ED] z-50 flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#5C4A3A] to-[#8B7355] text-white px-5 pt-10 pb-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                {(customer.display_name || userRecord?.full_name || "?")[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">
                  {customer.display_name || userRecord?.full_name || "Unknown"}
                </h2>
                <p className="text-white/70 text-sm">{customer.user_email || customer.created_by}</p>
                {customer.phone && <p className="text-white/60 text-xs mt-0.5">{customer.phone}</p>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors mt-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <UserDetailTabs customer={customer} userRecord={userRecord} deviceTokens={deviceTokens} />
        </div>
      </motion.div>
    </>
  );
}