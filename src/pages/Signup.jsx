import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function Signup() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { checkAppState } = useAuth();

    const handleSignup = async (e) => {
        e.preventDefault();
        if (!email || !password || !fullName) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsLoading(true);
        try {
            await base44.auth.register({ email, password });
            await base44.auth.loginViaEmailPassword(email, password);
            await base44.auth.updateMe({ full_name: fullName });
            toast.success("Welcome to the Bean Coffee Club!");
            await checkAppState();
            navigate("/");
        } catch (error) {
            console.error("Signup failed:", error);
            toast.error(error.message || "Failed to create account");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F1ED] flex flex-col">
            <div className="p-5">
                <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-[#8B7355] text-sm hover:text-[#5C4A3A] transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                </Link>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-5 -mt-10">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#8B7355] to-[#6B5744] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <UserPlus className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-[#5C4A3A]">Join the Club</h1>
                        <p className="text-[#8B7355] mt-2">Start earning points on every cup</p>
                    </div>

                    <form onSubmit={handleSignup} className="bg-white rounded-3xl border border-[#E8DED8] p-8 shadow-sm space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-[#5C4A3A]">Full Name</Label>
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="h-12 rounded-xl border-[#E8DED8] focus:border-[#8B7355] focus:ring-[#8B7355]"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[#5C4A3A]">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-12 rounded-xl border-[#E8DED8] focus:border-[#8B7355] focus:ring-[#8B7355]"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 rounded-xl border-[#E8DED8] focus:border-[#8B7355] focus:ring-[#8B7355]"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl bg-[#8B7355] hover:bg-[#6B5744] text-lg font-bold mt-2"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}
                        </Button>
                    </form>

                    <p className="text-center mt-8 text-[#8B7355]">
                        Already have an account?{" "}
                        <Link to="/login" className="font-bold text-[#5C4A3A] hover:underline">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
