import Community from './pages/Community';
import FlashDrops from './pages/FlashDrops';
import Home from './pages/Home';
import Referral from './pages/Referral';
import Rewards from './pages/Rewards';
import Shop from './pages/Shop';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Community": Community,
    "FlashDrops": FlashDrops,
    "Home": Home,
    "Referral": Referral,
    "Rewards": Rewards,
    "Shop": Shop,
    "Checkout": Checkout,
    "Orders": Orders,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};