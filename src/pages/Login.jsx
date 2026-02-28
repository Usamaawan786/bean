import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Coffee } from "lucide-react";


export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
  

    const from = new URLSearchParams(location.search).get("next") || new URLSearchParams(location.search).get("from") || "/";

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please enter both email and password");
            return;
        }

        setIsLoading(true);
        try {
            await base44.auth.loginViaEmailPassword(email, password);
           
            toast.success("Welcome back!");
            navigate(from.startsWith('http') ? '/' : from);
        } catch (error) {
            console.error("Login failed:", error);
            toast.error(error.message || "Invalid credentials");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F1ED] flex flex-col">
            <div className="p-5">
                <Link
                    to="/"
                    className="inline-flex items-center gap-1 text-[#8B7355] text-sm hover:text-[#5C4A3A] transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                </Link>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-5 -mt-20">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#8B7355] to-[#6B5744] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Coffee className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-[#5C4A3A]">Welcome Back</h1>
                        <p className="text-[#8B7355] mt-2">Sign in to access your rewards</p>
                    </div>

                    <form onSubmit={handleLogin} className="bg-white rounded-3xl border border-[#E8DED8] p-8 shadow-sm space-y-6">
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
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-[#5C4A3A]">Password</Label>
                                <button
                                    type="button"
                                    onClick={() => toast.info("Please contact support to reset password")}
                                    className="text-xs text-[#8B7355] hover:underline"
                                >
                                    Forgot password?
                                </button>
                            </div>
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
                            className="w-full h-12 rounded-xl bg-[#8B7355] hover:bg-[#6B5744] text-lg font-bold"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
                        </Button>
                    </form>

                    <p className="text-center mt-8 text-[#8B7355]">
                        Don't have an account?{" "}
                        <Link to="/signup" className="font-bold text-[#5C4A3A] hover:underline">
                            Join the Club
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
