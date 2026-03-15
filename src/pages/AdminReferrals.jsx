import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, TrendingUp, Award, Mail, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AdminReferrals() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      if (u.role !== "admin") {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(u);
    };
    loadUser();
  }, []);

  const { data: signups = [], isLoading } = useQuery({
    queryKey: ["waitlist-signups-referrals"],
    queryFn: () => base44.entities.WaitlistSignup.list(),
    enabled: !!user
  });

  // Calculate referral stats
  const referralStats = signups.reduce((acc, signup) => {
    if (!signup.referral_code) return acc;
    
    if (!acc[signup.referral_code]) {
      acc[signup.referral_code] = {
        referrer: signup,
        referrals: [],
        count: 0
      };
    }
    
    return acc;
  }, {});

  // Count referrals for each person (unique emails only)
  signups.forEach(signup => {
    if (signup.referred_by && referralStats[signup.referred_by]) {
      const existingEmails = referralStats[signup.referred_by].referrals.map(r => r.email);
      if (!existingEmails.includes(signup.email)) {
        referralStats[signup.referred_by].referrals.push(signup);
        referralStats[signup.referred_by].count++;
      }
    }
  });

  // Convert to array and sort by count
  const leaderboard = Object.values(referralStats)
    .sort((a, b) => b.count - a.count);

  // Get EBA candidates (5+ referrals)
  const ebaCandidates = leaderboard.filter(stat => stat.count >= 5);

  const sendEBAInvite = async (person) => {
    try {
      await base44.functions.invoke('sendEBAEmail', {
        full_name: person.referrer.full_name,
        email: person.referrer.email,
        referral_code: person.referrer.referral_code
      });
      toast.success(`EBA invitation sent to ${person.referrer.full_name}`);
    } catch (error) {
      toast.error("Failed to send invitation");
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[#8B7355]">Access Denied</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[#8B7355]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1ED] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-5 pt-6 pb-4">
          <Link 
            to={createPageUrl("AdminPOS")}
            className="inline-flex items-center gap-1 text-[#D4C4B0] text-sm mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Referral Analytics</h1>
              <p className="text-[#E8DED8] text-sm">Track referral performance & EBA candidates</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-white border-[#E8DED8]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#8B7355]">Total Signups</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#5C4A3A]">{signups.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E8DED8]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#8B7355]">Active Referrers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#5C4A3A]">
                {leaderboard.filter(s => s.count > 0).length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E8DED8]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#8B7355]">EBA Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#5C4A3A]">{ebaCandidates.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* EBA Candidates */}
        {ebaCandidates.length > 0 && (
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-[#5C4A3A]">Elite Bean Ambassadors (5+ Referrals)</CardTitle>
                </div>
                <Badge className="bg-amber-600 text-white">{ebaCandidates.length} Qualified</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ebaCandidates.map((stat) => (
                  <div key={stat.referrer.id} className="bg-white rounded-xl p-4 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#5C4A3A]">{stat.referrer.full_name}</h3>
                          {stat.referrer.eba_status === 'EBA' && (
                            <Badge className="bg-green-600 text-white">✓ EBA</Badge>
                          )}
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                            {stat.count} referrals
                          </Badge>
                        </div>
                        <p className="text-sm text-[#8B7355]">{stat.referrer.email}</p>
                        <p className="text-xs text-[#8B7355] mt-1">Code: {stat.referrer.referral_code}</p>
                      </div>
                      <Button
                        onClick={() => sendEBAInvite(stat)}
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send EBA Invite
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Referral Leaderboard */}
        <Card className="bg-white border-[#E8DED8]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#8B7355]" />
              <CardTitle className="text-[#5C4A3A]">Referral Leaderboard</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <p className="text-[#8B7355] text-center py-8">No referral data yet</p>
              ) : (
                leaderboard.map((stat, index) => (
                  <div key={stat.referrer.id} className="border border-[#E8DED8] rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-[#F5EBE8] text-[#8B7355]'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-[#5C4A3A]">{stat.referrer.full_name}</h3>
                            {stat.referrer.eba_status === 'EBA' && (
                              <Badge className="bg-green-600 text-white text-xs">✓ EBA</Badge>
                            )}
                          </div>
                          <p className="text-sm text-[#8B7355]">{stat.referrer.email}</p>
                          <p className="text-xs text-[#8B7355] mt-1">Code: {stat.referrer.referral_code}</p>
                        </div>
                      </div>
                      <Badge variant={stat.count >= 5 ? "default" : "secondary"} className={stat.count >= 5 ? "bg-amber-600" : ""}>
                        {stat.count} {stat.count === 1 ? 'referral' : 'referrals'}
                      </Badge>
                    </div>

                    {/* Show referred people */}
                    {stat.count > 0 && (
                      <div className="bg-[#F5EBE8] rounded-lg p-3 mt-3">
                        <p className="text-xs font-medium text-[#8B7355] mb-2">Referred People:</p>
                        <div className="space-y-1">
                          {stat.referrals.map((referral) => (
                            <div key={referral.id} className="text-xs text-[#5C4A3A] flex items-center gap-2">
                              <Users className="h-3 w-3 text-[#8B7355]" />
                              <span>{referral.full_name} ({referral.email})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}