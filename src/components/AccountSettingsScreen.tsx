import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { User, Phone, Mail, Camera, MapPin, ArrowLeft, Lock, CheckCircle2, Loader2, Check, Search, X, ChevronRight, ChevronDown } from 'lucide-react';
import { AppHeader } from './AppHeader';
import { supabase } from '../utils/supabase/client';

import { TAMIL_NADU_CITIES } from '../utils/constants';

interface AccountSettingsScreenProps {
    onBack?: () => void;
}

export function AccountSettingsScreen({ onBack }: AccountSettingsScreenProps) {
    const { user, updateProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        try {
            setUploading(true);

            // Check if Mock User - Add safety check
            if (user && user.id && user.id.startsWith && user.id.startsWith('mock-')) {
                console.log("[AccountSettings] Mock User detected. Simulating photo upload with Base64 transition...");

                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64String = reader.result as string;
                    await updateProfile({
                        avatar_url: base64String
                    });
                    setUploading(false);
                    toast.success('Mock profile photo updated (persists on refresh)!');
                };
                reader.readAsDataURL(file);
                return;
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${user && user.id ? user.id : 'user'}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            console.log("[AccountSettings] Uploading photo to Supabase storage...");
            const { error: uploadError } = await supabase.storage
                .from('photos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('photos')
                .getPublicUrl(filePath);

            console.log("[AccountSettings] Photo uploaded. Updating user metadata with URL:", publicUrl);

            // Update profile with new avatar URL
            const { error: updateError } = await updateProfile({
                avatar_url: publicUrl
            });

            if (updateError) throw updateError;

            toast.success('Profile photo updated!');
        } catch (error: any) {
            console.error('[AccountSettings] Photo upload/save error:', error);
            toast.error(error.message || 'Failed to upload photo');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="min-h-screen bg-[#f8faf7]">
            <AppHeader title="Edit Profile" onBack={onBack} variant="primary" showKolam={true} />
            <main className="relative mx-auto max-w-3xl px-6 pb-32" style={{ paddingTop: 'calc(92px + env(safe-area-inset-top))' }}>
                <div className="space-y-8">
                    <div className="space-y-8">
                        {/* Profile Photo Section */}
                        <div className="flex flex-col items-center">
                            <div className="relative group">
                                <div
                                    className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#0d5e38] to-[#0a4a2b] flex items-center justify-center text-white shadow-xl shadow-[#0d5e38]/20 overflow-hidden cursor-pointer transition-transform active:scale-95 ring-4 ring-white"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {uploading ? (
                                        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                                    ) : user?.user_metadata?.avatar_url ? (
                                        <img
                                            src={user.user_metadata.avatar_url}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '';
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement?.classList.add('show-fallback');
                                            }}
                                        />
                                    ) : (
                                        <User size={40} strokeWidth={1.5} />
                                    )}
                                    <style>{`
                                        .show-fallback::after {
                                            content: '';
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            width: 100%;
                                            height: 100%;
                                            background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E") no-repeat center;
                                        }
                                    `}</style>
                                </div>

                                {/* Floating Camera Icon */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#0d5e38] rounded-xl shadow-lg flex items-center justify-center border-4 border-white text-white hover:bg-[#0a4a2b] transition-all active:scale-90"
                                >
                                    <Camera size={16} />
                                </button>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                />
                            </div>

                            {/* Helper Text */}
                            <p className="text-sm font-medium text-gray-500 mt-4">Tap to change photo</p>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-6">
                            {/* Full Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 ml-1">
                                    Full Name
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0d5e38] transition-colors">
                                        <User size={18} strokeWidth={2} />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.displayName}
                                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-gray-900 text-base font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#0d5e38] focus:ring-4 focus:ring-[#0d5e38]/5 transition-all shadow-sm"
                                        placeholder="Enter your full name"
                                    />
                                </div>
                            </div>

                            {/* Mobile Number (Read-only) */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 ml-1">
                                    Mobile Number
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Phone size={18} strokeWidth={2} />
                                    </div>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        disabled
                                        className="w-full pl-12 pr-12 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-gray-500 text-base font-medium cursor-not-allowed"
                                        placeholder="+91 98765 43210"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Lock size={16} strokeWidth={2} />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 ml-1">Mobile number cannot be changed</p>
                            </div>

                            {/* Email Address */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 ml-1">
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0d5e38] transition-colors">
                                        <Mail size={18} strokeWidth={2} />
                                    </div>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => {
                                            setFormData({ ...formData, email: e.target.value });
                                            validateEmail(e.target.value);
                                        }}
                                        className={`w-full pl-12 pr-4 py-4 bg-white border ${emailError ? 'border-red-500 ring-4 ring-red-500/5' : 'border-gray-100'} rounded-2xl text-gray-900 text-base font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#0d5e38] focus:ring-4 focus:ring-[#0d5e38]/5 transition-all shadow-sm`}
                                        placeholder="name@example.com"
                                    />
                                </div>
                                {emailError && (
                                    <p className="text-xs text-red-500 ml-1 mt-1 font-medium flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-red-500" />
                                        {emailError}
                                    </p>
                                )}
                            </div>

                            {/* City */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700 ml-1">
                                    City
                                </label>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsCityPickerOpen(true)}
                                        className="group w-full pl-4 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-left flex items-center justify-between cursor-pointer hover:border-[#0d5e38]/30 hover:shadow-md transition-all shadow-sm active:scale-[0.99]"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-9 h-9 rounded-full bg-[#0d5e38]/5 flex items-center justify-center text-[#0d5e38] group-hover:bg-[#0d5e38]/10 transition-colors">
                                                <MapPin size={18} strokeWidth={2} />
                                            </div>
                                            <span className={`text-base font-medium ${formData.city ? 'text-gray-900' : 'text-gray-400'}`}>
                                                {formData.city || "Select your city"}
                                            </span>
                                        </div>
                                        <ChevronDown size={20} className="text-gray-400 group-hover:text-[#0d5e38] transition-colors" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="pt-6">
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges || loading}
                                className="w-full h-14 bg-gradient-to-r from-[#0d5e38] to-[#0a4a2b] text-white font-semibold text-lg rounded-2xl shadow-lg shadow-[#0d5e38]/20 hover:shadow-xl hover:shadow-[#0d5e38]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Saving Changes...</span>
                                    </>
                                ) : hasChanges ? (
                                    <>
                                        <Check className="w-5 h-5" />
                                        <span>Save Changes</span>
                                    </>
                                ) : (
                                    <span>No Changes to Save</span>
                                )}
                            </button>
                        </div>
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
