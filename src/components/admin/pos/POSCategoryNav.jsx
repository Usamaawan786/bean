import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function POSCategoryNav({ onAddToCart }) {
  const [selectedRootId, setSelectedRootId] = useState(null);
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["menu-categories"],
    queryFn: () => base44.entities.MenuCategory.list()
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu-items"],
    queryFn: () => base44.entities.MenuItem.list()
  });

  const rootCats = useMemo(() =>
    categories.filter(c => !c.parent_category_id && c.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [categories]
  );

  const subCats = useMemo(() => {
    if (!selectedRootId) return [];
    return categories.filter(c => c.parent_category_id === selectedRootId && c.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [categories, selectedRootId]);

  useEffect(() => {
    if (rootCats.length > 0 && (!selectedRootId || !rootCats.find(c => c.id === selectedRootId))) {
      setSelectedRootId(rootCats[0].id);
    }
  }, [rootCats, selectedRootId]);

  // Collect all category IDs under the selected node
  const activeCategoryIds = useMemo(() => {
    if (selectedSubId) return [selectedSubId];
    if (!selectedRootId) return [];
    const ids = [selectedRootId];
    const addChildren = (pid) => {
      categories.filter(c => c.parent_category_id === pid).forEach(c => { ids.push(c.id); addChildren(c.id); });
    };
    addChildren(selectedRootId);
    return ids;
  }, [categories, selectedRootId, selectedSubId]);

  const filteredItems = useMemo(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return menuItems.filter(i => i.is_available && i.name.toLowerCase().includes(term));
    }
    return menuItems
      .filter(i => i.is_available && activeCategoryIds.includes(i.category_id))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [menuItems, activeCategoryIds, searchTerm]);

  const handleAdd = (item) => {
    onAddToCart({
      id: item.id,
      name: item.name,
      price: item.base_price,
      image_url: item.image_url,
      _isMenuItem: true
    });
  };

  return (
    <div className="lg:col-span-2 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
        <Input placeholder="Search menu items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-[#E8DED8]" />
      </div>

      {!searchTerm && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {rootCats.map(cat => (
              <button key={cat.id} onClick={() => { setSelectedRootId(cat.id); setSelectedSubId(null); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${selectedRootId === cat.id ? "bg-[#8B7355] text-white shadow-md" : "bg-white text-[#5C4A3A] border border-[#E8DED8] hover:border-[#8B7355]"}`}>
                {cat.name}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {subCats.length > 0 && (
              <motion.div key={selectedRootId} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setSelectedSubId(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${!selectedSubId ? "bg-[#F5EBE8] text-[#5C4A3A] border border-[#8B7355]" : "bg-white text-[#8B7355] border border-[#E8DED8]"}`}>
                  All
                </button>
                {subCats.map(sub => (
                  <button key={sub.id} onClick={() => setSelectedSubId(sub.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedSubId === sub.id ? "bg-[#F5EBE8] text-[#5C4A3A] border border-[#8B7355]" : "bg-white text-[#8B7355] border border-[#E8DED8]"}`}>
                    {sub.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredItems.map(item => (
            <motion.button key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => handleAdd(item)} className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-left hover:border-[#8B7355] transition-colors">
              {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-32 object-cover rounded-xl mb-3" />}
              <h3 className="font-semibold text-[#5C4A3A] text-sm">{item.name}</h3>
              <p className="font-bold text-[#5C4A3A] mt-2">PKR {item.base_price?.toFixed(2)}</p>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      {filteredItems.length === 0 && (
        <p className="text-center text-[#C9B8A6] py-8">
          {menuItems.length === 0 ? "No menu items yet — set up your catalog in the Inventory Engine" : "No items match your search"}
        </p>
      )}
    </div>
  );
}