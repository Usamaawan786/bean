import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronRight, ChevronDown, FolderOpen, Folder, Edit, Trash2, Package, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import MenuItemDrawer from "@/components/admin/catalog/MenuItemDrawer";

function buildTree(categories) {
  const map = {};
  const roots = [];
  categories.forEach(c => { map[c.id] = { ...c, children: [] }; });
  categories.forEach(c => {
    if (c.parent_category_id && map[c.parent_category_id]) {
      map[c.parent_category_id].children.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  });
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    nodes.forEach(n => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

function CategoryNode({ node, depth, selectedId, onSelect, onEdit, onDelete, onMove }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-2 rounded-lg cursor-pointer transition-colors group ${isSelected ? "bg-[#F5EBE8] border border-[#8B7355]" : "hover:bg-[#F5EBE8]/50"}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="w-5 h-5 flex items-center justify-center shrink-0">
          {hasChildren ? (expanded ? <ChevronDown className="h-4 w-4 text-[#8B7355]" /> : <ChevronRight className="h-4 w-4 text-[#8B7355]" />) : <span className="w-4" />}
        </button>
        {expanded ? <FolderOpen className="h-4 w-4 text-[#8B7355] shrink-0" /> : <Folder className="h-4 w-4 text-[#8B7355] shrink-0" />}
        <span className={`flex-1 text-sm truncate ${isSelected ? "font-semibold text-[#5C4A3A]" : "text-[#5C4A3A]"}`}>{node.name}</span>
        {!node.is_active && <span className="text-xs text-[#C9B8A6] italic">hidden</span>}
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onMove(node, 'up'); }} className="p-1 rounded hover:bg-white"><ArrowUp className="h-3 w-3 text-[#8B7355]" /></button>
          <button onClick={(e) => { e.stopPropagation(); onMove(node, 'down'); }} className="p-1 rounded hover:bg-white"><ArrowDown className="h-3 w-3 text-[#8B7355]" /></button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(node); }} className="p-1 rounded hover:bg-white"><Edit className="h-3 w-3 text-[#8B7355]" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(node); }} className="p-1 rounded hover:bg-white"><Trash2 className="h-3 w-3 text-red-400" /></button>
        </div>
      </div>
      {expanded && node.children.map(child => (
        <CategoryNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
      ))}
    </div>
  );
}

