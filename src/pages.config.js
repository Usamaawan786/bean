import Checkout from './pages/Checkout';
import Community from './pages/Community';
import FlashDrops from './pages/FlashDrops';
import Home from './pages/Home';
import Orders from './pages/Orders';
import Referral from './pages/Referral';
import Rewards from './pages/Rewards';
import Shop from './pages/Shop';
import Moderation from './pages/Moderation';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Checkout": Checkout,
    "Community": Community,
    "FlashDrops": FlashDrops,
    "Home": Home,
    "Orders": Orders,
    "Referral": Referral,
    "Rewards": Rewards,
    "Shop": Shop,
    "Moderation": Moderation,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};