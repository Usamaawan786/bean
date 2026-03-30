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
import AdminRewards from './pages/AdminRewards';
import AdminPushNotifications from './pages/AdminPushNotifications';
import AdminReferrals from './pages/AdminReferrals';
import AdminRedemptions from './pages/AdminRedemptions';
import Welcome from './pages/Welcome';
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
            <Route path="/AdminRewards" element={<AdminRewards />} />
            <Route path="/UserProfile" element={<LayoutWrapper currentPageName="UserProfile"><UserProfile /></LayoutWrapper>} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App