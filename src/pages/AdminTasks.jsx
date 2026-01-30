import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, CheckCircle2, Clock, AlertCircle, Lightbulb, MessageCircle, Sparkles } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";

const priorityColors = {
  Low: "bg-gray-100 text-gray-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Urgent: "bg-red-100 text-red-700"
};

const statusIcons = {
  Backlog: Clock,
  "To Do": AlertCircle,
  "In Progress": Clock,
  Completed: CheckCircle2,
  Cancelled: AlertCircle
};

export default function AdminTasks() {
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeTab, setActiveTab] = useState("todo");
  const [aiOffersEnabled, setAiOffersEnabled] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Other",
    priority: "Medium",
    status: "Backlog",
    assigned_to: "",
    due_date: "",
    notes: ""
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

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["business-tasks"],
    queryFn: () => base44.entities.BusinessTask.list("-created_date", 500),
    enabled: !!user
  });

  // Check AI automation status
  useEffect(() => {
    const checkAutomation = async () => {
      if (!user) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_BASE44_API_URL}/automations`, {
          headers: {
            'Authorization': `Bearer ${await base44.auth.getToken()}`
          }
        });
        const automations = await response.json();
        const aiAutomation = automations.find(a => a.name === "Daily AI Offer Generation");
        if (aiAutomation) {
          setAiOffersEnabled(aiAutomation.is_active);
        }
      } catch (error) {
        console.error("Failed to check automation status", error);
      }
    };
    checkAutomation();
  }, [user]);

  const toggleAiOffers = async (enabled) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE44_API_URL}/automations`, {
        headers: {
          'Authorization': `Bearer ${await base44.auth.getToken()}`
        }
      });
      const automations = await response.json();
      const aiAutomation = automations.find(a => a.name === "Daily AI Offer Generation");
      
      if (aiAutomation) {
        await fetch(`${import.meta.env.VITE_BASE44_API_URL}/automations/${aiAutomation.id}/toggle`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await base44.auth.getToken()}`
          }
        });
        setAiOffersEnabled(enabled);
        toast.success(`AI offers ${enabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      toast.error("Failed to toggle AI offers");
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BusinessTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-tasks"] });
      setShowDialog(false);
      resetForm();
      toast.success("Task created");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BusinessTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-tasks"] });
      setShowDialog(false);
      setEditingTask(null);
      resetForm();
      toast.success("Task updated");
    }
  });

  const quickUpdateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.BusinessTask.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-tasks"] });
      toast.success("Status updated");
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "Other",
      priority: "Medium",
      status: "Backlog",
      assigned_to: "",
      due_date: "",
      notes: ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      category: task.category,
      priority: task.priority,
      status: task.status,
      assigned_to: task.assigned_to || "",
      due_date: task.due_date || "",
      notes: task.notes || ""
    });
    setShowDialog(true);
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === "todo") return task.status === "To Do" || task.status === "Backlog";
    if (activeTab === "progress") return task.status === "In Progress";
    if (activeTab === "completed") return task.status === "Completed";
    return true;
  });

  const taskCounts = {
    todo: tasks.filter(t => t.status === "To Do" || t.status === "Backlog").length,
    progress: tasks.filter(t => t.status === "In Progress").length,
    completed: tasks.filter(t => t.status === "Completed").length
  };

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
              <h1 className="text-3xl font-bold">Business Tasks</h1>
              <p className="text-[#E8DED8] text-sm mt-1">Ideas, suggestions & to-dos</p>
            </div>
            <div className="flex gap-2">
              <a 
                href={base44.agents.getWhatsAppConnectURL('business_task_manager')}
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
                  setEditingTask(null);
                  setShowDialog(true);
                }}
                className="bg-white text-[#8B7355] hover:bg-[#F5EBE8]"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>

          {/* Stats & Controls */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                <div className="text-2xl font-bold">{taskCounts.todo}</div>
                <div className="text-xs text-[#E8DED8]">To Do</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                <div className="text-2xl font-bold">{taskCounts.progress}</div>
                <div className="text-xs text-[#E8DED8]">In Progress</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                <div className="text-2xl font-bold">{taskCounts.completed}</div>
                <div className="text-xs text-[#E8DED8]">Completed</div>
              </div>
            </div>

            {/* AI Offers Toggle */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <div>
                    <div className="text-sm font-medium">AI Personalized Offers</div>
                    <div className="text-xs text-[#E8DED8]">Daily recommendations for customers</div>
                  </div>
                </div>
                <Switch
                  checked={aiOffersEnabled}
                  onCheckedChange={toggleAiOffers}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-5 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full bg-white rounded-xl p-1">
            <TabsTrigger value="todo">To Do ({taskCounts.todo})</TabsTrigger>
            <TabsTrigger value="progress">In Progress ({taskCounts.progress})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({taskCounts.completed})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tasks List */}
      <div className="max-w-4xl mx-auto px-5 py-6 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl">
            <Lightbulb className="h-12 w-12 text-[#C9B8A6] mx-auto mb-4" />
            <p className="text-[#8B7355]">No tasks in this category</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredTasks.map((task, i) => {
              const StatusIcon = statusIcons[task.status];
              
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-[#E8DED8] p-4 cursor-pointer hover:border-[#8B7355] transition-colors"
                  onClick={() => handleEdit(task)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-[#5C4A3A]">{task.title}</h3>
                      </div>
                      {task.description && (
                        <p className="text-sm text-[#8B7355] mb-2">{task.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {task.category}
                        </Badge>
                        <Badge className={`${priorityColors[task.priority]} text-xs`}>
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <Badge variant="outline" className="text-xs">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <StatusIcon className="h-5 w-5 text-[#8B7355] mt-1" />
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 pt-3 border-t border-[#E8DED8]" onClick={(e) => e.stopPropagation()}>
                    {task.status === "Backlog" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => quickUpdateStatus.mutate({ id: task.id, status: "To Do" })}
                      >
                        Move to To Do
                      </Button>
                    )}
                    {task.status === "To Do" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => quickUpdateStatus.mutate({ id: task.id, status: "In Progress" })}
                      >
                        Start Working
                      </Button>
                    )}
                    {task.status === "In Progress" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => quickUpdateStatus.mutate({ id: task.id, status: "Completed" })}
                      >
                        Mark Complete
                      </Button>
                    )}
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
            <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Product Idea">Product Idea</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Customer Service">Customer Service</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Backlog">Backlog</SelectItem>
                  <SelectItem value="To Do">To Do</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
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
                  setEditingTask(null);
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
                {editingTask ? "Update" : "Create"} Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}