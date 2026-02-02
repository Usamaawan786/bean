import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Coffee, Users, Calendar, Trophy, Gift, Sparkles, ArrowRight, CheckCircle, MapPin, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export default function Waitlist() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    interests: []
  });
  const [submitted, setSubmitted] = useState(false);
  const [position, setPosition] = useState(null);
  const [referralCode, setReferralCode] = useState("");
  const [totalSignups, setTotalSignups] = useState(147); // Starting number for social proof

  useEffect(() => {
    // Check for referral code in URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setFormData(prev => ({ ...prev, referred_by: ref }));
    }

    // Load total signups
    loadTotalSignups();
  }, []);

  const loadTotalSignups = async () => {
    try {
      const signups = await base44.entities.WaitlistSignup.list();
      setTotalSignups(147 + signups.length); // Base number + actual signups
    } catch (error) {
      console.error("Failed to load signups");
    }
  };

  const interests = [
    { id: "events", label: "Community Events", icon: Calendar },
    { id: "games", label: "Coffee Games", icon: Trophy },
    { id: "challenges", label: "Brewing Challenges", icon: Sparkles },
    { id: "tastings", label: "Tasting Sessions", icon: Coffee }
  ];

  const toggleInterest = (id) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter(i => i !== id)
        : [...prev.interests, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Generate unique referral code
    const refCode = formData.full_name.split(" ")[0].toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

    // Get current position
    const signups = await base44.entities.WaitlistSignup.list();
    const newPosition = signups.length + 1;

    await base44.entities.WaitlistSignup.create({
      ...formData,
      referral_code: refCode,
      position: newPosition
    });

    setPosition(newPosition);
    setReferralCode(refCode);
    setSubmitted(true);
    
    // Celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    toast.success("Welcome to the BEAN community! 🎉");
  };

  const shareLink = `${window.location.origin}/Waitlist?ref=${referralCode}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Link copied! Share with friends to move up the list.");
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <motion.div
            animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-20 left-10 w-64 h-64 bg-[#D4C4B0]/40 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -80, 0], y: [0, -40, 0] }}
            transition={{ duration: 15, repeat: Infinity }}
            className="absolute bottom-10 right-10 w-96 h-96 bg-[#C9B8A6]/30 rounded-full blur-3xl"
          />
        </div>

        <div className="relative max-w-2xl mx-auto px-5 py-20 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="w-24 h-24 bg-white rounded-full mx-auto mb-8 flex items-center justify-center"
          >
            <CheckCircle className="h-12 w-12 text-green-500" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            You're On The List! ☕
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xl text-[#E8DED8] mb-8"
          >
            You're number <span className="text-3xl font-bold text-amber-300">#{position}</span> in line
          </motion.p>

          {/* Early Bird Perks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 p-8 mb-8"
          >
            <h3 className="text-2xl font-bold mb-6">Your Early Bird Perks 🎁</h3>
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400/20 rounded-full flex items-center justify-center">
                  <Gift className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <p className="font-semibold">50 Welcome Bonus Points</p>
                  <p className="text-sm text-[#E8DED8]">Get started with rewards immediately</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-400/20 rounded-full flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="font-semibold">20% Off First 3 Purchases</p>
                  <p className="text-sm text-[#E8DED8]">Exclusive early bird discount</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-400/20 rounded-full flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <p className="font-semibold">Founding Member Badge</p>
                  <p className="text-sm text-[#E8DED8]">Special status in the community</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-400/20 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-300" />
                </div>
                <div>
                  <p className="font-semibold">First Access to Events</p>
                  <p className="text-sm text-[#E8DED8]">Priority booking for tastings & challenges</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Share Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 p-8"
          >
            <h3 className="text-xl font-bold mb-3">Move Up The List</h3>
            <p className="text-[#E8DED8] mb-6">Share your referral link - for every friend who joins, you both move up 3 spots!</p>
            
            <div className="flex gap-3">
              <Input
                value={shareLink}
                readOnly
                className="bg-white/20 border-white/30 text-white"
              />
              <Button onClick={copyShareLink} className="bg-white text-[#8B7355] hover:bg-[#F5EBE8]">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-[#E8DED8] mt-8"
          >
            We'll email you when it's time to join the community!
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1ED] to-[#EBE5DF]">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#8B7355] via-[#6B5744] to-[#5C4A3A] text-white overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <motion.div
            animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-20 left-10 w-64 h-64 bg-[#D4C4B0]/40 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -80, 0], y: [0, -40, 0] }}
            transition={{ duration: 15, repeat: Infinity }}
            className="absolute bottom-10 right-10 w-96 h-96 bg-[#C9B8A6]/30 rounded-full blur-3xl"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            {/* Social Proof Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-lg px-4 py-2 rounded-full mb-6 border border-white/20"
            >
              <Users className="h-4 w-4 text-amber-300" />
              <span className="text-sm font-medium">{totalSignups}+ coffee lovers already joined</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            >
              Join Islamabad's<br />Coffee Community
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl text-[#E8DED8] mb-8"
            >
              Events. Games. Challenges. Rewards.<br />
              More than just coffee - it's a lifestyle.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-3 justify-center mb-8"
            >
              <Badge className="bg-amber-500/20 text-amber-200 px-4 py-2 text-sm border border-amber-400/30">
                🎁 50 Bonus Points
              </Badge>
              <Badge className="bg-green-500/20 text-green-200 px-4 py-2 text-sm border border-green-400/30">
                💰 20% Off First 3 Orders
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-200 px-4 py-2 text-sm border border-purple-400/30">
                👑 Founding Member Status
              </Badge>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-3xl font-bold text-[#5C4A3A] mb-6">What's Inside</h2>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#D4C4B0] to-[#C9B8A6] rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#5C4A3A] mb-1">Exclusive Events</h3>
                    <p className="text-[#8B7355]">Monthly coffee tastings, brewing workshops, and community meetups at secret locations</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#C9B8A6] to-[#B5A593] rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#5C4A3A] mb-1">Coffee Challenges</h3>
                    <p className="text-[#8B7355]">Compete in brewing competitions, blind tastings, and latte art battles with prizes</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#B5A593] to-[#9D8B7A] rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Gift className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#5C4A3A] mb-1">Reward System</h3>
                    <p className="text-[#8B7355]">Earn points with every purchase, unlock tiers, and get free drinks & exclusive perks</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#9D8B7A] to-[#8B7355] rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#5C4A3A] mb-1">Private Community</h3>
                    <p className="text-[#8B7355]">Connect with fellow coffee enthusiasts, share reviews, and discover new spots together</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white rounded-3xl border border-[#E8DED8] p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#8B7355] to-[#6B5744] rounded-full"></div>
                <div>
                  <p className="font-semibold text-[#5C4A3A]">Sarah K.</p>
                  <p className="text-sm text-[#8B7355]">Early Member, F-7</p>
                </div>
              </div>
              <p className="text-[#5C4A3A] italic">"Best coffee community in Islamabad! The events are amazing and I've discovered so many hidden gem cafes through fellow members. The rewards make it even better!"</p>
            </motion.div>
          </motion.div>

          {/* Signup Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="sticky top-8"
          >
            <div className="bg-white rounded-3xl border border-[#E8DED8] shadow-2xl p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-[#5C4A3A] mb-2">Join The Waitlist</h3>
                <p className="text-[#8B7355]">Limited spots for Islamabad coffee lovers</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    required
                    placeholder="Ahmed Khan"
                    className="border-[#E8DED8]"
                  />
                </div>

                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    placeholder="ahmed@example.com"
                    className="border-[#E8DED8]"
                  />
                </div>

                <div>
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="03XX-XXXXXXX"
                    className="border-[#E8DED8]"
                  />
                </div>

                <div>
                  <Label>Your Area in Islamabad</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., F-7, Blue Area, Bahria Town"
                    className="border-[#E8DED8]"
                  />
                </div>

                <div>
                  <Label className="mb-3 block">What interests you? (Select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {interests.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleInterest(id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          formData.interests.includes(id)
                            ? "border-[#8B7355] bg-[#F5EBE8]"
                            : "border-[#E8DED8] bg-white hover:border-[#C9B8A6]"
                        }`}
                      >
                        <Icon className="h-4 w-4 text-[#8B7355]" />
                        <span className="text-sm text-[#5C4A3A]">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:from-[#6B5744] hover:to-[#5C4A3A] text-white py-6 text-lg rounded-xl"
                >
                  Join Waitlist <ArrowRight className="h-5 w-5 ml-2" />
                </Button>

                <p className="text-xs text-center text-[#8B7355]">
                  By joining, you agree to receive updates about BEAN Coffee community
                </p>
              </form>
            </div>

            {/* Trust Signals */}
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-4 text-sm text-[#8B7355]">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>Islamabad Based</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Coffee className="h-4 w-4" />
                  <span>Premium Quality</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-16 text-center bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white rounded-3xl p-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Don't Miss Out</h2>
          <p className="text-xl text-[#E8DED8] mb-6">
            Early birds get 20% off their first 3 orders + exclusive founding member perks
          </p>
          <Badge className="bg-amber-400 text-[#5C4A3A] px-6 py-3 text-lg font-bold">
            Limited to First 500 Members
          </Badge>
        </motion.div>
      </div>
    </div>
  );
}