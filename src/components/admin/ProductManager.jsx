import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Package, DollarSign, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function ProductManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Coffee Beans",
    weight: "",
    origin: "",
    roast_level: "Medium",
    in_stock: true,
    stock_quantity: "",
    featured: false,
    image_url: ""
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-management"],
    queryFn: () => base44.entities.Product.list()
  });

  const createProductMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-management"] });
      queryClient.invalidateQueries({ queryKey: ["products-admin"] });
      toast.success("Product created successfully");
      closeDialog();
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-management"] });
      queryClient.invalidateQueries({ queryKey: ["products-admin"] });
      toast.success("Product updated successfully");
      closeDialog();
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-management"] });
      queryClient.invalidateQueries({ queryKey: ["products-admin"] });
      toast.success("Product deleted successfully");
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const openDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        category: "Coffee Beans",
        weight: "",
        origin: "",
        roast_level: "Medium",
        in_stock: true,
        stock_quantity: "",
        featured: false,
        image_url: ""
      });
    }
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingProduct(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      price: parseFloat(formData.price),
      stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#5C4A3A]">Product Management</h2>
          <p className="text-sm text-[#8B7355]">Add and manage products for POS</p>
        </div>
        <Button
          onClick={() => openDialog()}
          className="bg-[#8B7355] hover:bg-[#6B5744] rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#E8DED8] p-4"
          >
            {product.image_url && (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-40 object-cover rounded-xl mb-3"
              />
            )}
            
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-[#5C4A3A]">{product.name}</h3>
                  <p className="text-xs text-[#8B7355]">{product.category}</p>
                </div>
                {product.featured && (
                  <span className="bg-[#F5EBE8] text-[#8B7355] text-xs px-2 py-1 rounded-full">
                    Featured
                  </span>
                )}
              </div>

              <p className="text-xl font-bold text-[#5C4A3A]">PKR {product.price.toFixed(2)}</p>
              
              <div className="flex items-center gap-2 text-xs text-[#8B7355]">
                <Package className="h-3 w-3" />
                <span>{product.in_stock ? `In Stock (${product.stock_quantity || 0})` : "Out of Stock"}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openDialog(product)}
                  className="flex-1 rounded-xl border-[#E8DED8]"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm("Delete this product?")) {
                      deleteProductMutation.mutate(product.id);
                    }
                  }}
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#5C4A3A]">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Product Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="border-[#E8DED8]"
                />
              </div>

              <div>
                <Label>Price (PKR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  className="border-[#E8DED8]"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border-[#E8DED8]"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="border-[#E8DED8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Coffee Beans">Coffee Beans</SelectItem>
                    <SelectItem value="Matcha">Matcha</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Merchandise">Merchandise</SelectItem>
                    <SelectItem value="Gift Sets">Gift Sets</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Weight/Size</Label>
                <Input
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="e.g., 250g, 1kg"
                  className="border-[#E8DED8]"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Origin</Label>
                <Input
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  placeholder="e.g., Colombia, Ethiopia"
                  className="border-[#E8DED8]"
                />
              </div>

              <div>
                <Label>Roast Level</Label>
                <Select
                  value={formData.roast_level}
                  onValueChange={(value) => setFormData({ ...formData, roast_level: value })}
                >
                  <SelectTrigger className="border-[#E8DED8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Light">Light</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Dark">Dark</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Stock Quantity</Label>
              <Input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                className="border-[#E8DED8]"
              />
            </div>

            <div>
              <Label>Product Image</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="border-[#E8DED8]"
                />
                {isUploading && <span className="text-sm text-[#8B7355]">Uploading...</span>}
              </div>
              {formData.image_url && (
                <img src={formData.image_url} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-xl" />
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.in_stock}
                  onCheckedChange={(checked) => setFormData({ ...formData, in_stock: checked })}
                />
                <Label>In Stock</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                />
                <Label>Featured</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 bg-[#8B7355] hover:bg-[#6B5744] rounded-xl">
                {editingProduct ? "Update Product" : "Create Product"}
              </Button>
              <Button type="button" variant="outline" onClick={closeDialog} className="rounded-xl">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}