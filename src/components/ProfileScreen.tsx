import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Settings, Phone, Shield, LogOut, ChevronRight, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from './AppHeader';
// @ts-ignore
import tamilMuruganBanner from '../assets/tamil_murugan_banner.png';

type Tab = "saved" | "notifications" | "account" | "contact" | "privacy";

type ProfileScreenProps = {
    onNavigate: (tab: Tab) => void;
    onLogout: () => void;
    onSubScreenChange?: (isSubScreen: boolean) => void;
};

export function ProfileScreen({
    onNavigate,
    onLogout,
    onSubScreenChange
}: ProfileScreenProps) {
    const { user, signOut } = useAuth();

    const handleMenuClick = (tab: Tab, menuName: string) => {
        if (onSubScreenChange) {
            onSubScreenChange(true);
        }
        onNavigate(tab);
    };

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to log out?')) {
            try {
                await signOut();
                toast.success('See you soon! 🙏');
                onLogout();
            } catch (error) {
                toast.error('Failed to sign out');
            }
        }
    };

    const getUserDisplayName = () => {
        return user?.user_metadata?.full_name || user?.user_metadata?.name || 'Devotee';
    };

    const getUserDetails = () => {
        return user?.phone || user?.email || '';
    };

    const getUserInitials = () => {
        const name = getUserDisplayName();
        return name.charAt(0).toUpperCase();
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Header with Banner */}
            <AppHeader title="Profile" showKolam={true} variant="primary" />

            <div className="relative">


                {/* Content Container */}
                <div style={{ paddingTop: 'calc(70px + env(safe-area-inset-top))' }}>

                    {/* Menu Items */}
                    <div className="px-4 mt-8 space-y-3">
                        {/* Account Settings */}
                        <button
                            onClick={() => handleMenuClick("account", "account_settings")}
                            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                                    <Settings className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-gray-900">Account Settings</p>
                                    <p className="text-sm text-gray-500">Manage your preferences</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                        </button>

                        {/* Saved Items */}
                        <button
                            onClick={() => handleMenuClick("saved", "saved_items")}
                            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                                    <Heart className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-gray-900">Saved Items</p>
                                    <p className="text-sm text-gray-500">Wallpapers & Divine Media</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                        </button>

                        {/* Contact Us */}
                        <button
                            onClick={() => handleMenuClick("contact", "contact_us")}
                            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-gray-900">Contact us</p>
                                    <p className="text-sm text-gray-500">24×7 customer support</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                        </button>

                        {/* Privacy Policy */}
                        <button
                            onClick={() => handleMenuClick("privacy", "privacy_policy")}
                            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-gray-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-gray-900">Privacy Policy</p>
                                    <p className="text-sm text-gray-500">How we protect your data</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                        </button>

                        {/* Log Out */}
                        <button
                            onClick={handleLogout}
                            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                                    <LogOut className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-red-600">Log out</p>
                                    <p className="text-sm text-red-400">See you soon!</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-red-200 group-hover:text-red-300 transition-colors" />
                        </button>
                    </div>

                    {/* Version Info and Banner with bottom padding */}
                    <div className="text-center mt-12 mb-8 px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}>
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-6">VERSION 0.0.1</p>

                        {/* Tamil Murugan Banner */}
                        <div className="max-w-xs mx-auto">
                            <img
                                src={tamilMuruganBanner}
                                alt="Tamil Kadavul Murugan"
                                className="w-full h-auto rounded-2xl shadow-lg"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
