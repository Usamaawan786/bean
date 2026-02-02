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
import SignupNotification from "@/components/waitlist/SignupNotification";

export default function Waitlist() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: ""
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
      const response = await base44.functions.invoke('getWaitlistCount', {});
      setTotalSignups(147 + response.data.count);
    } catch (error) {
      console.error("Failed to load signups");
      setTotalSignups(147);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await base44.functions.invoke('joinWaitlist', formData);
      
      if (response.data.success) {
        setPosition(response.data.position);
        setReferralCode(response.data.referralCode);
        setSubmitted(true);
        
        // Celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        toast.success("Welcome to the BEAN community! 🎉");
      } else {
        toast.error(response.data.error || "Something went wrong.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Something went wrong. Please try again.");
    }
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
              Welcome to BEAN! 🎉
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xl text-[#E8DED8] mb-4"
            >
              You're number <span className="text-3xl font-bold text-amber-300">#{position}</span> in line
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-amber-500/20 border-2 border-amber-400 rounded-2xl p-6 mb-8"
            >
              <h2 className="text-2xl font-bold mb-2">⚠️ One More Step Required</h2>
              <p className="text-lg text-[#E8DED8] mb-4">
                To complete your registration and secure your perks, you must follow us on Instagram
              </p>
              <motion.a
                href="https://www.instagram.com/bean.coffee.pk"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl hover:shadow-2xl transition-all"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Follow @bean.coffee.pk on Instagram
              </motion.a>
            </motion.div>

          {/* Early Bird Perks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
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
            transition={{ delay: 1 }}
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
            transition={{ delay: 1.2 }}
            className="text-[#E8DED8] mt-8"
          >
            After following us on Instagram, we'll email you when it's time to join!
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1ED] to-[#EBE5DF]">
      <SignupNotification />

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
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mb-6"
            >
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976cd7fe6e4b20fcb30cf61/89b5c937a_Group135.png" 
                alt="BEAN" 
                className="h-16 md:h-20 mx-auto"
              />
            </motion.div>

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
              Islamabad's First<br />
              <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">Coffee Lover's Club</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl text-[#E8DED8] mb-8"
            >
              Where great coffee meets great people.<br />
              <strong>Exclusive events, challenges, rewards & more.</strong>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-3 justify-center mb-8"
            >
              <Badge className="bg-amber-500/20 text-amber-200 px-5 py-2.5 text-base font-semibold border border-amber-400/30">
                🎁 50 Points Welcome Bonus
              </Badge>
              <Badge className="bg-green-500/20 text-green-200 px-5 py-2.5 text-base font-semibold border border-green-400/30">
                💰 20% Off Your First 3 Orders
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-200 px-5 py-2.5 text-base font-semibold border border-purple-400/30">
                👑 Founding Member Badge
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-200 px-5 py-2.5 text-base font-semibold border border-blue-400/30">
                ⚡ Priority Event Access
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
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Calendar className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#5C4A3A] text-lg mb-1">Secret Tasting Events</h3>
                    <p className="text-[#8B7355]">Monthly exclusive meetups at BEAN. Try rare beans, meet fellow coffee lovers, and expand your palate.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Trophy className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#5C4A3A] text-lg mb-1">Brewing Battles</h3>
                    <p className="text-[#8B7355]">Show off your skills in latte art competitions, blind taste challenges, and coffee trivia with real prizes.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Gift className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#5C4A3A] text-lg mb-1">Epic Rewards</h3>
                    <p className="text-[#8B7355]">Every cup counts. Earn points, unlock tiers, get free drinks, early access to new drops, and VIP perks.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#5C4A3A] text-lg mb-1">Your Tribe</h3>
                    <p className="text-[#8B7355]">Private community of passionate coffee lovers. Share experiences, organize hangouts at BEAN, make friends.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Platform Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="bg-white rounded-3xl border-2 border-[#E8DED8] p-8 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[#5C4A3A]">Coffee Social Hub</h3>
              </div>
              <p className="text-[#8B7355] mb-4 leading-relaxed">
                Connect with fellow coffee enthusiasts! Share your coffee moments, follow your favorite creators, discover new recipes, learn brewing techniques, and engage with a vibrant community of coffee lovers.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-pink-100 text-pink-700 border-pink-200">📸 Share Posts</Badge>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">💬 Comment & Like</Badge>
                <Badge className="bg-purple-100 text-purple-700 border-purple-200">👥 Follow Creators</Badge>
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">📚 Learn Recipes</Badge>
              </div>
            </motion.div>

            {/* Testimonial */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}
              className="bg-gradient-to-br from-[#F5EBE8] to-white rounded-3xl border-2 border-[#E8DED8] p-8 shadow-xl"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-amber-400 text-xl">★</span>
                ))}
              </div>
              <p className="text-[#5C4A3A] text-lg leading-relaxed mb-4">"This isn't just another coffee shop - it's a whole vibe! I've met amazing people, the events are incredible, and the challenges are so much fun. Plus the rewards are actually good!"</p>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-[#8B7355] to-[#6B5744] rounded-full flex items-center justify-center text-white text-xl font-bold">S</div>
                <div>
                  <p className="font-bold text-[#5C4A3A]">Sarah Khan</p>
                  <p className="text-sm text-[#8B7355]">Founding Member • F-7 Islamabad</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Signup Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="sticky top-8"
          >
            <div className="bg-white rounded-3xl border-2 border-[#E8DED8] shadow-2xl p-8 relative overflow-hidden">
              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full -mr-16 -mt-16"></div>
              
              <div className="text-center mb-8 relative">
                <Badge className="bg-amber-500 text-white px-4 py-1 mb-3">Limited Spots</Badge>
                <h3 className="text-3xl font-bold text-[#5C4A3A] mb-2">Secure Your Spot</h3>
                <p className="text-[#8B7355] text-lg">Join the first 500 founding members</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label className="text-base font-semibold text-[#5C4A3A]">Your Name</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    required
                    placeholder="Ahmed Khan"
                    className="border-2 border-[#E8DED8] focus:border-[#8B7355] h-12 text-base rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-base font-semibold text-[#5C4A3A]">Email Address</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    placeholder="ahmed@example.com"
                    className="border-2 border-[#E8DED8] focus:border-[#8B7355] h-12 text-base rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#8B7355] via-[#7A6448] to-[#6B5744] hover:shadow-2xl hover:scale-[1.02] transition-all text-white py-6 text-lg font-bold rounded-xl"
                >
                  Claim Your Early Bird Perks <ArrowRight className="h-5 w-5 ml-2" />
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-[#8B7355] pt-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Free to join • No credit card required</span>
                </div>
              </form>

              {/* Trust badges */}
              <div className="mt-6 pt-6 border-t border-[#E8DED8] grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-[#5C4A3A]">50+</p>
                  <p className="text-xs text-[#8B7355]">Bonus Points</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#5C4A3A]">20%</p>
                  <p className="text-xs text-[#8B7355]">First Orders</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#5C4A3A]">VIP</p>
                  <p className="text-xs text-[#8B7355]">Status</p>
                </div>
              </div>
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

        {/* Final CTA - Optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-16 bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-[#E8DED8]"
        >
          <div className="bg-gradient-to-br from-[#8B7355] via-[#7A6448] to-[#6B5744] text-white px-6 py-8 md:px-12 md:py-12 relative overflow-hidden">
            {/* Animated coffee beans */}
            <div className="absolute inset-0 opacity-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute top-10 right-10 w-20 h-20"
              >
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976cd7fe6e4b20fcb30cf61/89b5c937a_Group135.png" 
                  alt="" 
                  className="w-full h-full opacity-50"
                />
              </motion.div>
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-10 left-10 w-16 h-16"
              >
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976cd7fe6e4b20fcb30cf61/89b5c937a_Group135.png" 
                  alt="" 
                  className="w-full h-full opacity-50"
                />
              </motion.div>
            </div>

            <div className="relative text-center">
              <Badge className="bg-red-500 text-white px-4 py-2 text-sm font-bold mb-4 shadow-lg animate-pulse">
                LIMITED TIME OFFER
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-3">Only {500 - (totalSignups - 147)} Founding Spots Left</h2>
              <p className="text-lg md:text-xl text-[#E8DED8]">
                Lock in your perks before we hit 500 members
              </p>
            </div>
          </div>

          {/* Perks Grid */}
          <div className="px-6 py-8 md:px-12 md:py-10">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-4 bg-amber-50 rounded-2xl p-5">
                <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Gift className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-[#5C4A3A] text-lg mb-1">50 Bonus Points</h3>
                  <p className="text-sm text-[#8B7355]">Start earning rewards immediately</p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-green-50 rounded-2xl p-5">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-[#5C4A3A] text-lg mb-1">20% Off First 3 Orders</h3>
                  <p className="text-sm text-[#8B7355]">Save big on your first visits</p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-purple-50 rounded-2xl p-5">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-[#5C4A3A] text-lg mb-1">Founding Member Badge</h3>
                  <p className="text-sm text-[#8B7355]">Exclusive status forever</p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-blue-50 rounded-2xl p-5">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-[#5C4A3A] text-lg mb-1">Priority Event Access</h3>
                  <p className="text-sm text-[#8B7355]">First to know, first to go</p>
                </div>
              </div>
            </div>

            <div className="text-center flex flex-col items-center">
              <p className="text-[#8B7355] text-lg mb-6">
                <strong className="text-[#5C4A3A]">Worth PKR 5,000+</strong> • Free for early birds
              </p>
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Button 
                  onClick={() => {
                    const signupForm = document.querySelector('form');
                    signupForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:shadow-2xl text-white px-12 py-6 text-lg font-bold rounded-2xl"
                >
                  Secure My Spot Now <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </motion.div>
              <p className="text-sm text-[#8B7355] mt-4">⚡ Spots filling fast • No credit card required</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}