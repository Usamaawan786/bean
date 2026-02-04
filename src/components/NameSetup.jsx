import { useState } from "react";
import { motion } from "framer-motion";
import { User, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";

export default function NameSetup({ onComplete }) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    await base44.auth.updateMe({ full_name: name.trim() });
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#8B7355] to-[#6B5744] flex items-center justify-center p-5 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#F5EBE8] flex items-center justify-center mx-auto mb-4">
            <Coffee className="h-8 w-8 text-[#8B7355]" />
          </div>
          <h2 className="text-2xl font-bold text-[#5C4A3A] mb-2">Welcome to BEAN Coffee!</h2>
          <p className="text-[#8B7355]">Let's get to know you better</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-[#5C4A3A]">What's your name?</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 border-[#E8DED8] focus:ring-[#8B7355] focus:border-[#8B7355]"
              autoFocus
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full rounded-xl bg-[#8B7355] hover:bg-[#6B5744] py-6"
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}