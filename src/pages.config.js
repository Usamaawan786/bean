import Checkout from './pages/Checkout';
import Community from './pages/Community';
import FlashDrops from './pages/FlashDrops';
import Moderation from './pages/Moderation';
import Orders from './pages/Orders';
import Referral from './pages/Referral';
import Rewards from './pages/Rewards';
import Shop from './pages/Shop';
import Home from './pages/Home';
import Profile from './pages/Profile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Checkout": Checkout,
    "Community": Community,
    "FlashDrops": FlashDrops,
    "Moderation": Moderation,
    "Orders": Orders,
    "Referral": Referral,
    "Rewards": Rewards,
    "Shop": Shop,
    "Home": Home,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};