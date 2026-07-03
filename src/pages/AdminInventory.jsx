import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IngredientsTab from "@/components/admin/inventory/IngredientsTab";
import RecipesTab from "@/components/admin/inventory/RecipesTab";
import ModifiersTab from "@/components/admin/inventory/ModifiersTab";
import BatchesTab from "@/components/admin/inventory/BatchesTab";
import NegativeBalancePanel from "@/components/admin/inventory/NegativeBalancePanel";
import CatalogTab from "@/components/admin/catalog/CatalogTab";
import DemandForecastTab from "@/components/admin/inventory/DemandForecastTab";

export default function AdminInventory() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("catalog");

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      if (!['admin', 'manager'].includes(u.role)) {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(u);
    };
    loadUser();
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF] pb-20">
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-5xl mx-auto px-5 pt-6 pb-8">
          <div className="flex items-center justify-between mb-4">
            <Link to={createPageUrl("AdminPOS")} className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm">
              <ArrowLeft className="h-4 w-4" /> Back to POS
            </Link>
            <Link to="/inventory-audit" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-2 rounded-xl border border-white/20">
              <ShieldCheck className="h-4 w-4" /> Audit
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Inventory Engine</h1>
          <p className="text-[#E8DED8] text-sm mt-1">Ingredient stock, recipes, modifiers & batches</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">
        <NegativeBalancePanel />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full bg-white rounded-xl p-1">
            <TabsTrigger value="catalog">Catalog</TabsTrigger>
            <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
          </TabsList>
          <TabsContent value="catalog" className="mt-4"><CatalogTab /></TabsContent>
          <TabsContent value="ingredients" className="mt-4"><IngredientsTab /></TabsContent>
          <TabsContent value="recipes" className="mt-4"><RecipesTab /></TabsContent>
          <TabsContent value="modifiers" className="mt-4"><ModifiersTab /></TabsContent>
          <TabsContent value="batches" className="mt-4"><BatchesTab /></TabsContent>
          <TabsContent value="forecast" className="mt-4"><DemandForecastTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}