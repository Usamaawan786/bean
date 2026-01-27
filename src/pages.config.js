import Checkout from './pages/Checkout';
import Community from './pages/Community';
import FlashDrops from './pages/FlashDrops';
import Home from './pages/Home';
import Moderation from './pages/Moderation';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Referral from './pages/Referral';
import Rewards from './pages/Rewards';
import Shop from './pages/Shop';
import AdminPOS from './pages/AdminPOS';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Checkout": Checkout,
    "Community": Community,
    "FlashDrops": FlashDrops,
    "Home": Home,
    "Moderation": Moderation,
    "Orders": Orders,
    "Profile": Profile,
    "Referral": Referral,
    "Rewards": Rewards,
    "Shop": Shop,
    "AdminPOS": AdminPOS,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};