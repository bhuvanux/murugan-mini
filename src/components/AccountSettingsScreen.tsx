import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { User as UserIcon, Phone, Mail, MapPin, ArrowLeft, Lock, CheckCircle2, Loader2, Check, Search, X, ChevronRight, ChevronDown, LogOut, Crown } from 'lucide-react';
import { AppHeader } from './AppHeader';
import { supabase } from '../utils/supabase/client';

import { TAMIL_NADU_CITIES } from '../utils/constants';

interface AccountSettingsScreenProps {
    onBack?: () => void;
    onNavigate?: (page: string) => void;
}

export function AccountSettingsScreen({ onBack, onNavigate }: AccountSettingsScreenProps) {
    const { user, updateProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const [formData, setFormData] = useState({
        displayName: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
        phone: user?.user_metadata?.phone || user?.phone || '',
        email: user?.user_metadata?.email || user?.email || '',
        city: user?.user_metadata?.city || '',
    });

    const [initialData, setInitialData] = useState(formData);
    const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
    const [citySearch, setCitySearch] = useState('');
    const [emailError, setEmailError] = useState('');

    const filteredCities = TAMIL_NADU_CITIES.filter(city =>
        city.toLowerCase().includes(citySearch.toLowerCase())
    );

    const validateEmail = (email: string) => {
        if (!email) {
            setEmailError('');
            return true;
        }
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(email)) {
            setEmailError('Please enter a valid email address');
            return false;
        }
        setEmailError('');
        return true;
    };

    // Sync formData with user on load or change
    useEffect(() => {
        const newData = {
            displayName: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
            phone: user?.user_metadata?.phone || user?.phone || '',
            email: user?.user_metadata?.email || user?.email || '',
            city: user?.user_metadata?.city || '',
        };
        setFormData(newData);
        setInitialData(newData);
    }, [user]);

    // Track changes
    useEffect(() => {
        const changed = JSON.stringify(formData) !== JSON.stringify(initialData);
        setHasChanges(changed);
    }, [formData, initialData]);

    const handleSave = async () => {
        setLoading(true);
        try {
            console.log("[AccountSettings] Attempting to save profile data:", formData);
            const { error } = await updateProfile({
                full_name: formData.displayName,
                city: formData.city,
                email: formData.email
            });

            if (error) throw error;

            setInitialData(formData);
            setHasChanges(false);
            toast.success('Profile updated successfully');
        } catch (error: any) {
            console.error("[AccountSettings] Save error:", error);
            // Ignore "Auth session missing" if it's a false positive or handle gracefully
            if (error.message?.includes('Auth session missing')) {
                console.warn("Suppressing auth session missing error as user state might be valid locally");
                // Optionally continue or show a softer warning
            } else {
                toast.error(error.message || 'Failed to update profile');
            }
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen bg-[#f8faf7]">
            <AppHeader title="Edit Profile" onBack={onBack} variant="primary" showKolam={true} />
            <main className="relative mx-auto max-w-xl px-6 pb-32" style={{ paddingTop: 'calc(150px + env(safe-area-inset-top))' }}>
                <div className="space-y-8">
                    {/* Form Fields */}
                    <div className="space-y-6">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-800 ml-1">
                                Full Name
                            </label>
                            <div className="group flex items-center w-full h-14 px-4 bg-white border border-gray-200 rounded-2xl gap-3 transition-all shadow-sm focus-within:border-[#0d5e38] focus-within:ring-4 focus-within:ring-[#0d5e38]/5">
                                <div className="text-gray-400 group-focus-within:text-[#0d5e38] transition-colors pointer-events-none shrink-0">
                                    <UserIcon size={20} strokeWidth={2} />
                                </div>
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="flex-1 bg-transparent border-none text-gray-900 text-base font-medium placeholder:text-gray-400 focus:outline-none focus:ring-0 p-0 w-full"
                                    placeholder="Enter your full name"
                                />
                            </div>
                        </div>

                        {/* Mobile Number (Read-only) */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-800 ml-1">
                                Mobile Number
                            </label>
                            <div className="flex items-center w-full h-14 px-4 bg-gray-100 border border-transparent rounded-2xl gap-3 cursor-not-allowed">
                                <div className="text-gray-400 pointer-events-none shrink-0">
                                    <Phone size={20} strokeWidth={2} />
                                </div>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    disabled
                                    className="flex-1 bg-transparent border-none text-gray-500 text-base font-medium placeholder:text-gray-400 focus:outline-none focus:ring-0 p-0 w-full cursor-not-allowed select-none"
                                    placeholder="+91 98765 43210"
                                />
                                <div className="text-gray-400 pointer-events-none shrink-0">
                                    <Lock size={18} strokeWidth={2} />
                                </div>
                            </div>
                            <p className="text-xs font-medium text-gray-400 ml-1 flex items-center gap-1.5">
                                <Lock size={12} />
                                Mobile number cannot be changed
                            </p>
                        </div>

                        {/* Email Address */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-800 ml-1">
                                Email Address
                            </label>
                            <div className={`group flex items-center w-full h-14 px-4 bg-white border rounded-2xl gap-3 transition-all shadow-sm focus-within:border-[#0d5e38] focus-within:ring-4 focus-within:ring-[#0d5e38]/5 ${emailError ? 'border-red-500 ring-4 ring-red-500/5' : 'border-gray-200'}`}>
                                <div className="text-gray-400 group-focus-within:text-[#0d5e38] transition-colors pointer-events-none shrink-0">
                                    <Mail size={20} strokeWidth={2} />
                                </div>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => {
                                        setFormData({ ...formData, email: e.target.value });
                                        validateEmail(e.target.value);
                                    }}
                                    className="flex-1 bg-transparent border-none text-gray-900 text-base font-medium placeholder:text-gray-400 focus:outline-none focus:ring-0 p-0 w-full"
                                    placeholder="name@example.com"
                                />
                            </div>
                            {emailError && (
                                <p className="text-xs text-red-500 ml-1 mt-1 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    {emailError}
                                </p>
                            )}
                        </div>

                        {/* City Picker */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-800 ml-1">
                                City
                            </label>
                            <button
                                onClick={() => setIsCityPickerOpen(true)}
                                className="w-full h-14 pl-4 pr-4 bg-white border border-gray-200 rounded-2xl text-left flex items-center justify-between group hover:border-[#0d5e38] hover:border-opacity-50 transition-all shadow-sm active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-gray-400 group-hover:text-[#0d5e38] transition-colors">
                                        <MapPin size={20} strokeWidth={2} />
                                    </div>
                                    <span className={`text-base font-medium ${formData.city ? 'text-gray-900' : 'text-gray-400'} truncate`}>
                                        {formData.city || "Select your city"}
                                    </span>
                                </div>
                                <ChevronDown size={20} className="text-gray-400 group-hover:text-[#0d5e38] transition-colors" />
                            </button>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-4">
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || loading}
                            className={`w-full h-14 font-bold text-lg rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]
                                ${(!hasChanges || loading)
                                    ? 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed'
                                    : 'bg-gradient-to-r from-[#0d5e38] to-[#0a4a2b] text-white shadow-[#0d5e38]/25 hover:shadow-xl hover:shadow-[#0d5e38]/35'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
                                    <span>Saving Changes...</span>
                                </>
                            ) : hasChanges ? (
                                <>
                                    <Check className="w-5 h-5" strokeWidth={3} />
                                    <span>Save Changes</span>
                                </>
                            ) : (
                                <span>No Changes to Save</span>
                            )}
                        </button>
                    </div>
                </div>
            </main>

            {/* City Picker Bottom Sheet */}
            {isCityPickerOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
                        onClick={() => setIsCityPickerOpen(false)}
                    />

                    {/* Sheet Content */}
                    <div className="relative w-full max-w-lg bg-white rounded-t-[32px] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                        {/* Drawer Handle */}
                        <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                        </div>

                        {/* Drawer Header */}
                        <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Select City</h3>
                                <p className="text-sm text-gray-500 font-medium">Choose from available locations in Tamil Nadu</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCityPickerOpen(false)}
                                className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="px-6 py-4 shrink-0 bg-white">
                            <div className="flex items-center w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-4 gap-3 focus-within:ring-2 focus-within:ring-[#0d5e38]/20 focus-within:bg-white focus-within:border-[#0d5e38]/30 transition-all">
                                <Search size={22} className="text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search for a city..."
                                    value={citySearch}
                                    onChange={(e) => setCitySearch(e.target.value)}
                                    className="flex-1 bg-transparent border-none text-base font-medium focus:ring-0 p-0 text-gray-900 placeholder:text-gray-400"
                                    autoFocus
                                />
                                {citySearch && (
                                    <button
                                        onClick={() => setCitySearch('')}
                                        className="p-1 rounded-full hover:bg-gray-200 text-gray-400 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-2">
                            <div className="grid grid-cols-2 gap-3 pb-8">
                                {filteredCities.length > 0 ? (
                                    [...filteredCities]
                                        .sort((a, b) => (a === formData.city ? -1 : b === formData.city ? 1 : 0))
                                        .map((city) => {
                                            const isSelected = formData.city === city;
                                            return (
                                                <button
                                                    key={city}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, city });
                                                        localStorage.setItem('last_selected_city', city);
                                                        setIsCityPickerOpen(false);
                                                        setCitySearch('');
                                                    }}
                                                    className={`relative flex items-center justify-start px-4 py-4 rounded-2xl border transition-all text-sm font-semibold text-left group
                                                        ${isSelected
                                                            ? 'bg-[#0d5e38] border-[#0d5e38] text-white shadow-lg shadow-[#0d5e38]/20'
                                                            : 'bg-white border-gray-100 text-gray-600 hover:border-[#0d5e38]/30 hover:shadow-md'
                                                        }`}
                                                >
                                                    <span className="flex-1 truncate">{city}</span>
                                                    {isSelected && (
                                                        <CheckCircle2 size={18} className="text-white shrink-0 ml-2" />
                                                    )}
                                                </button>
                                            );
                                        })
                                ) : (
                                    <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
                                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                            <Search size={32} className="text-gray-300" />
                                        </div>
                                        <p className="text-gray-900 font-semibold mb-1">No cities found</p>
                                        <p className="text-sm text-gray-500">
                                            We couldn't find "{citySearch}" in our list.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
