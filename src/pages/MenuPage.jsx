import { useEffect, useState, useRef, useCallback } from "react";
import { Coffee, Heart, Search, Info } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import MenuCard from "@/components/menu/MenuCard";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45 }
});

// "Most Liked" items — matched by name (case-insensitive contains)
const MOST_LIKED_QUERIES = [
  { query: "eggs bruschetta", likes: 12 },
  { query: "club sandwich", likes: 11 },
  { query: "mushroom cheese omelette", likes: 10 },
  { query: "lotus french toast", likes: 8 },
  { query: "spanish latte", likes: 6 },
];

const CATEGORY_ORDER = [
  "Breakfast",
  "Hot Coffee",
  "Cold Coffee",
  "Matcha",
  "Smoothies",
  "Fresher",
  "Teas & More",
  "Pastry",
  "Sweeter",
  "Add-Ons",
  "Other",
];

const CATEGORY_IMAGES = {
  "Breakfast": "https://images.unsplash.com/photo-1533089860892-a7c6f0a886de?w=400&q=80",
  "Hot Coffee": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80",
  "Cold Coffee": "https://images.unsplash.com/photo-1461023058943-07fcbe342818?w=400&q=80",
  "Matcha": "https://images.unsplash.com/photo-1515823668373-6c12b5b0389f?w=400&q=80",
  "Smoothies": "https://images.unsplash.com/photo-1505252585461-04db1eb5465f?w=400&q=80",
  "Fresher": "https://images.unsplash.com/photo-1610970881699-46a35a1a6f4f?w=400&q=80",
  "Teas & More": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80",
  "Pastry": "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=400&q=80",
  "Sweeter": "https://images.unsplash.com/photo-1551024601-bec78aea6be4?w=400&q=80",
  "Add-Ons": "https://images.unsplash.com/photo-1497935586351-b67f49ee9fee?w=400&q=80",
  "Other": "https://images.unsplash.com/photo-1495474472287-4d71bcdd6005?w=400&q=80",
};

const MOST_LIKED_IMAGES = {
  "eggs bruschetta": "https://images.unsplash.com/photo-1525351484163-8eb3a73b78a3?w=400&q=80",
  "club sandwich": "https://images.unsplash.com/photo-1539252554453-67c171fc0df2?w=400&q=80",
  "mushroom cheese omelette": "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=400&q=80",
  "lotus french toast": "https://images.unsplash.com/photo-1485962398705-ef6a13c41ec8?w=400&q=80",
  "spanish latte": "https://images.unsplash.com/photo-1461023058943-07fcbe342818?w=400&q=80",
};

