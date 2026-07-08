import { useEffect, useState, useRef, useCallback } from "react";
import { Coffee } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45 }
});

const formatPKR = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [itemsByCat, setItemsByCat] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState(null);
  const sectionRefs = useRef({});
  const navRef = useRef(null);
  const pillRefs = useRef({});
  const pendingScroll = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [cats, items] = await Promise.all([
          base44.entities.MenuCategory.list(),
          base44.entities.MenuItem.list()
        ]);
        if (!mounted) return;

        const sortedCats = (cats || [])
          .filter((c) => c.is_active !== false)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const available = (items || []).filter((i) => i.is_available !== false);
        const grouped = {};
        available.forEach((it) => {
          grouped[it.category_id] = grouped[it.category_id] || [];
          grouped[it.category_id].push(it);
        });

        const catsWithItems = sortedCats.filter((c) => grouped[c.id]?.length);

        setCategories(catsWithItems);
        setItemsByCat(grouped);
        if (catsWithItems.length) setActiveCat(catsWithItems[0].id);
      } catch (e) {
        console.error("Menu load error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // IntersectionObserver to highlight active pill
  useEffect(() => {
    if (!categories.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (pendingScroll.current) return;
        // pick the topmost intersecting section
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
  }, [categories]);

  // auto-scroll active pill into view in nav
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
    const top = el.getBoundingClientRect().top + window.scrollY - 64; // nav height offset
    window.scrollTo({ top, behavior: "smooth" });
    setTimeout(() => { pendingScroll.current = false; }, 700);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* ── HERO ── */}
      <div className="relative bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div animate={{ x: [0, 80, 0], y: [0, 40, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-10 -left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <motion.div animate={{ x: [0, -60, 0], y: [0, -30, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-10 -right-10 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto px-6 py-14 text-center w-full">
          <motion.div {...fadeUp(0)} className="flex items-center justify-center gap-2 mb-6">
            <Coffee className="h-6 w-6 text-white" />
            <span className="text-lg font-semibold tracking-wide">Bean</span>
          </motion.div>
          <motion.h1 {...fadeUp(0.1)} className="text-3xl sm:text-4xl font-bold leading-tight mb-3">
            Our Menu
          </motion.h1>
          <motion.p {...fadeUp(0.2)} className="text-[#E8DED8] text-sm sm:text-base">
            Islamabad's First Coffee Lover's Club
          </motion.p>
        </div>
      </div>

      {/* ── STICKY CATEGORY NAV ── */}
      {categories.length > 0 && (
        <div ref={navRef} className="sticky top-0 z-50 bg-[#F5F1ED]/95 backdrop-blur-md border-b border-[#E8DED8]">
          <div className="max-w-2xl mx-auto px-3 py-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max justify-start">
              {categories.map((c) => {
                const isActive = activeCat === c.id;
                return (
                  <button
                    key={c.id}
                    ref={(el) => (pillRefs.current[c.id] = el)}
                    onClick={() => scrollToCat(c.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-[#8B7355] text-white shadow-sm"
                        : "bg-white text-[#8B7355] border border-[#E8DED8] hover:border-[#D4C4B0]"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MENU SECTIONS ── */}
      <div className="max-w-2xl mx-auto px-5 py-8">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-7 w-40 bg-[#EBE5DF] rounded-lg mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-16 bg-white rounded-2xl border border-[#E8DED8]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 text-[#8B7355]">
            <Coffee className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Menu is being updated. Please check back soon.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((cat, idx) => (
              <motion.section
                key={cat.id}
                data-cat-id={cat.id}
                ref={(el) => (sectionRefs.current[cat.id] = el)}
                {...fadeUp(idx * 0.05)}
                className="scroll-mt-20"
              >
                <h2 className="text-xl font-bold text-[#5C4A3A] mb-4 pb-2 border-b border-[#E8DED8]">
                  {cat.name}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(itemsByCat[cat.id] || [])
                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl border border-[#E8DED8] shadow-sm px-4 py-3.5 flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#5C4A3A] text-sm sm:text-base leading-snug truncate">
                            {item.name}
                          </p>
                          {item.description && (
                            <p className="text-xs text-[#8B7355] mt-0.5 line-clamp-1">{item.description}</p>
                          )}
                        </div>
                        <p className="font-semibold text-[#8B7355] text-sm whitespace-nowrap">
                          {formatPKR(item.base_price)}
                        </p>
                      </div>
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