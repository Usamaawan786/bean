import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, User, Mail, Award, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    profile_picture: ""
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    setFormData({
      full_name: u.full_name || "",
      bio: u.bio || "",
      profile_picture: u.profile_picture || ""
    });

    const customers = await base44.entities.Customer.filter({ created_by: u.email });
    if (customers.length > 0) {
      setCustomer(customers[0]);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, profile_picture: file_url }));
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
    }
    setIsUploading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: formData.full_name,
        bio: formData.bio,
        profile_picture: formData.profile_picture
      });
      await loadUserData();
      setIsEditing(false);
      toast.success("Profile updated!");
    } catch (error) {
      toast.error("Failed to update profile");
    }
    setIsSaving(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-lg mx-auto px-5 pt-6 pb-20">
          <Link 
            to={createPageUrl("Home")}
            className="inline-flex items-center gap-1 text-[#E8DED8] text-sm mb-6 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          
          <h1 className="text-2xl font-bold">My Profile</h1>
        </div>
      </div>

      {/* Profile Picture - Overlapping */}
      <div className="relative z-10 flex justify-center -mt-16">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-white p-2 shadow-lg">
            {formData.profile_picture ? (
              <img 
                src={formData.profile_picture} 
                alt="Profile" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#D4C4B0] to-[#C9B8A6] flex items-center justify-center">
                <User className="h-12 w-12 text-white" />
              </div>
            )}
          </div>
          {isEditing && (
            <label className="absolute bottom-0 right-0 bg-[#8B7355] hover:bg-[#6B5744] text-white p-2.5 rounded-full shadow-lg cursor-pointer transition-colors">
              <Camera className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 pt-6 pb-24">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-[#5C4A3A]">{user.full_name}</h2>
          <p className="text-sm text-[#8B7355]">{user.email}</p>
        </div>

        {/* Stats */}
        {customer && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
              <div className="text-2xl font-bold text-[#8B7355]">{customer.points_balance}</div>
              <div className="text-xs text-[#C9B8A6] mt-1">Points</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
              <div className="text-2xl font-bold text-[#8B7355]">{customer.referral_count || 0}</div>
              <div className="text-xs text-[#C9B8A6] mt-1">Referrals</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
              <div className="text-2xl font-bold text-[#8B7355]">{customer.tier}</div>
              <div className="text-xs text-[#C9B8A6] mt-1">Tier</div>
            </div>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white rounded-3xl border border-[#E8DED8] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#5C4A3A]">Profile Information</h3>
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="rounded-xl border-[#E8DED8] text-[#8B7355] hover:bg-[#F5EBE8]"
              >
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      full_name: user.full_name || "",
                      bio: user.bio || "",
                      profile_picture: user.profile_picture || ""
                    });
                  }}
                  variant="outline"
                  className="rounded-xl border-[#E8DED8]"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="rounded-xl bg-[#8B7355] hover:bg-[#6B5744]"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label className="text-[#5C4A3A]">Full Name</Label>
            {isEditing ? (
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="mt-1 border-[#E8DED8] focus:border-[#8B7355] focus:ring-[#8B7355]"
              />
            ) : (
              <p className="mt-1 text-[#6B5744]">{user.full_name || "Not set"}</p>
            )}
          </div>

          <div>
            <Label className="text-[#5C4A3A]">Bio</Label>
            {isEditing ? (
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                className="mt-1 border-[#E8DED8] focus:border-[#8B7355] focus:ring-[#8B7355] h-24"
              />
            ) : (
              <p className="mt-1 text-[#6B5744]">{user.bio || "No bio yet"}</p>
            )}
          </div>

          <div>
            <Label className="text-[#5C4A3A]">Email</Label>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4 text-[#C9B8A6]" />
              <p className="text-[#6B5744]">{user.email}</p>
            </div>
          </div>

          <div>
            <Label className="text-[#5C4A3A]">Role</Label>
            <div className="flex items-center gap-2 mt-1">
              <Award className="h-4 w-4 text-[#C9B8A6]" />
              <p className="text-[#6B5744] capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          onClick={() => base44.auth.logout()}
          variant="outline"
          className="w-full mt-6 rounded-xl border-red-300 text-red-600 hover:bg-red-50"
        >
          Logout
        </Button>
      </div>
    </div>
  );
}