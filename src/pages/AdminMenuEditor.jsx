import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, FolderOpen, Coffee } from "lucide-react";
import BrandingSection from "@/components/admin/menu/BrandingSection";
import CategoriesSection from "@/components/admin/menu/CategoriesSection";
import ItemsSection from "@/components/admin/menu/ItemsSection";

const TABS = [
  { id: "branding", label: "Branding", icon: ImageIcon },
  { id: "categories", label: "Categories", icon: FolderOpen },
  { id: "items", label: "Items", icon: Coffee },
];

export default function AdminMenuEditor() {
  const [authed, setAuthed] = useState(null);
  const [tab, setTab] = useState("branding");

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        if (!["admin", "super_admin", "manager"].includes(u.role)) {
          setAuthed(false);
        } else {
          setAuthed(true);
        }
      } catch {
        setAuthed(false);
      }
    })();
  }, []);

  if (authed === null) {
    return <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center text-[#8B7355]">Loading…</div>;
  }
  if (authed === false) {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex flex-col items-center justify-center gap-3 text-[#5C4A3A]">
        <p>Admin access required.</p>
        <Link to="/staff" className="text-[#8B7355] underline">Go to staff login</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      <div className="bg-white border-b border-[#E8DED8] sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/StaffPortal" className="p-1.5 rounded-lg hover:bg-[#F5EBE8] text-[#7D5A46]">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-bold text-[#5C4A3A] leading-tight">Menu Editor</h1>
              <p className="text-xs text-[#8B7355]">Edit branding, categories and items — changes go live instantly.</p>
            </div>
          </div>
          <Link to="/menu" className="text-sm text-[#8B7355] hover:underline">View menu →</Link>
        </div>
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
                  active ? "border-[#8B7355] text-[#5C4A3A] font-medium" : "border-transparent text-[#8B7355] hover:text-[#5C4A3A]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {tab === "branding" && <BrandingSection />}
        {tab === "categories" && <CategoriesSection />}
        {tab === "items" && <ItemsSection />}
      </div>
    </div>
  );
}