export default function MenuPage() {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("most-liked");
  const [search, setSearch] = useState("");
  const sectionRefs = useRef({});
  const navRef = useRef(null);
  const pillRefs = useRef({});
  const pendingScroll = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const items = await base44.entities.StoreProduct.list("-created_date", 200);
        if (!mounted) return;
        setAllItems((items || []).filter((i) => i.is_available !== false));
      } catch (e) {
        console.error("Menu load error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Match Most Liked items by name
  const mostLikedItems = [];
  const usedIds = new Set();
  MOST_LIKED_QUERIES.forEach(({ query, likes }) => {
    const match = allItems.find(
      (p) => !usedIds.has(p.id) && p.name.toLowerCase().includes(query)
    );
    if (match) {
      mostLikedItems.push({ ...match, _likes: likes, _img: MOST_LIKED_IMAGES[query] });
      usedIds.add(match.id);
    }
  });

  // Group remaining items by category
  const remaining = allItems.filter((p) => !usedIds.has(p.id));
  const grouped = {};
  remaining.forEach((p) => {
    const cat = p.category || "Other";
    (grouped[cat] = grouped[cat] || []).push(p);
  });

  const categories = CATEGORY_ORDER.filter((c) => grouped[c]?.length);
  // Include any categories not in our predefined order
  const extraCats = Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)).sort();
  const allCategories = [...categories, ...extraCats];

  // Build the full section list: Most Liked first, then categories
  const sections = [
    { id: "most-liked", label: "Most Liked", items: mostLikedItems, isMostLiked: true },
    ...allCategories.map((cat) => ({
      id: cat,
      label: cat,
      items: grouped[cat] || [],
      isMostLiked: false,
    })),
  ].filter((s) => s.items.length > 0);

  // IntersectionObserver to highlight active pill
  useEffect(() => {
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (pendingScroll.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.dataset.catId;
          if (id) setActiveCat(id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [sections.length]);

  // auto-scroll active pill into view
  useEffect(() => {
    const pill = pillRefs.current[activeCat];
    if (pill && navRef.current) {
      pill.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeCat]);

  const scrollToCat = useCallback((catId) => {
    const el = sectionRefs.current[catId];
    if (!el) return;
    setActiveCat(catId);
    pendingScroll.current = true;
    const top = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top, behavior: "smooth" });
    setTimeout(() => { pendingScroll.current = false; }, 700);
  }, []);

  // Filter by search
  const searching = search.trim().length > 0;
  const searchResults = searching
    ? allItems.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen bg-[#A37960]">
      {/* ── HERO ── */}
      <div className="relative bg-gradient-to-br from-[#855F4B] via-[#926A54] to-[#6B4A3A] text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-10 -left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -60, 0], y: [0, -30, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-10 -right-10 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl"
          />
        </div>
        <div className="relative max-w-2xl mx-auto px-6 pt-12 pb-8 text-center">
          <motion.div {...fadeUp(0)} className="flex items-center justify-center gap-2 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center shadow-lg">
              <Coffee className="h-6 w-6 text-[#1a1208]" />
            </div>
            <span className="text-xl font-bold tracking-wide">Bean</span>
          </motion.div>
          <motion.h1 {...fadeUp(0.1)} className="text-2xl sm:text-3xl font-bold leading-tight mb-2">
            Your daily dose of coffee happiness
          </motion.h1>
          <motion.div {...fadeUp(0.2)} className="flex items-center justify-center gap-1.5 text-white/70 text-sm">
            <Info className="h-4 w-4" />
            <span>Islamabad's First Coffee Lover's Club</span>
          </motion.div>
        </div>
      </div>

      {/* ── SEARCH + STICKY CATEGORY NAV ── */}
      {sections.length > 0 && (
        <div className="sticky top-0 z-50 bg-[#855F4B]/95 backdrop-blur-md shadow-md">
          {/* Search bar */}
          <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the menu..."
                className="w-full bg-white/10 border border-white/20 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
          </div>
          {/* Category pills */}
          {!searching && (
            <div ref={navRef} className="max-w-2xl mx-auto px-3 pb-3 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 min-w-max">
                {sections.map((s) => {
                  const isActive = activeCat === s.id;
                  return (
                    <button
                      key={s.id}
                      ref={(el) => (pillRefs.current[s.id] = el)}
                      onClick={() => scrollToCat(s.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        isActive
                          ? "bg-white text-[#6B4A3A] shadow-sm"
                          : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                      }`}
                    >
                      {s.isMostLiked && <Heart className="h-3.5 w-3.5 fill-current" />}
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONTENT ── */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-7 w-40 bg-[#926A54] rounded-lg mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-32 bg-[#926A54] rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : searching ? (
          /* Search results */
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Search className="h-5 w-5" />
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{search}"
            </h2>
            {searchResults.length === 0 ? (
              <div className="text-center py-20 text-white/60">
                <Coffee className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No items found. Try a different search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchResults.map((item) => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    image={item.image_url || CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES["Other"]}
                  />
                ))}
              </div>
            )}
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-20 text-white/60">
            <Coffee className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Menu is being updated. Please check back soon.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {sections.map((section, idx) => (
              <motion.section
                key={section.id}
                data-cat-id={section.id}
                ref={(el) => (sectionRefs.current[section.id] = el)}
                {...fadeUp(idx * 0.05)}
                className="scroll-mt-32"
              >
                {/* Section header */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {section.isMostLiked && <Heart className="h-5 w-5 fill-white" />}
                    {section.label}
                  </h2>
                  {section.isMostLiked && (
                    <p className="text-sm text-white/60 mt-0.5">According to real person likes</p>
                  )}
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {section.items.map((item) => (
                    <MenuCard
                      key={item.id}
                      item={item}
                      isMostLiked={section.isMostLiked}
                      likes={item._likes}
                      image={item._img || item.image_url || CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES["Other"]}
                    />
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer className="bg-gradient-to-br from-[#3d2b12] via-[#4a3520] to-[#5C4A3A] text-white mt-8">
        <div className="max-w-2xl mx-auto px-6 py-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center shadow-lg">
              <Coffee className="h-5 w-5 text-[#1a1208]" />
            </div>
            <span className="text-lg font-semibold">Bean</span>
          </div>
          <p className="text-[#C9B8A6] text-sm mb-5">Bean Pakistan · Islamabad</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6 max-w-sm sm:max-w-none mx-auto">
            <a
              href="https://apps.apple.com/pk/app/bean-pakistan/id6758788396"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white hover:bg-[#f0ede8] text-[#1a1208] px-4 py-3 rounded-xl transition-all hover:scale-[1.02] shadow"
            >
              <svg viewBox="0 0 814 1000" className="h-6 w-6 fill-[#1a1208] shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49 192.5-49 30.5-.1 104.5 5.6 162.1 64.4zm-170.4-195.6c43.2-51.4 73.1-122.6 73.1-193.8 0-9.9-.6-19.9-2.5-28.6-69.3 2.5-151.6 46.4-200.9 103.9-38.3 43.8-74.6 114.9-74.6 187.1 0 10.5 1.9 21.1 2.5 24.3 4.4.6 11.6 1.9 18.8 1.9 62.2.1 139.9-42 183.6-94.8z"/>
              </svg>
              <div className="text-left">
                <p className="text-[9px] text-[#5C4A3A] font-medium leading-none mb-0.5">Download on the</p>
                <p className="font-bold text-sm leading-tight">App Store</p>
              </div>
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.base6976cd7fe6e4b20fcb30cf61.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-3 rounded-xl transition-all hover:scale-[1.02]"
            >
              <svg viewBox="0 0 48 48" className="h-6 w-6 shrink-0" xmlns="http://www.w3.org/2000/svg">
                <linearGradient id="mfgp1" x1="5.16" y1="23.98" x2="42.83" y2="23.98" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#32a071"/><stop offset=".07" stopColor="#2da771"/><stop offset=".48" stopColor="#15cf74"/><stop offset=".8" stopColor="#06e775"/><stop offset="1" stopColor="#00f076"/>
                </linearGradient>
                <linearGradient id="mfgp2" x1="23.81" y1="25.63" x2="41.29" y2="8.14" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#ffd800"/><stop offset="1" stopColor="#ff8a00"/>
                </linearGradient>
                <linearGradient id="mfgp3" x1="12.58" y1="26.77" x2="28.09" y2="42.28" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#ff3a44"/><stop offset="1" stopColor="#c31162"/>
                </linearGradient>
                <linearGradient id="mfgp4" x1="4.23" y1="8.68" x2="14.34" y2="18.79" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#32a071"/><stop offset=".07" stopColor="#2da771"/><stop offset=".48" stopColor="#15cf74"/><stop offset=".8" stopColor="#06e775"/><stop offset="1" stopColor="#00f076"/>
                </linearGradient>
                <path fill="url(#mfgp1)" d="M5.16 5.47C4.6 6.05 4.27 6.97 4.27 8.2v31.6c0 1.23.33 2.15.9 2.73l.14.13L24.1 23.98v-.43L5.3 5.33l-.14.14z"/>
                <path fill="url(#mfgp2)" d="M30.38 30.26l-6.28-6.28v-.44l6.28-6.28.14.08 7.44 4.23c2.13 1.21 2.13 3.18 0 4.39l-7.44 4.22-.14.08z"/>
                <path fill="url(#mfgp3)" d="M30.52 30.18L24.1 23.77 5.16 42.72c.7.74 1.86.83 3.16.09l22.2-12.63"/>
                <path fill="url(#mfgp4)" d="M30.52 17.36L8.32 4.73C7.02 3.99 5.86 4.08 5.16 4.82L24.1 23.77l6.42-6.41z"/>
              </svg>
              <div className="text-left">
                <p className="text-[9px] text-white/50 font-medium leading-none mb-0.5">Get it on</p>
                <p className="font-bold text-sm leading-tight">Google Play</p>
              </div>
            </a>
          </div>

          <p className="text-[#8B7355] text-xs">© 2026 Bean Coffee</p>
        </div>
      </footer>
    </div>
  );
}