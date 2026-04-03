import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Pin, PinOff, EyeOff, Trash2, Search, Shield, Star, Award, Coffee, CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import UserBadge, { BADGE_DEFINITIONS, getBadgesForCustomer } from "@/components/community/UserBadge";

const TABS = ["Posts", "Badges"];

export default function AdminCommunity() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("Posts");
  const [search, setSearch] = useState("");
  const [badgeSearch, setBadgeSearch] = useState("");
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

  // Map customer by email (created_by)
  const customerByEmail = {};
  customers.forEach(c => { if (c.created_by) customerByEmail[c.created_by] = c; });

  // Pin/unpin
  const pinMutation = useMutation({
    mutationFn: ({ id, is_pinned, admin_label }) =>
      base44.entities.CommunityPost.update(id, { is_pinned, admin_label: admin_label || null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-community-posts"] }); toast.success("Post updated"); }
  });

  // Hide post
  const hideMutation = useMutation({
    mutationFn: ({ id, hide }) =>
      base44.entities.CommunityPost.update(id, { moderation_status: hide ? "hidden" : "approved" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-community-posts"] }); toast.success("Post updated"); }
  });

  // Delete post
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CommunityPost.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-community-posts"] }); toast.success("Post deleted"); }
  });

  // Badge mutation
  const badgeMutation = useMutation({
    mutationFn: ({ customerId, field, value }) =>
      base44.entities.Customer.update(customerId, { [field]: value }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-community-customers"] }); toast.success("Badge updated"); }
  });

  const filteredPosts = posts.filter(p =>
    !search ||
    p.author_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.content?.toLowerCase().includes(search.toLowerCase())
  );

  const pinnedPosts = filteredPosts.filter(p => p.is_pinned);
  const otherPosts = filteredPosts.filter(p => !p.is_pinned);
  const sortedPosts = [...pinnedPosts, ...otherPosts];

  // Customers for badge tab
  const filteredCustomers = customers.filter(c => {
    if (!badgeSearch) return true;
    const email = c.created_by || "";
    const u = allUsers.find(u => u.email === email);
    const name = u?.full_name || "";
    return email.toLowerCase().includes(badgeSearch.toLowerCase()) || name.toLowerCase().includes(badgeSearch.toLowerCase());
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-4xl mx-auto px-5 pt-6 pb-8">
          <Link to="/AdminFlashDrops" className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-3xl font-bold mb-1">Community Management</h1>
          <p className="text-[#E8DED8] text-sm">Manage posts, pins, and member badges</p>
          {/* Tabs */}
          <div className="flex gap-2 mt-5">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? "bg-white text-[#5C4A3A]" : "bg-white/10 text-white hover:bg-white/20"}`}>
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search posts or author..." className="pl-9 rounded-2xl border-[#E8DED8]" />
            </div>

            {loadingPosts ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" /></div>
            ) : sortedPosts.map(post => {
              const customer = customerByEmail[post.author_email];
              const badges = getBadgesForCustomer(customer);
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
                        {badges.map(b => <UserBadge key={b} badgeKey={b} />)}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          post.moderation_status === "approved" ? "bg-green-100 text-green-700" :
                          post.moderation_status === "hidden" ? "bg-gray-100 text-gray-600" :
                          post.moderation_status === "flagged" ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        }`}>{post.moderation_status}</span>
                      </div>
                      <p className="text-sm text-[#6B5744] line-clamp-2">{post.content}</p>
                      <p className="text-xs text-[#C9B8A6] mt-1">{post.created_date && format(new Date(post.created_date), "MMM d, h:mm a")}</p>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <PinPostButton post={post} onPin={pinMutation.mutate} />
                    <Button size="sm" variant="outline"
                      onClick={() => hideMutation.mutate({ id: post.id, hide: post.moderation_status !== "hidden" })}
                      className="rounded-xl text-xs border-[#E8DED8] gap-1">
                      <EyeOff className="h-3.5 w-3.5" />
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

        {/* ── BADGES TAB ── */}
        {tab === "Badges" && (
          <div className="space-y-4">
            {/* Badge legend */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
              {Object.entries(BADGE_DEFINITIONS).map(([key, def]) => (
                <div key={key} className="bg-white rounded-2xl border border-[#E8DED8] p-4 shadow-sm">
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold mb-2 ${def.color}`}>
                    <span>{def.emoji}</span><span>{def.label}</span>
                  </div>
                  <p className="text-xs text-[#5C4A3A] font-semibold">{def.title}</p>
                  <p className="text-xs text-[#8B7355] mt-1 line-clamp-2">{def.howToGet}</p>
                </div>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9B8A6]" />
              <Input value={badgeSearch} onChange={e => setBadgeSearch(e.target.value)}
                placeholder="Search members..." className="pl-9 rounded-2xl border-[#E8DED8]" />
            </div>

            {loadingCustomers ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" /></div>
            ) : filteredCustomers.map(customer => {
              const email = customer.created_by || "";
              const u = allUsers.find(u => u.email === email);
              const displayName = u?.full_name || email;
              const badges = getBadgesForCustomer(customer);
              return (
                <div key={customer.id} className="bg-white rounded-3xl border border-[#E8DED8] p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#5C4A3A]">{displayName}</p>
                      <p className="text-xs text-[#C9B8A6]">{email}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {badges.length === 0
                          ? <span className="text-xs text-[#C9B8A6]">No badges</span>
                          : badges.map(b => <UserBadge key={b} badgeKey={b} />)
                        }
                      </div>
                      <div className="text-xs text-[#8B7355] mt-1">
                        {customer.tier} · {customer.total_points_earned || 0} pts earned · {customer.referral_count || 0} referrals
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <ToggleBadgeButton
                        label="Founding Member"
                        active={customer.is_founding_member}
                        onToggle={() => badgeMutation.mutate({ customerId: customer.id, field: "is_founding_member", value: !customer.is_founding_member })}
                      />
                      <ToggleBadgeButton
                        label="EBA"
                        active={customer.is_eba}
                        onToggle={() => badgeMutation.mutate({ customerId: customer.id, field: "is_eba", value: !customer.is_eba })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
    <Button size="sm" variant="outline"
      onClick={() => setShowLabelInput(true)}
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