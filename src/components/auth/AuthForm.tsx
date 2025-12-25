import React, { useState } from 'react';
import { Button } from '../ui/button';
import { User, MapPin, ArrowRight } from 'lucide-react';

interface AuthFormProps {
    mode: 'login' | 'signup';
    setMode: (mode: 'login' | 'signup') => void;
    onSubmit: (data: { phone: string; name?: string; city?: string }) => void;
    isLoading: boolean;
}

export function AuthForm({ mode, setMode, onSubmit, isLoading }: AuthFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        city: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            phone: formData.phone, // AuthContainer preprends +91
            ...(mode === 'signup' ? { name: formData.name, city: formData.city } : {}),
        });
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 10); // Only numbers, max 10
        setFormData({ ...formData, phone: value });
    };

    return (
        <div className="space-y-8 font-sans">
            <div className="text-center mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-[#084C28]">
                    {mode === 'login' ? 'Welcome Back' : 'Join Murugan AI'}
                </h2>
                <p className="text-sm text-gray-500 mt-3 font-medium">
                    {mode === 'login'
                        ? 'Login with your WhatsApp number'
                        : 'Create an account to get started'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {mode === 'signup' && (
                    <>
                        {/* Full Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">
                                Full Name
                            </label>
                            <div className="flex items-center h-14 w-full bg-white rounded-2xl border border-gray-200 px-4 shadow-sm focus-within:ring-1 focus-within:ring-[#084C28] transition-all">
                                <User className="w-5 h-5 text-gray-400 shrink-0 mr-3" />
                                <div className="w-px h-5 bg-gray-200 shrink-0"></div>
                                <input
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required={mode === 'signup'}
                                    className="flex-1 min-w-0 bg-transparent border-none outline-none ring-0 text-gray-900 font-medium placeholder:text-gray-400 h-full ml-3 text-base"
                                />
                            </div>
                        </div>

                        {/* City */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">
                                City
                            </label>
                            <div className="flex items-center h-14 w-full bg-white rounded-2xl border border-gray-200 px-4 shadow-sm focus-within:ring-1 focus-within:ring-[#084C28] transition-all">
                                <MapPin className="w-5 h-5 text-gray-400 shrink-0 mr-3" />
                                <div className="w-px h-5 bg-gray-200 shrink-0"></div>
                                <input
                                    placeholder="Your City"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    required={mode === 'signup'}
                                    className="flex-1 min-w-0 bg-transparent border-none outline-none ring-0 text-gray-900 font-medium placeholder:text-gray-400 h-full ml-3 text-base"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* WhatsApp Number with Fixed +91 */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">
                        WhatsApp Number
                    </label>
                    <div className="flex items-center h-14 w-full bg-white rounded-2xl border border-gray-200 px-4 shadow-sm focus-within:ring-1 focus-within:ring-[#084C28] transition-all">
                        <span className="text-gray-600 font-bold text-base shrink-0 mr-3">+91</span>
                        <div className="w-px h-5 bg-gray-200 shrink-0"></div>
                        <input
                            type="tel"
                            placeholder="Enter your WhatsApp number"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            required
                            className="flex-1 min-w-0 bg-transparent border-none outline-none ring-0 text-gray-900 font-medium placeholder:text-gray-400 h-full ml-3 text-base"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-14 bg-[#084C28] hover:bg-[#063a1f] text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-md mt-6 transition-all active:scale-[0.98] text-base"
                    disabled={isLoading}
                >
                    {isLoading ? 'Processing...' : (
                        <>
                            {mode === 'login' ? 'Get OTP' : 'Create Account'}
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </Button>
            </form>

            <div className="text-center pt-2">
                <button
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="text-sm md:text-base text-[#084C28] font-extrabold hover:text-[#063a1f] hover:underline py-2 transition-colors"
                >
                    {mode === 'login'
                        ? "Didn't have account? Sign UP"
                        : "Already have an account? Login"}
                </button>
            </div>
        </div>
    );
}
