import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import usePushNotifications from './hooks/usePushNotifications';
import AdminEmails from './pages/AdminEmails';
import AdminCommunity from './pages/AdminCommunity';
import CashierTools from './pages/CashierTools';
import StaffManagement from './pages/StaffManagement';
import StaffLogin from './pages/StaffLogin';
import StaffPortal from './pages/StaffPortal';
import AdminChat from './pages/AdminChat';
import UserMessages from './pages/UserMessages';
import AdminFlashDrops from './pages/AdminFlashDrops';
import AdminRewards from './pages/AdminRewards';
import AdminRewardsRedemptions from './pages/AdminRewardsRedemptions';
import AdminWhatsApp from './pages/AdminWhatsApp';
import AdminPushNotifications from './pages/AdminPushNotifications.jsx';
import AdminAppUsers from './pages/AdminAppUsers';
import KitchenDisplay from './pages/KitchenDisplay';
import OrderHistory from './pages/OrderHistory';
import BarDisplay from './pages/BarDisplay';
import OrderManager from './pages/OrderManager';
import AdminReferrals from './pages/AdminReferrals';
import AdminRedemptions from './pages/AdminRedemptions';
import AdminStaffScrutiny from './pages/AdminStaffScrutiny';
import Welcome from './pages/Welcome';
import Leaderboard from './pages/Leaderboard';
import UserProfile from './pages/UserProfile';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

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
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App