import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import usePushNotifications from './hooks/usePushNotifications';
const AdminEmails = lazy(() => import('./pages/AdminEmails'));
const AdminCommunity = lazy(() => import('./pages/AdminCommunity'));
const CashierTools = lazy(() => import('./pages/CashierTools'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const StaffLogin = lazy(() => import('./pages/StaffLogin'));
const StaffPortal = lazy(() => import('./pages/StaffPortal'));
const AdminChat = lazy(() => import('./pages/AdminChat'));
const UserMessages = lazy(() => import('./pages/UserMessages'));
const AdminFlashDrops = lazy(() => import('./pages/AdminFlashDrops'));
const AdminRewards = lazy(() => import('./pages/AdminRewards'));
const AdminRewardsRedemptions = lazy(() => import('./pages/AdminRewardsRedemptions'));
const AdminWhatsApp = lazy(() => import('./pages/AdminWhatsApp'));
const AdminPushNotifications = lazy(() => import('./pages/AdminPushNotifications'));
const AdminAppUsers = lazy(() => import('./pages/AdminAppUsers'));
const KitchenDisplay = lazy(() => import('./pages/KitchenDisplay'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const BarDisplay = lazy(() => import('./pages/BarDisplay'));
const OrderManager = lazy(() => import('./pages/OrderManager'));
const AdminReferrals = lazy(() => import('./pages/AdminReferrals'));
const AdminRedemptions = lazy(() => import('./pages/AdminRedemptions'));
const AdminStaffScrutiny = lazy(() => import('./pages/AdminStaffScrutiny'));
const Welcome = lazy(() => import('./pages/Welcome'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const AdminLeadsDashboard = lazy(() => import('./pages/AdminLeadsDashboard'));
const CustomerDirectory = lazy(() => import('./pages/CustomerDirectory'));
const RewardAnalytics = lazy(() => import('./pages/RewardAnalytics'));
const FlashDropManager = lazy(() => import('./pages/FlashDropManager'));
const SyrveIntegrationHub = lazy(() => import('./pages/SyrveIntegrationHub'));
const SurveillanceVault = lazy(() => import('./pages/SurveillanceVault'));
const InventoryAudit = lazy(() => import('./pages/InventoryAudit'));
const MenuPage = lazy(() => import('./pages/MenuPage'));

const { Pages, Layout, mainPage } = pagesConfig;
const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

function PushNotificationInit() {
  usePushNotifications();
  return null;
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <PushNotificationInit />
          <Suspense fallback={<div className="min-h-screen bg-[#F5F1ED]" />}>
            <Routes>
              <Route path="/" element={<Welcome />} />
              {Object.entries(Pages).map(([path, Page]) => (
                <Route
                  key={path}
                  path={`/${path}`}
                  element={
                    <LayoutWrapper currentPageName={path}>
                      <Page />
                    </LayoutWrapper>
                  }
                />
              ))}
              <Route path="/AdminEmails" element={<AdminEmails />} />
              <Route path="/AdminReferrals" element={<AdminReferrals />} />
              <Route path="/AdminRedemptions" element={<AdminRedemptions />} />
              <Route path="/AdminPushNotifications" element={<AdminPushNotifications />} />
              <Route path="/AdminAppUsers" element={<AdminAppUsers />} />
              <Route path="/AdminRewards" element={<AdminRewards />} />
              <Route path="/AdminRewardsRedemptions" element={<AdminRewardsRedemptions />} />
              <Route path="/AdminWhatsApp" element={<AdminWhatsApp />} />
              <Route path="/AdminChat" element={<AdminChat />} />
              <Route path="/messages" element={<UserMessages />} />
              <Route path="/AdminFlashDrops" element={<AdminFlashDrops />} />
              <Route path="/UserProfile" element={<LayoutWrapper currentPageName="UserProfile"><UserProfile /></LayoutWrapper>} />
              <Route path="/Leaderboard" element={<LayoutWrapper currentPageName="Leaderboard"><Leaderboard /></LayoutWrapper>} />
              <Route path="/StaffManagement" element={<StaffManagement />} />
              <Route path="/StaffPortal" element={<StaffPortal />} />
              <Route path="/staff" element={<StaffLogin />} />
              <Route path="/AdminCommunity" element={<AdminCommunity />} />
              <Route path="/CashierTools" element={<CashierTools />} />
              <Route path="/KitchenDisplay" element={<KitchenDisplay />} />
              <Route path="/BarDisplay" element={<BarDisplay />} />
              <Route path="/OrderManager" element={<OrderManager />} />
              <Route path="/OrderHistory" element={<OrderHistory />} />
              <Route path="/AdminStaffScrutiny" element={<AdminStaffScrutiny />} />
              <Route path="/AdminLeadsDashboard" element={<AdminLeadsDashboard />} />
              <Route path="/customer-directory" element={<CustomerDirectory />} />
              <Route path="/reward-analytics" element={<RewardAnalytics />} />
              <Route path="/flash-drop-manager" element={<FlashDropManager />} />
              <Route path="/syrve-integration-hub" element={<SyrveIntegrationHub />} />
              <Route path="/surveillance-vault" element={<SurveillanceVault />} />
              <Route path="/inventory-audit" element={<InventoryAudit />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </Suspense>
        </Router>
        <Toaster />
        <SonnerToaster position="top-center" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App