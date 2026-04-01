import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Camera, User, Mail, Award, Loader2, QrCode, Wallet, Gift, ChevronRight, Star, TrendingUp, Trash2, Users, MessageCircle, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import QRScanner from "@/components/profile/QRScanner";
import PointsAnimation from "@/components/profile/PointsAnimation";
import ImageCropModal from "@/components/profile/ImageCropModal";
import DeleteAccountDialog from "@/components/profile/DeleteAccountDialog";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [pointsData, setPointsData] = useState({ old: 0, new: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [imageToEdit, setImageToEdit] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showPicConsentModal, setShowPicConsentModal] = useState(false);
  const [pendingPicFile, setPendingPicFile] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    profile_picture: ""
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        setIsLoading(false);
        window.location.href = createPageUrl("Login") + "?next=" + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      }

      const u = await base44.auth.me();
      if (!u || !u.email) {
        setIsLoading(false);
        window.location.href = createPageUrl("Login") + "?next=" + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      }
      setUser(u);
      setFormData({
        full_name: u.full_name || "",
        bio: u.bio || "",
        profile_picture: u.profile_picture || ""
      });

      // Get or create customer record
      const customers = await base44.entities.Customer.filter({ created_by: u.email });
      if (customers.length > 0) {
        setCustomer(customers[0]);
      } else {
        // Check if user was on the waitlist (founding member)
        const waitlistMatches = await base44.entities.WaitlistSignup.filter({ email: u.email });
        const isFoundingMember = waitlistMatches.length > 0;
        const welcomePoints = isFoundingMember ? 100 : 50; // 50 welcome + 50 FM bonus

        const refCode = u.email.split("@")[0].toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
        const newCustomer = await base44.entities.Customer.create({
          referral_code: refCode,
          points_balance: welcomePoints,
          total_points_earned: welcomePoints,
          tier: "Bronze",
          referral_count: 0,
          cups_redeemed: 0,
          is_founding_member: isFoundingMember,
          fm_discount_used: 0,
        });

        // Also mark waitlist record as joined
        if (isFoundingMember) {
          await base44.entities.WaitlistSignup.update(waitlistMatches[0].id, { status: "joined" });
          // Log the FM bonus activity
          await base44.entities.Activity.create({
            user_email: u.email,
            action_type: "points_earned",
            description: "🌟 Founding Member bonus — 50 extra welcome points!",
            points_amount: 50,
          });
        }
        setCustomer(newCustomer);
      }

      // Get or create wallet
      const wallets = await base44.entities.Wallet.filter({ created_by: u.email });
      if (wallets.length > 0) {
        setWallet(wallets[0]);
      } else {
        const newWallet = await base44.entities.Wallet.create({
          balance: 0,
          total_topped_up: 0
        });
        setWallet(newWallet);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setUser({});
    } finally {
      setIsLoading(false);
    }
  };



  const handleCropComplete = async (croppedFile) => {
    setImageToEdit(null);
    // Check consent
    if (!user?.profile_picture_consent) {
      setPendingPicFile(croppedFile);
      setShowPicConsentModal(true);
      return;
    }
    await uploadProfilePicture(croppedFile);
  };

  const uploadProfilePicture = async (file) => {
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, profile_picture: file_url }));
      await base44.auth.updateMe({ profile_picture: file_url, profile_picture_consent: true });
      await loadUserData();
      toast.success("Profile picture updated!");
    } catch (error) {
      toast.error("Failed to upload image");
    }
    setIsUploading(false);
  };

  const handleConsentAndUpload = async () => {
    setShowPicConsentModal(false);
    if (pendingPicFile) {
      await uploadProfilePicture(pendingPicFile);
      setPendingPicFile(null);
    }
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

  const handleQRScan = async (qrCodeId) => {
    // Close scanner first
    setShowQRScanner(false);

    try {
      const response = await base44.functions.invoke('processBillScan', { qrCodeId });
      
      if (response.data.success) {
        // Show animation only on success
        setPointsData({
          old: customer.points_balance,
          new: response.data.new_balance
        });
        setShowPointsAnimation(true);
        await loadUserData();
        
        // Show referral bonus notification
        if (response.data.referral_bonus > 0) {
          toast.success(`🎉 Referral bonus unlocked! +${response.data.referral_bonus} points!`, { duration: 5000 });
        }
      } else {
        toast.error(response.data.error || "Failed to process QR code");
      }
    } catch (error) {
      toast.error("Failed to scan QR code");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  if (!user || !user.email) {
    window.location.href = createPageUrl("Login") + "?next=" + encodeURIComponent(window.location.pathname + window.location.search);
    return (
      <div className="min-h-screen bg-[#F5F1ED] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-[#F5F1ED]">
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

      {/* Profile Picture */}
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
          <label className="absolute bottom-2 right-2 w-8 h-8 bg-[#8B7355] rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-[#6B5744] transition-colors">
            <Camera className="h-4 w-4 text-white" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setImageToEdit(ev.target.result);
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 pt-6 pb-24">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-[#5C4A3A]">{user.full_name}</h2>
          <p className="text-sm text-[#8B7355]">{user.email}</p>
          {customer?.is_founding_member && (
            <div className="inline-flex items-center gap-1.5 mt-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
              <Shield className="h-3 w-3" /> FM · Founding Member
            </div>
          )}
          {customer?.is_eba && (
            <div className="inline-flex items-center gap-1.5 mt-2 ml-2 bg-gradient-to-r from-purple-600 to-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
              ⭐ EBA · Elite Ambassador
            </div>
          )}
        </div>

        {/* Followers/Following */}
        {user && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
              <div className="text-2xl font-bold text-[#8B7355]">{(user.followers || []).length}</div>
              <div className="text-xs text-[#C9B8A6] mt-1">Followers</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-4 text-center">
              <div className="text-2xl font-bold text-[#8B7355]">{(user.following || []).length}</div>
              <div className="text-xs text-[#C9B8A6] mt-1">Following</div>
            </div>
          </div>
        )}

        {/* Stats */}
        {customer && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-3 text-center">
              <div className="text-xl font-bold text-[#8B7355]">{customer.points_balance}</div>
              <div className="text-xs text-[#C9B8A6] mt-1">Points</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-3 text-center">
              <div className="text-xl font-bold text-[#8B7355]">{customer.referral_count || 0}</div>
              <div className="text-xs text-[#C9B8A6] mt-1">Referrals</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8DED8] p-3 text-center">
              <div className="text-sm font-bold text-[#8B7355] leading-tight">{customer.tier}</div>
              <div className="text-xs text-[#C9B8A6] mt-1">Tier</div>
            </div>
          </div>
        )}

        {/* QR Scanner Button */}
        <Button
          onClick={() => setShowQRScanner(true)}
          className="w-full mb-6 bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:from-[#6B5744] hover:to-[#5C4A3A] rounded-2xl h-14 text-base"
        >
          <QrCode className="h-5 w-5 mr-2" />
          Scan Bill to Earn Points
        </Button>

        {/* Wallet Card */}
        <Link to={createPageUrl("Wallet")}>
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-3xl p-6 mb-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-20">
              <Star className="h-32 w-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm opacity-90">Wallet Balance</div>
                    <div className="text-2xl font-bold">PKR {wallet?.balance || 0}</div>
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 opacity-70" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 fill-white" />
                <span className="font-semibold">2x points when paying with wallet</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Message Bean Support */}
        <Link to="/messages">
          <div className="bg-gradient-to-br from-[#5C4A3A] to-[#8B7355] text-white rounded-3xl p-5 mb-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <div className="font-semibold">Message Bean</div>
                <div className="text-sm text-white/70">Questions? We're here for you ☕</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-white/60" />
          </div>
        </Link>

        {/* Gift Cards Link */}
        <Link to={createPageUrl("GiftCards")}>
          <div className="bg-white rounded-3xl border border-[#E8DED8] p-5 mb-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#F5EBE8] flex items-center justify-center">
                <Gift className="h-6 w-6 text-[#8B7355]" />
              </div>
              <div>
                <div className="font-semibold text-[#5C4A3A]">Gift Cards</div>
                <div className="text-sm text-[#8B7355]">Send coffee to friends</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[#C9B8A6]" />
          </div>
        </Link>

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
          onClick={() => {
            base44.auth.logout(window.location.origin);
          }}
          variant="outline"
          className="w-full mt-6 rounded-xl border-[#E8DED8] dark:border-[var(--border-light)] text-[#5C4A3A] dark:text-[var(--text-primary)] hover:bg-[#F5EBE8] dark:hover:bg-[var(--bg-elevated)]"
        >
          Logout
        </Button>

        {/* Delete Account Button */}
        <Button
          onClick={() => setDeleteDialogOpen(true)}
          variant="outline"
          className="w-full mt-3 rounded-xl border-red-300 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Account
        </Button>
      </div>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showQRScanner && (
          <QRScanner
            onScan={handleQRScan}
            onClose={() => setShowQRScanner(false)}
          />
        )}
      </AnimatePresence>

      {/* Points Animation */}
      <AnimatePresence>
        {showPointsAnimation && (
          <PointsAnimation
            startValue={pointsData.old}
            endValue={pointsData.new}
            onClose={() => setShowPointsAnimation(false)}
          />
        )}
      </AnimatePresence>

      {/* Image Crop Modal */}
      {imageToEdit && (
        <ImageCropModal
          imageSrc={imageToEdit}
          onComplete={handleCropComplete}
          onClose={() => setImageToEdit(null)}
        />
      )}

      {/* Profile Picture Consent Modal */}
      {showPicConsentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl"
          >
            <div className="w-14 h-14 bg-[#F5EBE8] rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="h-7 w-7 text-[#8B7355]" />
            </div>
            <h3 className="text-xl font-bold text-[#5C4A3A] text-center mb-2">Upload Profile Picture?</h3>
            <p className="text-sm text-[#8B7355] text-center mb-6 leading-relaxed">
              By uploading a profile picture, you consent to your photo being visible to other community members in the Bean Coffee app. You can remove it at any time.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => { setShowPicConsentModal(false); setPendingPicFile(null); }}
                variant="outline"
                className="flex-1 rounded-xl border-[#E8DED8]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConsentAndUpload}
                className="flex-1 rounded-xl bg-[#8B7355] hover:bg-[#6B5744]"
              >
                I Consent & Upload
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        userEmail={user?.email}
      />
    </div>
  );
}