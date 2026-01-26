import Community from './pages/Community';
import FlashDrops from './pages/FlashDrops';
import Home from './pages/Home';
import Referral from './pages/Referral';
import Rewards from './pages/Rewards';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Community": Community,
    "FlashDrops": FlashDrops,
    "Home": Home,
    "Referral": Referral,
    "Rewards": Rewards,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};