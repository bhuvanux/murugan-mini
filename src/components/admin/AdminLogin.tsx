import React, { useState } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import imgSplashLogo from "../../assets/splash-logo.png";
import imgKolam from "../../assets/kolam_Bottom.png";

export function AdminLogin() {
    const { signInWithEmail } = useAdminAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Please enter both email and password');
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await signInWithEmail(email, password);

            if (error) {
                toast.error(error.message || 'Invalid credentials');
            } else {
                if (rememberMe) {
                    localStorage.setItem('admin_remember', 'true');
                }
                toast.success('Welcome to Admin Dashboard');
            }
        } catch (error: any) {
            toast.error('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-[#084C28] overflow-hidden font-sans">
            {/* Top Logo Bar */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-[#084C28] p-6 flex justify-center">
                <div className="w-48 h-48">
                    <img
                        src={imgSplashLogo}
                        alt="Murugan Logo"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* Left Sidebar - Branded Panel (Desktop Only) */}
            <div className="hidden lg:flex lg:w-[42%] bg-[#084C28]/50 relative flex-col items-center justify-center p-12 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                    <img
                        src={imgKolam}
                        alt=""
                        className="w-full h-full object-cover scale-150"
                    />
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 flex flex-col items-center text-center animate-in fade-in slide-in-from-left duration-700">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
                        Tamil Kadavul <br />
                        <span className="text-yellow-400">Murugan</span>
                    </h1>
                    <p className="text-white/80 text-lg md:text-xl max-w-md font-medium leading-relaxed">
                        The ultimate spiritual companion and administrative control center.
                    </p>

                    <div className="mt-16 pt-16 border-t border-white/10 w-full max-w-xs">
                        <blockquote className="text-white/60 italic text-sm">
                            "Connecting devotees with the divine through modern technology."
                        </blockquote>
                    </div>
                </div>

                {/* Bottom Branding */}
                <div className="absolute bottom-8 left-12 right-12 flex justify-between items-center text-white/40 text-xs font-bold uppercase tracking-widest z-10">
                    <span>Admin Panel v2.0</span>
                    <span> 2024 TKM</span>
                </div>
            </div>

            {/* Right Section - Login Area */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12 relative bg-[#084C28] pt-24">
                <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom duration-500 delay-150">

                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white/90 mb-2">Welcome back</h2>
                        <p className="text-white/70">Enter your credentials to manage TKM platform.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Email Field */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/90 ml-1">
                                    Email Address
                                </label>
                                <div className="group relative">
                                    <input
                                        type="email"
                                        placeholder="admin@tamilkadavulmurugan.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="block w-full h-12 px-4 bg-white/10 border border-white/20 rounded-lg text-white font-medium placeholder:text-white/50 focus:ring-2 focus:ring-white/20 focus:border-white/40 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/90 ml-1">
                                    Password
                                </label>
                                <div className="group relative">
                                    <input
                                        type="password"
                                        placeholder="•••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="block w-full h-12 px-4 bg-white/10 border border-white/20 rounded-lg text-white font-medium placeholder:text-white/50 focus:ring-2 focus:ring-white/20 focus:border-white/40 transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center px-1 py-2">
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 bg-white text-[#084C28] hover:bg-gray-100 font-bold rounded-lg flex items-center justify-center gap-3 shadow-lg shadow-black/20 mt-6 transition-all active:scale-[0.98] text-base disabled:opacity-70 hover:scale-105 hover:shadow-xl"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-[#084C28]/30 border-t-[#084C28] rounded-full animate-spin" />
                                    Authenticating...
                                </span>
                            ) : (
                                <>
                                    Log In to Dashboard
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Desktop Footer Only */}
                    <div className="mt-20 hidden lg:block">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.3em] leading-relaxed border-t border-gray-100 pt-8 text-center">
                            Authorized Access Only<br />
                            <span className="opacity-40 font-medium normal-case tracking-normal">Technical issues? Contact support@tamilkadavulmurugan.com</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
