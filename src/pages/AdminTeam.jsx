import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Crown, Shield, User } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const roleIcons = {
  founder: Crown,
  manager: Shield,
  employee: User
};

const roleColors = {
  founder: "bg-purple-100 text-purple-700 border-purple-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  employee: "bg-gray-100 text-gray-700 border-gray-200"
};

export default function AdminTeam() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      if (u.role !== 'admin' || u.admin_role !== 'founder') {
        window.location.href = createPageUrl("AdminTasks");
        return;
      }
      setUser(u);
    };
    loadUser();
  }, []);

  const { data: adminUsers = [], isLoading } = useQuery({
    queryKey: ["all-admin-users"],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'admin');
    },
    enabled: !!user
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, admin_role }) => {
      await base44.entities.User.update(userId, { admin_role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-admin-users"] });
      toast.success("Role updated");
    }
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1ED] to-[#EBE5DF] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-4xl mx-auto px-5 pt-6 pb-8">
          <Link to={createPageUrl("AdminTasks")} className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Tasks
          </Link>
          
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">Team Management</h1>
              <p className="text-[#E8DED8] text-sm mt-1">Manage roles & permissions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Hierarchy Info */}
      <div className="max-w-4xl mx-auto px-5 py-6">
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 mb-6">
          <h2 className="font-semibold text-[#5C4A3A] mb-4">Role Hierarchy</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <div className="font-medium text-[#5C4A3A]">Founder</div>
                <div className="text-sm text-[#8B7355]">Full access, manage team, assign roles, control all settings</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-[#5C4A3A]">Manager</div>
                <div className="text-sm text-[#8B7355]">Create & assign tasks, view all tasks, manage operations</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <div className="font-medium text-[#5C4A3A]">Employee</div>
                <div className="text-sm text-[#8B7355]">View & complete assigned tasks, update task status</div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members List */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-[#5C4A3A]">Team Members ({adminUsers.length})</h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
              ))}
            </div>
          ) : (
            adminUsers.map((member, i) => {
              const RoleIcon = roleIcons[member.admin_role] || User;
              const isCurrentUser = member.email === user.email;
              
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-[#E8DED8] p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${roleColors[member.admin_role || 'employee']} border`}>
                        <RoleIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#5C4A3A] flex items-center gap-2">
                          {member.full_name}
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <div className="text-sm text-[#8B7355]">{member.email}</div>
                        {member.department && (
                          <div className="text-xs text-[#C9B8A6] mt-1">{member.department}</div>
                        )}
                      </div>
                    </div>

                    <div className="w-40">
                      <Select
                        value={member.admin_role || 'employee'}
                        onValueChange={(role) => updateRoleMutation.mutate({ userId: member.id, admin_role: role })}
                        disabled={isCurrentUser || updateRoleMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="founder">Founder</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}