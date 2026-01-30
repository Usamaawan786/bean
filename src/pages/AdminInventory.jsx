import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Plus, Package, AlertTriangle, TrendingUp, Search, 
  Edit2, Trash2, Archive, History, Download 
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function AdminInventory() {
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    category: "Coffee Beans",
    current_stock: "",
    min_stock_level: "",
    unit: "kg",
    last_restock_date: new Date().toISOString().split('T')[0],
    supplier: "",
    cost_per_unit: "",
    notes: "",
    is_active: true
  });

  const [adjustData, setAdjustData] = useState({
    adjustment_type: "restock",
    quantity_changed: "",
    reason: ""
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      if (u.role !== 'admin') {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(u);
    };
    loadUser();
  }, []);

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list("-created_date", 500),
    enabled: !!user
  });

  const { data: adjustments = [] } = useQuery({
    queryKey: ["stock-adjustments"],
    queryFn: () => base44.entities.StockAdjustment.list("-created_date", 100),
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Inventory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setShowDialog(false);
      resetForm();
      toast.success("Inventory item added");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Inventory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setShowDialog(false);
      setEditingItem(null);
      resetForm();
      toast.success("Item updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Inventory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item deleted");
    }
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ item, adjustment }) => {
      const quantityChange = parseFloat(adjustment.quantity_changed);
      const newStock = item.current_stock + quantityChange;
      
      // Create adjustment record
      await base44.entities.StockAdjustment.create({
        inventory_id: item.id,
        item_name: item.name,
        adjustment_type: adjustment.adjustment_type,
        quantity_changed: quantityChange,
        previous_stock: item.current_stock,
        new_stock: newStock,
        reason: adjustment.reason
      });

      // Update inventory
      await base44.entities.Inventory.update(item.id, {
        current_stock: newStock,
        last_restock_date: adjustment.adjustment_type === 'restock' 
          ? new Date().toISOString().split('T')[0]
          : item.last_restock_date
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
      setShowAdjustDialog(false);
      setAdjustingItem(null);
      setAdjustData({ adjustment_type: "restock", quantity_changed: "", reason: "" });
      toast.success("Stock adjusted");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "Coffee Beans",
      current_stock: "",
      min_stock_level: "",
      unit: "kg",
      last_restock_date: new Date().toISOString().split('T')[0],
      supplier: "",
      cost_per_unit: "",
      notes: "",
      is_active: true
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      current_stock: parseFloat(formData.current_stock),
      min_stock_level: parseFloat(formData.min_stock_level),
      cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : undefined
    };
    
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      current_stock: item.current_stock.toString(),
      min_stock_level: item.min_stock_level.toString(),
      unit: item.unit,
      last_restock_date: item.last_restock_date || new Date().toISOString().split('T')[0],
      supplier: item.supplier || "",
      cost_per_unit: item.cost_per_unit?.toString() || "",
      notes: item.notes || "",
      is_active: item.is_active
    });
    setShowDialog(true);
  };

  const handleAdjustStock = (item) => {
    setAdjustingItem(item);
    setAdjustData({ adjustment_type: "restock", quantity_changed: "", reason: "" });
    setShowAdjustDialog(true);
  };

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    adjustStockMutation.mutate({
      item: adjustingItem,
      adjustment: adjustData
    });
  };

  // Filter inventory
  const lowStockItems = inventory.filter(item => 
    item.is_active && item.current_stock <= item.min_stock_level
  );

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesTab = activeTab === "all" ? true :
                      activeTab === "low" ? item.current_stock <= item.min_stock_level :
                      activeTab === "active" ? item.is_active : !item.is_active;
    return matchesSearch && matchesCategory && matchesTab;
  });

  // Calculate stats
  const totalValue = inventory.reduce((sum, item) => 
    sum + (item.current_stock * (item.cost_per_unit || 0)), 0
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-4xl mx-auto px-5 pt-6 pb-8">
          <Link to={createPageUrl("AdminPOS")} className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to POS
          </Link>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Inventory</h1>
              <p className="text-[#E8DED8] text-sm mt-1">Manage stock levels</p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setEditingItem(null);
                setShowDialog(true);
              }}
              className="bg-white text-[#8B7355] hover:bg-[#F5EBE8]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-blue-300" />
                <span className="text-xs text-[#E8DED8]">Total Items</span>
              </div>
              <div className="text-2xl font-bold">{inventory.length}</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-300" />
                <span className="text-xs text-[#E8DED8]">Low Stock</span>
              </div>
              <div className="text-2xl font-bold">{lowStockItems.length}</div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-300" />
                <span className="text-xs text-[#E8DED8]">Total Value</span>
              </div>
              <div className="text-xl font-bold">Rs. {totalValue.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-5 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full bg-white rounded-xl p-1">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="low" className="text-red-600 data-[state=active]:text-red-700">
              Low Stock
            </TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <div className="max-w-4xl mx-auto px-5 py-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B7355]" />
          <Input
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#E8DED8]"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="border-[#E8DED8]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Coffee Beans">Coffee Beans</SelectItem>
            <SelectItem value="Milk & Dairy">Milk & Dairy</SelectItem>
            <SelectItem value="Syrups & Flavors">Syrups & Flavors</SelectItem>
            <SelectItem value="Packaging">Packaging</SelectItem>
            <SelectItem value="Pastries">Pastries</SelectItem>
            <SelectItem value="Equipment">Equipment</SelectItem>
            <SelectItem value="Cleaning Supplies">Cleaning Supplies</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Inventory List */}
      <div className="max-w-4xl mx-auto px-5 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
            ))}
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl">
            <Package className="h-12 w-12 text-[#C9B8A6] mx-auto mb-4" />
            <p className="text-[#8B7355]">No items found</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredInventory.map((item, i) => {
              const isLowStock = item.current_stock <= item.min_stock_level;
              const stockPercentage = (item.current_stock / item.min_stock_level) * 100;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-white rounded-2xl border-2 p-4 ${
                    isLowStock ? 'border-red-200' : 'border-[#E8DED8]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#5C4A3A]">{item.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        {isLowStock && (
                          <Badge className="bg-red-500 text-white text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-[#8B7355] space-y-0.5">
                        {item.supplier && <p>Supplier: {item.supplier}</p>}
                        {item.cost_per_unit && (
                          <p>Cost: Rs. {item.cost_per_unit}/{item.unit}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-2xl font-bold mb-1 ${
                        isLowStock ? 'text-red-600' : 'text-[#5C4A3A]'
                      }`}>
                        {item.current_stock} {item.unit}
                      </div>
                      <div className="text-xs text-[#8B7355]">
                        Min: {item.min_stock_level} {item.unit}
                      </div>
                    </div>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(stockPercentage, 100)}%` }}
                      className={`h-full ${
                        stockPercentage <= 50 ? 'bg-red-500' :
                        stockPercentage <= 100 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAdjustStock(item)}
                      className="flex-1 bg-[#8B7355] hover:bg-[#6B5744]"
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Adjust
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Delete this item?")) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Item Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Coffee Beans">Coffee Beans</SelectItem>
                  <SelectItem value="Milk & Dairy">Milk & Dairy</SelectItem>
                  <SelectItem value="Syrups & Flavors">Syrups & Flavors</SelectItem>
                  <SelectItem value="Packaging">Packaging</SelectItem>
                  <SelectItem value="Pastries">Pastries</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Cleaning Supplies">Cleaning Supplies</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Current Stock</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.current_stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_stock: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Min Level</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_stock_level: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Unit</Label>
              <Select value={formData.unit} onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="liters">liters</SelectItem>
                  <SelectItem value="pieces">pieces</SelectItem>
                  <SelectItem value="boxes">boxes</SelectItem>
                  <SelectItem value="bags">bags</SelectItem>
                  <SelectItem value="bottles">bottles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Supplier</Label>
              <Input
                value={formData.supplier}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
              />
            </div>

            <div>
              <Label>Cost per Unit (PKR)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, cost_per_unit: e.target.value }))}
              />
            </div>

            <div>
              <Label>Last Restock Date</Label>
              <Input
                type="date"
                value={formData.last_restock_date}
                onChange={(e) => setFormData(prev => ({ ...prev, last_restock_date: e.target.value }))}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-[#8B7355] hover:bg-[#6B5744]"
              >
                {editingItem ? "Update" : "Add"} Item
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Adjust Stock: {adjustingItem?.name}</DialogTitle>
          </DialogHeader>

          {adjustingItem && (
            <div className="mb-4 p-4 bg-[#F5EBE8] rounded-xl">
              <p className="text-sm text-[#8B7355]">Current Stock</p>
              <p className="text-2xl font-bold text-[#5C4A3A]">
                {adjustingItem.current_stock} {adjustingItem.unit}
              </p>
            </div>
          )}

          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <div>
              <Label>Adjustment Type</Label>
              <Select 
                value={adjustData.adjustment_type} 
                onValueChange={(v) => setAdjustData(prev => ({ ...prev, adjustment_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restock">Restock</SelectItem>
                  <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
                  <SelectItem value="wastage">Wastage</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity (use negative for decrease)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 10 or -5"
                value={adjustData.quantity_changed}
                onChange={(e) => setAdjustData(prev => ({ ...prev, quantity_changed: e.target.value }))}
                required
              />
              {adjustData.quantity_changed && adjustingItem && (
                <p className="text-xs text-[#8B7355] mt-1">
                  New stock: {(adjustingItem.current_stock + parseFloat(adjustData.quantity_changed || 0)).toFixed(2)} {adjustingItem.unit}
                </p>
              )}
            </div>

            <div>
              <Label>Reason</Label>
              <Textarea
                value={adjustData.reason}
                onChange={(e) => setAdjustData(prev => ({ ...prev, reason: e.target.value }))}
                rows={2}
                placeholder="Why is this adjustment being made?"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAdjustDialog(false);
                  setAdjustingItem(null);
                  setAdjustData({ adjustment_type: "restock", quantity_changed: "", reason: "" });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={adjustStockMutation.isPending}
                className="flex-1 bg-[#8B7355] hover:bg-[#6B5744]"
              >
                Adjust Stock
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}