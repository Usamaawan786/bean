import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Ticket } from "lucide-react";
import { base44 } from "@/api/base44Client";
import DiscountVouchersPanel from "@/components/vouchers/DiscountVouchersPanel";

const STAFF_ROLES = ["cashier", "manager", "admin", "super_admin"];

export default function DiscountVouchers() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        if (!u) { base44.auth.redirectToLogin("/DiscountVouchers"); return; }
        if (!STAFF_ROLES.includes(u.role)) { window.location.replace("/Home"); return; }
        setChecking(false);
      })
      .catch(() => base44.auth.redirectToLogin("/DiscountVouchers"));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#D4C4B0] border-t-[#8B7355] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      <div className="bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white">
        <div className="max-w-3xl mx-auto px-5 pt-8 pb-7">
          <Link to="/StaffPortal" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Staff Portal
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-white/15 rounded-2xl p-3"><Ticket className="h-6 w-6" /></div>
            <div>
              <h1 className="text-xl font-bold">Discount Vouchers</h1>
              <p className="text-white/70 text-sm">Issue a dinner voucher, verify and redeem it at the counter — each one works once.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-5 py-6 pb-24">
        <DiscountVouchersPanel />
      </div>
    </div>
  );
}