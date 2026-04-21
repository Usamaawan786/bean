import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ProfileTab from "./tabs/ProfileTab";
import ActivityTab from "./tabs/ActivityTab";
import PurchasesTab from "./tabs/PurchasesTab";
import ReferralsTab from "./tabs/ReferralsTab";
import CommunityTab from "./tabs/CommunityTab";
import AdminToolsTab from "./tabs/AdminToolsTab";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "activity", label: "Activity" },
  { id: "purchases", label: "Purchases" },
  { id: "referrals", label: "Referrals" },
  { id: "community", label: "Community" },
  { id: "tools", label: "Admin Tools" },
];

export default function UserDetailTabs({ customer, userRecord, deviceTokens }) {
  const [tab, setTab] = useState("profile");
  const email = customer.user_email || customer.created_by;

  // Shared data fetched once for all tabs
  const { data: activities = [] } = useQuery({
    queryKey: ["user-activities", email],
    queryFn: () => base44.entities.Activity.filter({ user_email: email }, "-created_date", 100),
    enabled: !!email,
  });

  const { data: redemptions = [] } = useQuery({
    queryKey: ["user-redemptions", email],
    queryFn: () => base44.entities.Redemption.filter({ customer_email: email }, "-created_date", 50),
    enabled: !!email,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["user-sales", email],
    queryFn: () => base44.entities.StoreSale.filter({ scanned_by: email }, "-created_date", 50),
    enabled: !!email,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["user-posts", email],
    queryFn: () => base44.entities.CommunityPost.filter({ author_email: email }, "-created_date", 50),
    enabled: !!email,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["user-orders", email],
    queryFn: () => base44.entities.Order.filter({ customer_email: email }, "-created_date", 50),
    enabled: !!email,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["user-notifs", email],
    queryFn: () => base44.entities.Notification.filter({ to_email: email }, "-created_date", 50),
    enabled: !!email,
  });

  const sharedProps = { customer, userRecord, email, activities, redemptions, sales, posts, orders, notifications, deviceTokens };

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 px-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max py-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
                tab === t.id ? "bg-[#8B7355] text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab === "profile"    && <ProfileTab    {...sharedProps} />}
        {tab === "activity"   && <ActivityTab   {...sharedProps} />}
        {tab === "purchases"  && <PurchasesTab  {...sharedProps} />}
        {tab === "referrals"  && <ReferralsTab  {...sharedProps} />}
        {tab === "community"  && <CommunityTab  {...sharedProps} />}
        {tab === "tools"      && <AdminToolsTab {...sharedProps} />}
      </div>
    </div>
  );
}