export default function CatalogTab() {
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catFormName, setCatFormName] = useState("");
  const [catFormParent, setCatFormParent] = useState("");
  const [catFormActive, setCatFormActive] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [showItemDrawer, setShowItemDrawer] = useState(false);
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["menu-categories"],
    queryFn: () => base44.entities.MenuCategory.list()
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu-items"],
    queryFn: () => base44.entities.MenuItem.list()
  });

  const tree = useMemo(() => buildTree(categories), [categories]);
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const categoryItems = menuItems.filter(i => i.category_id === selectedCategoryId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const openCatForm = (cat = null, parentId = "") => {
    setEditingCat(cat);
    setCatFormName(cat?.name || "");
    setCatFormParent(cat?.parent_category_id || parentId);
    setCatFormActive(cat?.is_active !== false);
    setShowCatForm(true);
  };

  const saveCat = async () => {
    const data = { name: catFormName, parent_category_id: catFormParent || null, is_active: catFormActive };
    if (editingCat) {
      await base44.entities.MenuCategory.update(editingCat.id, data);
      toast.success("Category updated");
    } else {
      data.sort_order = categories.filter(c => (c.parent_category_id || "") === (catFormParent || "")).length;
      await base44.entities.MenuCategory.create(data);
      toast.success("Category created");
    }
    queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
    setShowCatForm(false);
  };

  const deleteCat = async (cat) => {
    if (!confirm(`Delete "${cat.name}"? Items will be moved to Archive.`)) return;
    let archive = categories.find(c => c.name === "Archive" && !c.parent_category_id);
    if (!archive) archive = await base44.entities.MenuCategory.create({ name: "Archive", is_active: false, sort_order: 9999 });
    const items = menuItems.filter(i => i.category_id === cat.id);
    for (const item of items) await base44.entities.MenuItem.update(item.id, { category_id: archive.id });
    const children = categories.filter(c => c.parent_category_id === cat.id);
    for (const child of children) await base44.entities.MenuCategory.update(child.id, { parent_category_id: archive.id });
    await base44.entities.MenuCategory.delete(cat.id);
    queryClient.invalidateQueries({ queryKey: ["menu-categories", "menu-items"] });
    if (selectedCategoryId === cat.id) setSelectedCategoryId(null);
    toast.success("Category deleted");
  };

  const moveCat = async (cat, direction) => {
    const siblings = categories.filter(c => (c.parent_category_id || "") === (cat.parent_category_id || "")).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const idx = siblings.findIndex(s => s.id === cat.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    await base44.entities.MenuCategory.update(cat.id, { sort_order: siblings[swapIdx].sort_order ?? swapIdx });
    await base44.entities.MenuCategory.update(siblings[swapIdx].id, { sort_order: cat.sort_order ?? idx });
    queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await base44.entities.MenuItem.delete(item.id);
    queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    toast.success("Item deleted");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 lg:col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#5C4A3A]">Categories</h3>
          <Button size="sm" onClick={() => openCatForm(null, "")} className="bg-[#8B7355] hover:bg-[#6B5744] rounded-lg"><Plus className="h-3 w-3 mr-1" /> Add</Button>
        </div>
        <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
          {tree.length === 0 && <p className="text-sm text-[#C9B8A6] text-center py-8">No categories yet</p>}
          {tree.map(node => (
            <CategoryNode key={node.id} node={node} depth={0} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} onEdit={openCatForm} onDelete={deleteCat} onMove={moveCat} />
          ))}
        </div>
        {selectedCategory && (
          <Button size="sm" variant="outline" className="mt-3 w-full rounded-lg border-dashed border-[#8B7355] text-[#8B7355]"
            onClick={() => openCatForm(null, selectedCategoryId)}>
            <Plus className="h-3 w-3 mr-1" /> Subcategory in "{selectedCategory.name}"
          </Button>
        )}
      </div>

      <div className="lg:col-span-2">
        {!selectedCategory ? (
          <div className="bg-white rounded-2xl border border-[#E8DED8] p-12 text-center">
            <Package className="h-12 w-12 text-[#C9B8A6] mx-auto mb-3" />
            <p className="text-[#8B7355]">Select a category to manage its items</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8DED8] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[#5C4A3A] text-lg">{selectedCategory.name}</h3>
                <p className="text-sm text-[#8B7355]">{categoryItems.length} items</p>
              </div>
              <Button size="sm" onClick={() => { setEditingItem({ category_id: selectedCategoryId }); setShowItemDrawer(true); }} className="bg-[#8B7355] hover:bg-[#6B5744] rounded-lg">
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {categoryItems.length === 0 && <p className="text-sm text-[#C9B8A6] text-center py-8">No items in this category</p>}
              {categoryItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E8DED8] hover:border-[#8B7355] transition-colors group">
                  {item.image_url ? <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-[#F5EBE8] flex items-center justify-center shrink-0"><Package className="h-5 w-5 text-[#C9B8A6]" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#5C4A3A] text-sm truncate">{item.name}</p>
                    <p className="text-xs text-[#8B7355]">PKR {item.base_price}</p>
                  </div>
                  {!item.is_available && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Unavailable</span>}
                  <div className="hidden group-hover:flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingItem(item); setShowItemDrawer(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteItem(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={showCatForm} onOpenChange={setShowCatForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingCat ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={catFormName} onChange={e => setCatFormName(e.target.value)} className="border-[#E8DED8]" /></div>
            <div className="flex items-center gap-2"><Switch checked={catFormActive} onCheckedChange={setCatFormActive} /><Label>Active</Label></div>
            <Button onClick={saveCat} disabled={!catFormName.trim()} className="w-full bg-[#8B7355] hover:bg-[#6B5744]">
              {editingCat ? "Update" : "Create"} Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showItemDrawer && (
        <MenuItemDrawer item={editingItem} open={showItemDrawer}
          onClose={() => { setShowItemDrawer(false); setEditingItem(null); }}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ["menu-items"] }); setShowItemDrawer(false); setEditingItem(null); }}
          categories={categories} />
      )}
    </div>
  );
}