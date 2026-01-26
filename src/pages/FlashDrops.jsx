import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Zap, Bell, BellRing, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import FlashDropCard from "@/components/flashdrop/FlashDropCard";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

export default function FlashDrops() {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const customers = await base44.entities.Customer.filter({ created_by: u.email });
      if (customers.length > 0) setCustomer(customers[0]);
    };
    loadUser();
  }, []);

  const { data: activeDrops = [] } = useQuery({
    queryKey: ["active-drops"],
    queryFn: () => base44.entities.FlashDrop.filter({ status: "active" }),
    refetchInterval: 10000
  });

  const { data: upcomingDrops = [] } = useQuery({
    queryKey: ["upcoming-drops"],
    queryFn: () => base44.entities.FlashDrop.filter({ status: "upcoming" })
  });

  const { data: pastDrops = [] } = useQuery({
    queryKey: ["past-drops"],
    queryFn: () => base44.entities.FlashDrop.filter({ status: "ended" }, "-start_time", 10)
  });

  const handleClaimDrop = async (drop) => {
    if (!user) return;
    
    const newClaimedBy = [...(drop.claimed_by || []), user.email];
    await base44.entities.FlashDrop.update(drop.id, {
      claimed_by: newClaimedBy,
      items_remaining: Math.max(0, (drop.items_remaining || drop.total_items) - 1)
    });
    
    // Award points for claiming
    if (customer) {
      await base44.entities.Customer.update(customer.id, {
        points_balance: customer.points_balance + 25,
        total_points_earned: customer.total_points_earned + 25
      });
      setCustomer(prev => ({
        ...prev,
        points_balance: prev.points_balance + 25,
        total_points_earned: prev.total_points_earned + 25
      }));
    }
    
    queryClient.invalidateQueries({ queryKey: ["active-drops"] });
  };

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white">
        <div className="max-w-lg mx-auto px-5 pt-6 pb-8">
          <Link 
            to={createPageUrl("Home")}
            className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-[#D4C4B0] to-[#C9B8A6] p-3">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Flash Drops</h1>
                <p className="text-[#E8DED8] text-sm">Free coffee, random times!</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              {notificationsEnabled ? (
                <BellRing className="h-4 w-4 text-[#F8F6F4]" />
              ) : (
                <Bell className="h-4 w-4 text-[#D4C4B0]" />
              )}
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>
          </div>
          
          {notificationsEnabled && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-[#D4C4B0]/20 text-[#F8F6F4] text-sm rounded-xl px-4 py-2"
            >
              🔔 You'll get notified when new drops go live!
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 py-6 pb-24 space-y-8">
        {/* Active Drops */}
        {activeDrops.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-lg font-bold text-stone-800">Live Now</h2>
            </div>
            <div className="space-y-4">
              <AnimatePresence>
                {activeDrops.map(drop => (
                  <FlashDropCard
                    key={drop.id}
                    drop={drop}
                    currentUserEmail={user?.email}
                    onClaim={handleClaimDrop}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Upcoming Drops */}
        {upcomingDrops.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-[#8B7355]" />
              <h2 className="text-lg font-bold text-[#5C4A3A]">Coming Soon</h2>
            </div>
            <div className="space-y-4">
              <AnimatePresence>
                {upcomingDrops.map(drop => (
                  <FlashDropCard
                    key={drop.id}
                    drop={drop}
                    currentUserEmail={user?.email}
                    onClaim={handleClaimDrop}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* No Active Drops */}
        {activeDrops.length === 0 && upcomingDrops.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-10 w-10 text-stone-300" />
            </div>
            <h3 className="text-lg font-semibold text-[#5C4A3A]">No drops right now</h3>
            <p className="text-[#8B7355] text-sm mt-1">
              Turn on notifications to be the first to know!
            </p>
          </div>
        )}

        {/* Past Drops */}
        {pastDrops.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-[#5C4A3A] mb-4">Recent Drops</h2>
            <div className="space-y-3">
              {pastDrops.map(drop => (
                <div 
                  key={drop.id}
                  className="bg-white rounded-2xl border border-stone-200 p-4 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-stone-700">{drop.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-stone-500 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {drop.location_name || drop.location}
                        </span>
                        <span>
                          {format(new Date(drop.start_time), "MMM d, h:mm a")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold text-stone-700">
                        {drop.claimed_by?.length || 0}
                      </div>
                      <div className="text-stone-500">claimed</div>
                    </div>
                  </div>
                  {drop.claimed_by?.includes(user?.email) && (
                    <div className="mt-2 text-xs text-emerald-600 font-medium">
                      ✓ You claimed this drop
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}