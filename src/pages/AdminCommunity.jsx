import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Pin, PinOff, EyeOff, Trash2, Search, Loader2, X,
  Plus, Edit2, Eye, Send, Image, CheckCircle2, AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import UserBadge from "@/components/community/UserBadge";
import { COLOR_SCHEMES } from "@/components/admin/BadgeDefinitionModal";
import BadgeDefinitionModal from "@/components/admin/BadgeDefinitionModal";
import AdminPostEditModal from "@/components/admin/AdminPostEditModal";

const TABS = ["Posts", "Members & Badges", "Badge Settings"];

function getBadgesForCustomerWithDefs(customer, badgeDefs) {
  if (!customer) return [];
  const badges = [];
  if (customer.is_founding_member) badges.push("founding_member");
  if (customer.is_eba) badges.push("eba");
  if (customer.tier === "Platinum") badges.push("platinum");
  else if (customer.tier === "Gold") badges.push("gold");
  const custom = customer.custom_badges || [];
  custom.forEach(k => { if (!badges.includes(k)) badges.push(k); });
  return badges;
}

export default function AdminCommunity() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("Posts");
  const [search, setSearch] = useState("");
  const [badgeSearch, setBadgeSearch] = useState("");
  const [editBadgeDef, setEditBadgeDef] = useState(null); // null=closed, {}=new, {id,...}=edit
  const [editPost, setEditPost] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeContent, setComposeContent] = useState("");
  const [composeType, setComposeType] = useState("general");
  const [composing, setComposing] = useState(false);
  const [assignBadgeModal, setAssignBadgeModal] = useState(null); // customer object
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.role !== "admin") { window.location.href = "/StaffPortal"; return; }
      setUser(u);
    });
  }, []);

  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["admin-community-posts"],
    queryFn: () => base44.entities.CommunityPost.list("-created_date", 200),
    enabled: !!user,
  });

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["admin-community-customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500),
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["admin-community-users"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
    enabled: !!user,
  });

  const { data: badgeDefs = [], isLoading: loadingBadgeDefs } = useQuery({
    queryKey: ["badge-definitions"],
    queryFn: () => base44.entities.BadgeDefinition.list("sort_order", 100),
    enabled: !!user,
  });

  const customerByEmail = {};
  customers.forEach(c => { if (c.created_by) customerByEmail[c.created_by] = c; });

  const badgeDefsMap = {};
  badgeDefs.forEach(b => { badgeDefsMap[b.key] = b; });

  // Mutations
  const pinMutation = useMutation({
    mutationFn: ({ id, is_pinned, admin_label }) =>
      base44.entities.CommunityPost.update(id, { is_pinned, admin_label: admin_label || null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-community-posts"] }); toast.success("Post updated"); }
  });

  const hideMutation = useMutation({
    mutationFn: ({ id, hide }) =>
      base44.entities.CommunityPost.update(id, { moderation_status: hide ? "hidden" : "approved" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-community-posts"] }); toast.success("Post updated"); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CommunityPost.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-community-posts"] }); toast.success("Post deleted"); }
  });

  const editPostMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommunityPost.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-community-posts"] }); toast.success("Post updated"); }
  });

  const badgeMutation = useMutation({
    mutationFn: ({ customerId, updates }) => base44.entities.Customer.update(customerId, updates),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-community-customers"] }); toast.success("Badges updated"); }
  });

  const saveBadgeDefMutation = useMutation({
    mutationFn: async (form) => {
      if (form.id) {
        return base44.entities.BadgeDefinition.update(form.id, form);
      } else {
        return base44.entities.BadgeDefinition.create(form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badge-definitions"] });
      toast.success("Badge saved!");
      setEditBadgeDef(null);
    }
  });

  const deleteBadgeDefMutation = useMutation({
    mutationFn: (id) => base44.entities.BadgeDefinition.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["badge-definitions"] }); toast.success("Badge deleted"); }
  });

  const handleCompose = async () => {
    if (!composeContent.trim()) return;
    setComposing(true);
    await base44.entities.CommunityPost.create({
      author_email: user.email,
      author_name: user.full_name || "Admin",
      author_profile_picture: user.profile_picture || null,
      content: composeContent,
      post_type: composeType,
      moderation_status: "approved",
      is_pinned: false,
      likes_count: 0,
      liked_by: [],
      reported_by: [],
    });
    queryClient.invalidateQueries({ queryKey: ["admin-community-posts"] });
    setComposeContent("");
    setShowCompose(false);
    setComposing(false);
    toast.success("Post published!");
  };

  const handleToggleCustomBadge = (customer, badgeKey) => {
    const current = customer.custom_badges || [];
    const has = current.includes(badgeKey);
    badgeMutation.mutate({
      customerId: customer.id,
      updates: { custom_badges: has ? current.filter(k => k !== badgeKey) : [...current, badgeKey] }
    });
  };

  const handleRunAutoAssign = async () => {
    toast.info("Running auto-assignment...");
    const res = await base44.functions.invoke("checkAndAssignBadges", {});
    toast.success(`Done! Checked ${res.data?.checked || 0} members, updated ${res.data?.updated || 0}`);
    queryClient.invalidateQueries({ queryKey: ["admin-community-customers"] });
  };

  const filteredPosts = posts.filter(p =>
    !search ||
    p.author_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.content?.toLowerCase().includes(search.toLowerCase())
  );
  const sortedPosts = [...filteredPosts.filter(p => p.is_pinned), ...filteredPosts.filter(p => !p.is_pinned)];

  const filteredCustomers = customers.filter(c => {
    if (!badgeSearch) return true;
    const email = c.created_by || "";
    const u = allUsers.find(u => u.email === email);
    return email.toLowerCase().includes(badgeSearch.toLowerCase()) ||
      (u?.full_name || "").toLowerCase().includes(badgeSearch.toLowerCase());
  });

  // All assignable badge keys (built-in + custom from DB)
  const BUILTIN_BADGE_KEYS = ["founding_member", "eba"];
  const allAssignableBadges = [
    ...BUILTIN_BADGE_KEYS,
    ...badgeDefs.filter(b => b.is_active && !BUILTIN_BADGE_KEYS.includes(b.key)).map(b => b.key)
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-4xl mx-auto px-5 pt-6 pb-8">
          <Link to="/AdminFlashDrops" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-3xl font-bold mb-1">Community Management</h1>
          <p className="text-[#E8DED8] text-sm">Manage posts, badges, and member assignments</p>
          <div className="flex gap-2 mt-5 flex-wrap">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? "bg-white text-[#5C4A3A]" : "bg-white/10 text-white hover:bg-white/20"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6">

        {/* ── POSTS TAB ── */}
        {tab === "Posts" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search posts or author..." className="pl-9 rounded-2xl border-[#E8DED8]" />
              </div>
              <Button onClick={() => setShowCompose(true)}
                className="rounded-xl bg-[#8B7355] hover:bg-[#6B5744] gap-1 flex-shrink-0">
                <Plus className="h-4 w-4" /> New Post
              </Button>
            </div>

            {loadingPosts ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" /></div>
            ) : sortedPosts.map(post => {
              const customer = customerByEmail[post.author_email];
              const badges = getBadgesForCustomerWithDefs(customer, badgeDefsMap);
              return (
                <div key={post.id} className={`bg-white rounded-3xl border p-5 shadow-sm ${post.is_pinned ? "border-amber-300 bg-amber-50/30" : "border-[#E8DED8]"}`}>
                  {post.is_pinned && (
                    <div className="flex items-center gap-2 mb-2 text-amber-600 text-xs font-bold">
                      <Pin className="h-3.5 w-3.5" /> PINNED {post.admin_label && `· ${post.admin_label}`}
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-[#5C4A3A] text-sm">{post.author_name || post.author_email}</span>
                        {badges.map(b => <UserBadge key={b} badgeKey={b} badgeDef={badgeDefsMap[b]} />)}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          post.moderation_status === "approved" ? "bg-green-100 text-green-700" :
                          post.moderation_status === "hidden" ? "bg-gray-100 text-gray-600" :
                          post.moderation_status === "flagged" ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        }`}>{post.moderation_status}</span>
                      </div>
                      <p className="text-sm text-[#6B5744] line-clamp-3 whitespace-pre-wrap">{post.content}</p>
                      {post.image_url && <img src={post.image_url} className="mt-2 rounded-xl max-h-40 object-cover" />}
                      <p className="text-xs text-[#C9B8A6] mt-1">{post.created_date && format(new Date(post.created_date), "MMM d, h:mm a")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <PinPostButton post={post} onPin={pinMutation.mutate} />
                    <Button size="sm" variant="outline"
                      onClick={() => setEditPost(post)}
                      className="rounded-xl text-xs border-[#E8DED8] gap-1">
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => hideMutation.mutate({ id: post.id, hide: post.moderation_status !== "hidden" })}
                      className="rounded-xl text-xs border-[#E8DED8] gap-1">
                      {post.moderation_status === "hidden" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {post.moderation_status === "hidden" ? "Unhide" : "Hide"}
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => { if (confirm("Delete this post?")) deleteMutation.mutate(post.id); }}
                      className="rounded-xl text-xs border-red-200 text-red-600 hover:bg-red-50 gap-1">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MEMBERS & BADGES TAB ── */}
        {tab === "Members & Badges" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
                <Input value={badgeSearch} onChange={e => setBadgeSearch(e.target.value)}
                  placeholder="Search members..." className="pl-9 rounded-2xl border-[#E8DED8]" />
              </div>
              <Button onClick={handleRunAutoAssign} variant="outline"
                className="rounded-xl border-[#E8DED8] text-[#8B7355] gap-1 flex-shrink-0 text-sm">
                ⚡ Auto-Assign
              </Button>
            </div>

            <p className="text-xs text-[#8B7355] bg-[#F5EBE8] rounded-xl px-4 py-2">
              Toggle any badge on/off for each member. Click <strong>⚡ Auto-Assign</strong> to automatically grant badges based on criteria set in Badge Settings.
            </p>

            {loadingCustomers ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" /></div>
            ) : filteredCustomers.map(customer => {
              const email = customer.created_by || "";
              const u = allUsers.find(u => u.email === email);
              const displayName = u?.full_name || email;
              const badges = getBadgesForCustomerWithDefs(customer, badgeDefsMap);

              return (
                <div key={customer.id} className="bg-white rounded-3xl border border-[#E8DED8] p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-[#5C4A3A]">{displayName}</p>
                      <p className="text-xs text-[#C9B8A6]">{email}</p>
                      <div className="text-xs text-[#8B7355] mt-1">
                        {customer.tier} · {customer.total_points_earned || 0} pts · {customer.referral_count || 0} referrals
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-w-xs justify-end">
                      {badges.length === 0
                        ? <span className="text-xs text-[#C9B8A6]">No badges</span>
                        : badges.map(b => <UserBadge key={b} badgeKey={b} badgeDef={badgeDefsMap[b]} />)
                      }
                    </div>
                  </div>

                  {/* Badge toggles */}
                  <div className="border-t border-[#F5EBE8] pt-3">
                    <p className="text-xs text-[#C9B8A6] mb-2 uppercase tracking-wide font-medium">Manual Badge Controls</p>
                    <div className="flex flex-wrap gap-2">
                      <ToggleBadgeButton label="Founding Member" active={customer.is_founding_member}
                        onToggle={() => badgeMutation.mutate({ customerId: customer.id, updates: { is_founding_member: !customer.is_founding_member } })} />
                      <ToggleBadgeButton label="EBA" active={customer.is_eba}
                        onToggle={() => badgeMutation.mutate({ customerId: customer.id, updates: { is_eba: !customer.is_eba } })} />
                      {badgeDefs.filter(b => b.is_active && !["founding_member", "eba"].includes(b.key)).map(bd => (
                        <ToggleBadgeButton key={bd.key} label={bd.label}
                          active={(customer.custom_badges || []).includes(bd.key)}
                          onToggle={() => handleToggleCustomBadge(customer, bd.key)} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── BADGE SETTINGS TAB ── */}
        {tab === "Badge Settings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#8B7355]">Define badge types, criteria, and appearance.</p>
              <Button onClick={() => setEditBadgeDef({})}
                className="rounded-xl bg-[#8B7355] hover:bg-[#6B5744] gap-1">
                <Plus className="h-4 w-4" /> New Badge
              </Button>
            </div>

            {loadingBadgeDefs ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" /></div>
            ) : badgeDefs.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-[#E8DED8] p-8 text-center">
                <p className="text-[#8B7355] mb-3">No badge definitions yet.</p>
                <Button onClick={() => setEditBadgeDef({})} className="rounded-xl bg-[#8B7355] hover:bg-[#6B5744]">
                  Create Your First Badge
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {badgeDefs.map(bd => {
                  const colorClass = COLOR_SCHEMES[bd.color_scheme] || COLOR_SCHEMES.amber;
                  return (
                    <div key={bd.id} className={`bg-white rounded-3xl border p-5 shadow-sm ${bd.is_active ? "border-[#E8DED8]" : "border-gray-200 opacity-60"}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${colorClass}`}>
                          <span>{bd.emoji}</span><span>{bd.label}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setEditBadgeDef(bd)}
                            className="p-1.5 rounded-lg hover:bg-[#F5EBE8] text-[#8B7355]">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => { if (confirm("Delete this badge?")) deleteBadgeDefMutation.mutate(bd.id); }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-[#5C4A3A]">{bd.title || bd.label}</p>
                      <p className="text-xs text-[#8B7355] mt-1 line-clamp-2">{bd.description}</p>
                      {bd.auto_criteria_type && bd.auto_criteria_type !== "none" && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-2.5 py-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" />
                          Auto: {bd.auto_criteria_type} ≥ {bd.auto_criteria_value}
                        </div>
                      )}
                      {(!bd.auto_criteria_type || bd.auto_criteria_type === "none") && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-[#C9B8A6]">
                          <AlertCircle className="h-3 w-3" /> Manual assignment only
                        </div>
                      )}
                      <p className="text-xs text-[#C9B8A6] mt-1">Key: <code className="bg-[#F5EBE8] px-1 rounded">{bd.key}</code></p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compose Post Modal */}
      <AnimatePresence>
        {showCompose && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#5C4A3A]">New Admin Post</h2>
                <button onClick={() => setShowCompose(false)} className="p-2 rounded-full hover:bg-[#F5EBE8] text-[#8B7355]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <select value={composeType} onChange={e => setComposeType(e.target.value)}
                  className="w-full border border-[#E8DED8] rounded-xl px-3 py-2 text-sm text-[#5C4A3A]">
                  {["general", "review", "photo", "tip"].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                <Textarea value={composeContent} onChange={e => setComposeContent(e.target.value)}
                  placeholder="Write your post..." className="border-[#E8DED8] h-32 text-sm" />
              </div>
              <div className="flex gap-3 mt-5">
                <Button onClick={() => setShowCompose(false)} variant="outline" className="flex-1 rounded-xl border-[#E8DED8]">Cancel</Button>
                <Button onClick={handleCompose} disabled={!composeContent.trim() || composing}
                  className="flex-1 rounded-xl bg-[#8B7355] hover:bg-[#6B5744] gap-1">
                  {composing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Publish</>}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Post Modal */}
      {editPost && (
        <AdminPostEditModal
          post={editPost}
          onSave={(id, data) => editPostMutation.mutateAsync({ id, data })}
          onClose={() => setEditPost(null)}
        />
      )}

      {/* Badge Def Modal */}
      {editBadgeDef !== null && (
        <BadgeDefinitionModal
          badge={editBadgeDef?.id ? editBadgeDef : null}
          onSave={(form) => saveBadgeDefMutation.mutate(form)}
          onClose={() => setEditBadgeDef(null)}
        />
      )}
    </div>
  );
}

function PinPostButton({ post, onPin }) {
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [label, setLabel] = useState(post.admin_label || "");

  if (post.is_pinned) {
    return (
      <Button size="sm" variant="outline"
        onClick={() => onPin({ id: post.id, is_pinned: false, admin_label: null })}
        className="rounded-xl text-xs border-amber-300 text-amber-700 hover:bg-amber-50 gap-1">
        <PinOff className="h-3.5 w-3.5" /> Unpin
      </Button>
    );
  }

  if (showLabelInput) {
    return (
      <div className="flex items-center gap-2">
        <Input value={label} onChange={e => setLabel(e.target.value)}
          placeholder="Label (e.g. Announcement)" className="h-8 text-xs rounded-xl border-[#E8DED8] w-40" />
        <Button size="sm"
          onClick={() => { onPin({ id: post.id, is_pinned: true, admin_label: label }); setShowLabelInput(false); }}
          className="rounded-xl text-xs bg-amber-500 hover:bg-amber-600 h-8 gap-1">
          <Pin className="h-3.5 w-3.5" /> Pin
        </Button>
        <button onClick={() => setShowLabelInput(false)}><X className="h-4 w-4 text-[#C9B8A6]" /></button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={() => setShowLabelInput(true)}
      className="rounded-xl text-xs border-[#E8DED8] gap-1">
      <Pin className="h-3.5 w-3.5" /> Pin
    </Button>
  );
}

function ToggleBadgeButton({ label, active, onToggle }) {
  return (
    <button onClick={onToggle}
      className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${active
        ? "bg-[#8B7355] text-white"
        : "bg-[#F5EBE8] text-[#8B7355] hover:bg-[#EDE3DF]"}`}>
      {active ? "✓ " : ""}{label}
    </button>
  );
}