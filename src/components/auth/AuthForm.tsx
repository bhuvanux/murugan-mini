import React, { useState } from 'react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { User, MapPin, ArrowRight, Search, X, ChevronDown, Check } from 'lucide-react';
import { TAMIL_NADU_CITIES } from '../../utils/constants';
import { useAuthAnalytics } from '../../utils/analytics/useAnalytics';

interface AuthFormProps {
    mode: 'login' | 'signup';
    setMode: (mode: 'login' | 'signup') => void;
    onSubmit: (data: { phone: string; name?: string; city?: string }) => void;
    isLoading: boolean;
}

export function AuthForm({ mode, setMode, onSubmit, isLoading }: AuthFormProps) {
    const { trackEvent } = useAuthAnalytics();

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        city: '',
    });

    const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
    const [citySearch, setCitySearch] = useState('');

    const POPULAR_CITIES = ['Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem', 'Tirunelveli', 'Erode', 'Vellore'];
    const OTHER_CITIES = TAMIL_NADU_CITIES.filter(city => !POPULAR_CITIES.includes(city)).sort();

    const filteredPopular = POPULAR_CITIES.filter(city =>
        city.toLowerCase().includes(citySearch.toLowerCase())
    );

    const filteredOther = OTHER_CITIES.filter(city =>
        city.toLowerCase().includes(citySearch.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === 'signup') {
            if (!formData.name.trim()) {
                toast.error('Please enter your full name');
                return;
            }
            if (!formData.city) {
                toast.error('Please select your city');
                return;
            }
            // Save city to localStorage for analytics before session is established
            localStorage.setItem('last_selected_city', formData.city);
        }

        if (formData.phone.length !== 10) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }

        // Track phone submit event
        trackEvent('phone_submit', {
            city: formData.city || 'unknown',
            mode
        });

        onSubmit({
            phone: formData.phone,
            ...(mode === 'signup' ? { name: formData.name, city: formData.city } : {}),
        });
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
        setFormData({ ...formData, phone: value });
    };

    return (
        <div className="space-y-5 font-sans">
            <div className="text-center mb-4">
                <h2 className="text-xl md:text-2xl font-semibold text-[#084C28] tracking-tight">
                    {mode === 'login' ? 'Welcome Back' : 'Join Tamil Kadavul Murugan'}
                </h2>
                <p className="text-sm text-gray-500 mt-2 font-medium">
                    {mode === 'login'
                        ? 'Login with your WhatsApp number'
                        : 'Create an account to get started'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                {mode === 'signup' && (
                    <>
                        {/* Full Name */}
                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-bold text-gray-800 ml-1">
                                Full Name
                            </label>
                            <div className="flex items-center h-12 w-full bg-white rounded-2xl border border-gray-200 px-4 shadow-sm focus-within:ring-1 focus-within:ring-[#084C28] transition-all">
                                <User className="w-5 h-5 text-gray-400 shrink-0 mr-3" />
                                <div className="w-px h-4 bg-gray-200 shrink-0"></div>
                                <input
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required={mode === 'signup'}
                                    className="flex-1 min-w-0 bg-transparent border-none outline-none ring-0 text-gray-900 font-medium placeholder:text-gray-400 h-full ml-3 text-sm"
                                />
                            </div>
                        </div>

                        {/* City Dropdown */}
                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-bold text-gray-800 ml-1">
                                City
                            </label>
                            <div
                                onClick={() => setIsCityPickerOpen(true)}
                                className="flex items-center h-12 w-full bg-white rounded-2xl border border-gray-200 px-4 shadow-sm focus-within:ring-1 focus-within:ring-[#084C28] transition-all cursor-pointer overflow-hidden"
                            >
                                <MapPin className="w-5 h-5 text-gray-400 shrink-0 mr-3" />
                                <div className="w-px h-4 bg-gray-200 shrink-0"></div>
                                <div className="flex-1 ml-3 flex items-center justify-between">
                                    <span className={`text-sm font-medium ${formData.city ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {formData.city || "Select Your City"}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* WhatsApp Number */}
                <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold text-gray-800 ml-1">
                        WhatsApp Number
                    </label>
                    <div className="flex items-center h-12 w-full bg-white rounded-2xl border border-gray-200 px-4 shadow-sm focus-within:ring-1 focus-within:ring-[#084C28] transition-all">
                        <span className="text-gray-600 font-semibold text-sm shrink-0 mr-3">+91</span>
                        <div className="w-px h-4 bg-gray-200 shrink-0"></div>
                        <input
                            type="tel"
                            placeholder="Enter your WhatsApp number"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            required
                            className="flex-1 min-w-0 bg-transparent border-none outline-none ring-0 text-gray-900 font-medium placeholder:text-gray-400 h-full ml-3 text-sm"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 bg-[#084C28] hover:bg-[#063a1f] text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md mt-6 transition-all active:scale-[0.98] text-sm"
                    disabled={isLoading}
                >
                    {isLoading ? 'Processing...' : (
                        <>
                            {mode === 'login' ? 'Get OTP' : 'Create Account'}
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </Button>
            </form>

            <div className="text-center pt-2">
                <button
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="text-sm font-medium py-1 transition-colors"
                >
                    {mode === 'login' ? (
                        <>
                            <span className="text-gray-500">Didn't have account? </span>
                            <span className="text-[#084C28] font-bold hover:underline">Sign Up</span>
                        </>
                    ) : (
                        <>
                            <span className="text-gray-500">Already have an account? </span>
                            <span className="text-[#084C28] font-bold hover:underline">Login</span>
                        </>
                    )}
                </button>
            </div>

            {/* City Picker Overlay */}
            {isCityPickerOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsCityPickerOpen(false)}
                    />
                    <div
                        className="relative w-full max-w-lg bg-white rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
                        style={{ height: '85vh', maxHeight: '85vh' }}
                    >
                        {/* Header Section - FORCE STICKY */}
                        <div
                            className="flex flex-col shrink-0 bg-white border-b border-gray-100"
                            style={{ position: 'sticky', top: 0, zIndex: 50 }}
                        >
                            <div className="w-full flex justify-center pt-3 pb-1">
                                <div className="w-12 h-1 bg-gray-200 rounded-full" />
                            </div>
                            <div className="px-6 pt-2 pb-2 flex items-center justify-between">
                                <h3 className="text-base font-bold text-gray-900">Select City</h3>
                                <button type="button" onClick={() => setIsCityPickerOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-4 pt-1 pb-4">
                                <div className="flex items-center w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 gap-3 focus-within:ring-2 focus-within:ring-[#084C28]/20 focus-within:border-[#084C28] transition-all">
                                    <Search size={18} className="text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search your city..."
                                        value={citySearch}
                                        onChange={(e) => setCitySearch(e.target.value)}
                                        className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 p-0 text-gray-900 placeholder:text-gray-400"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Scrollable List */}
                        <div className="flex-1 overflow-y-auto px-4 pb-10 outline-none min-h-0 bg-white">
                            {/* Popular Cities */}
                            {filteredPopular.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-[10px] uppercase tracking-[0.1em] font-black text-gray-400 mb-3 ml-1">Popular Cities</h4>
                                    <div className="flex flex-col gap-1">
                                        {filteredPopular.map(city => (
                                            <button
                                                key={city}
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, city });
                                                    setIsCityPickerOpen(false);
                                                    setCitySearch('');
                                                }}
                                                className={`flex items-center justify-between px-4 py-4 rounded-xl transition-all text-sm font-bold ${formData.city === city
                                                    ? 'bg-[#084C28]/5 text-[#084C28]'
                                                    : 'bg-white text-gray-700 hover:bg-gray-50 active:scale-[0.99] border-b border-gray-50'}`}
                                            >
                                                <span>{city}</span>
                                                {formData.city === city ? <Check size={18} className="text-[#084C28]" /> : <ArrowRight size={16} className="text-gray-300" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* All Other Cities */}
                            <div className="mt-6 mb-4">
                                <h4 className="text-[10px] uppercase tracking-[0.1em] font-black text-gray-400 mb-3 ml-1">
                                    {citySearch ? 'Search Results' : 'All Cities'}
                                </h4>
                                <div className="flex flex-col gap-1">
                                    {filteredOther.map(city => (
                                        <button
                                            key={city}
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, city });
                                                setIsCityPickerOpen(false);
                                                setCitySearch('');
                                            }}
                                            className={`flex items-center justify-between px-4 py-4 rounded-xl transition-all text-sm font-bold ${formData.city === city
                                                ? 'bg-[#084C28]/5 text-[#084C28]'
                                                : 'bg-white text-gray-700 hover:bg-gray-50 active:scale-[0.99] border-b border-gray-50'}`}
                                        >
                                            <span className="truncate">{city}</span>
                                            {formData.city === city ? <Check size={18} className="text-[#084C28]" /> : <ArrowRight size={16} className="text-gray-300" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {filteredPopular.length === 0 && filteredOther.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <MapPin size={32} className="text-gray-200 mb-2" />
                                    <p className="text-gray-500 text-sm">No cities found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
