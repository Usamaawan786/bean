import AdminPOS from './pages/AdminPOS';
import Checkout from './pages/Checkout';
import Community from './pages/Community';
import FlashDrops from './pages/FlashDrops';
import Home from './pages/Home';
import Moderation from './pages/Moderation';
import Orders from './pages/Orders';
import Referral from './pages/Referral';
import Rewards from './pages/Rewards';
import Shop from './pages/Shop';
import Wallet from './pages/Wallet';
import GiftCards from './pages/GiftCards';
import Profile from './pages/Profile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminPOS": AdminPOS,
    "Checkout": Checkout,
    "Community": Community,
    "FlashDrops": FlashDrops,
    "Home": Home,
    "Moderation": Moderation,
    "Orders": Orders,
    "Referral": Referral,
    "Rewards": Rewards,
    "Shop": Shop,
    "Wallet": Wallet,
    "GiftCards": GiftCards,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};