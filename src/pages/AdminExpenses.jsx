import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Upload, DollarSign, TrendingDown, Calendar, Filter, Search, Edit2, Trash2, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AdminExpenses() {
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: "Supplies",
    amount: "",
    description: "",
    vendor: "",
    receipt_url: "",
    payment_method: "Cash",
    notes: "",
    status: "Paid"
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

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date", 500),
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowDialog(false);
      resetForm();
      toast.success("Expense added successfully");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowDialog(false);
      setEditingExpense(null);
      resetForm();
      toast.success("Expense updated successfully");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted");
    }
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: "Supplies",
      amount: "",
      description: "",
      vendor: "",
      receipt_url: "",
      payment_method: "Cash",
      notes: "",
      status: "Paid"
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, amount: parseFloat(formData.amount) };
    
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      vendor: expense.vendor || "",
      receipt_url: expense.receipt_url || "",
      payment_method: expense.payment_method,
      notes: expense.notes || "",
      status: expense.status
    });
    setShowDialog(true);
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, receipt_url: file_url }));
      toast.success("Receipt uploaded");
    } catch (error) {
      toast.error("Failed to upload receipt");
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exp.vendor?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || exp.category === selectedCategory;
    const matchesMonth = exp.date.startsWith(selectedMonth);
    return matchesSearch && matchesCategory && matchesMonth;
  });

  // Calculate stats
  const monthTotal = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const categoryTotals = filteredExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

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
              <h1 className="text-3xl font-bold">Expenses</h1>
              <p className="text-[#E8DED8] text-sm mt-1">Track & manage expenses</p>
            </div>
            <div className="flex gap-2">
              <a 
                href={base44.agents.getWhatsAppConnectURL('expense_tracker')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors text-sm font-medium"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <Button
                onClick={() => {
                  resetForm();
                  setEditingExpense(null);
                  setShowDialog(true);
                }}
                className="bg-white text-[#8B7355] hover:bg-[#F5EBE8]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-300" />
                <span className="text-xs text-[#E8DED8]">Month Total</span>
              </div>
              <div className="text-2xl font-bold">Rs. {monthTotal.toLocaleString()}</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-amber-300" />
                <span className="text-xs text-[#E8DED8]">Top Category</span>
              </div>
              <div className="text-xl font-bold">{topCategory?.[0] || "N/A"}</div>
              <div className="text-xs text-[#E8DED8]">Rs. {topCategory?.[1]?.toLocaleString() || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-4xl mx-auto px-5 py-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B7355]" />
          <Input
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#E8DED8]"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="border-[#E8DED8]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Supplies">Supplies</SelectItem>
                <SelectItem value="Ingredients">Ingredients</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Utilities">Utilities</SelectItem>
                <SelectItem value="Rent">Rent</SelectItem>
                <SelectItem value="Salaries">Salaries</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40 border-[#E8DED8]"
          />
        </div>
      </div>

      {/* Expenses List */}
      <div className="max-w-4xl mx-auto px-5 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl">
            <DollarSign className="h-12 w-12 text-[#C9B8A6] mx-auto mb-4" />
            <p className="text-[#8B7355]">No expenses found</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredExpenses.map((expense, i) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-[#E8DED8] p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#5C4A3A]">{expense.description}</h3>
                      <span className="text-xs bg-[#F5EBE8] text-[#8B7355] px-2 py-0.5 rounded-full">
                        {expense.category}
                      </span>
                    </div>
                    
                    <div className="text-sm text-[#8B7355] space-y-0.5">
                      {expense.vendor && <p>Vendor: {expense.vendor}</p>}
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                      <p>Payment: {expense.payment_method}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold text-[#5C4A3A] mb-2">
                      Rs. {expense.amount.toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(expense)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Delete this expense?")) {
                            deleteMutation.mutate(expense.id);
                          }
                        }}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {expense.receipt_url && (
                  <div className="mt-3 pt-3 border-t border-[#E8DED8]">
                    <a
                      href={expense.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#8B7355] hover:underline flex items-center gap-1"
                    >
                      <Upload className="h-3 w-3" />
                      View Receipt
                    </a>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
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
                  <SelectItem value="Supplies">Supplies</SelectItem>
                  <SelectItem value="Ingredients">Ingredients</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Rent">Rent</SelectItem>
                  <SelectItem value="Salaries">Salaries</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Amount (PKR)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Vendor</Label>
              <Input
                value={formData.vendor}
                onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={formData.payment_method} onValueChange={(v) => setFormData(prev => ({ ...prev, payment_method: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Receipt</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleReceiptUpload}
                disabled={uploadingReceipt}
              />
              {uploadingReceipt && <p className="text-xs text-[#8B7355] mt-1">Uploading...</p>}
              {formData.receipt_url && (
                <a href={formData.receipt_url} target="_blank" className="text-xs text-[#8B7355] hover:underline mt-1 block">
                  View uploaded receipt
                </a>
              )}
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
                  setEditingExpense(null);
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
                {editingExpense ? "Update" : "Add"} Expense
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}