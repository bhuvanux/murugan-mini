import React, { useEffect, useState } from 'react';
import { AppHeader } from './AppHeader';
import { supabase } from '../utils/supabase/client';
import { Loader2, Check, Shield, Crown, Zap, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../utils/api/client';

interface PlanConfig {
    id: string;
    name: string;
    price: number;
    currency: string;
    features: string[];
    button_text?: string;
}

const DEFAULT_PLAN: PlanConfig = {
    id: 'gugan',
    name: 'Gugan Plan',
    price: 29,
    currency: 'INR',
    features: [
        'Ad-free Experience',
        'Unlimited 4K Wallpaper Downloads',
        'Exclusive Divine Music Access',
        'Support the Devotee Community'
    ],
    button_text: 'Subscribe for ₹29'
};

interface SubscriptionScreenProps {
    onBack?: () => void;
    onSuccess?: () => void;
}

export function SubscriptionScreen({ onBack, onSuccess }: SubscriptionScreenProps) {
    const { user, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<PlanConfig>(DEFAULT_PLAN);
    const [fetchingPlan, setFetchingPlan] = useState(true);

    useEffect(() => {
        fetchPlanConfig();
        // Track view
        userAPI.request('/analytics', {
            method: 'POST',
            body: JSON.stringify({
                events: [{
                    event_type: 'view_subscription_page',
                    user_id: user?.id,
                    module: 'subscription',
                    device_type: 'mobile'
                }]
            })
        }).catch(console.error);
    }, []);

    const fetchPlanConfig = async () => {
        try {
            const { data, error } = await supabase
                .from('app_config')
                .select('value')
                .eq('key', 'subscription_plan_gugan')
                .single();

            if (data?.value) {
                setPlan(data.value);
            }
        } catch (error) {
            console.error('Error fetching plan:', error);
        } finally {
            setFetchingPlan(false);
        }
    };

    const handleSubscribe = async () => {
        if (!user) {
            toast.error('Please login to subscribe');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Order
            const { orderId, amount, currency, key, user_email, user_phone } = await userAPI.request<any>('/create-payment-order', {
                method: 'POST',
                body: JSON.stringify({ planId: plan.id })
            });

            if (!key) {
                // Mock Success flow if no key (Dev mode)
                toast.success('Mock Payment Successful! (Dev Mode)');
                // Simulate webhook effect
                await supabase
                    .from('users')
                    .update({
                        is_premium: true,
                        plan_type: plan.id,
                        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    })
                    .eq('id', user.id);

                await refreshProfile();
                if (onSuccess) onSuccess();
                if (onBack) onBack();
                return;
            }

            // 2. Open Razorpay
            const options = {
                key: key,
                amount: amount,
                currency: currency,
                name: "Tamil Kadavul Murugan",
                description: `Subscription to ${plan.name}`,
                image: "https://your-app-logo-url.com/logo.png", // Replace with actual logo
                order_id: orderId,
                handler: async function (response: any) {
                    toast.success('Payment Successful! Activating Premium...');
                    // Webhook handles the DB update, but we can poll or optimize
                    // For now, rely on webhook or implement a verify endpoint

                    // Optimistic update for UI
                    await refreshProfile(); // This might need a delay or retry to catch the webhook update

                    setTimeout(async () => {
                        await refreshProfile();
                        if (onSuccess) onSuccess();
                        if (onBack) onBack();
                    }, 2000);
                },
                prefill: {
                    name: user.user_metadata?.full_name || '',
                    email: user_email,
                    contact: user_phone
                },
                theme: {
                    color: "#0d5e38"
                }
            };

            // @ts-ignore
            const rzp1 = new window.Razorpay(options);
            rzp1.open();

            rzp1.on('payment.failed', function (response: any) {
                toast.error(response.error.description || 'Payment Failed');
            });

        } catch (error: any) {
            console.error('Subscription error:', error);
            toast.error(error.message || 'Failed to initiate payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8faf7] flex flex-col">
            <AppHeader title="Go Premium" onBack={onBack} variant="primary" showKolam={true} />

            <main className="flex-1 flex flex-col px-6 pb-8 pt-[calc(110px+env(safe-area-inset-top))]">

                {/* Hero Section */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-yellow-200">
                        <Crown className="w-10 h-10 text-yellow-600" strokeWidth={1.5} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-english)' }}>
                        {plan.name}
                    </h1>
                    <p className="text-gray-500 max-w-xs mx-auto">
                        Unlock the full divine experience and support our mission.
                    </p>
                </div>

                {/* Plan Card */}
                <div className="bg-white rounded-[32px] p-8 shadow-xl border border-green-50 relative overflow-hidden">
                    {/* Decorative Background Blob */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-green-50 rounded-full blur-3xl opacity-50 pointer-events-none" />

                    <div className="relative z-10">
                        {/* Price */}
                        <div className="flex items-baseline justify-center mb-8">
                            <span className="text-5xl font-bold text-[#0d5e38]">₹{plan.price}</span>
                            <span className="text-gray-400 font-medium ml-2">/ month</span>
                        </div>

                        {/* Features List */}
                        <div className="space-y-5 mb-10">
                            {plan.features.map((feature, index) => (
                                <div key={index} className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-[#0d5e38]/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <Check className="w-3.5 h-3.5 text-[#0d5e38] stroke-[3]" />
                                    </div>
                                    <span className="text-gray-700 font-medium leading-tight">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {/* Subscribe Button */}
                        <button
                            onClick={handleSubscribe}
                            disabled={loading || fetchingPlan}
                            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#0d5e38] to-[#0a4a2b] text-white font-bold text-lg shadow-lg shadow-[#0d5e38]/30 hover:shadow-xl hover:shadow-[#0d5e38]/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5 fill-current" />
                                    <span>{plan.button_text || 'Subscribe Now'}</span>
                                </>
                            )}
                        </button>

                        <p className="text-center text-xs text-gray-400 mt-4">
                            Secure payment via Razorpay. Cancel anytime.
                        </p>
                    </div>
                </div>

                {/* Trust Badges */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center text-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <Shield className="w-6 h-6 text-gray-400 mb-2" />
                        <span className="text-xs font-semibold text-gray-600">Secure Payment</span>
                        <span className="text-[10px] text-gray-400">256-bit SSL Encrypted</span>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <Heart className="w-6 h-6 text-gray-400 mb-2" />
                        <span className="text-xs font-semibold text-gray-600">Support Us</span>
                        <span className="text-[10px] text-gray-400">Help us grow & serve</span>
                    </div>
                </div>

            </main>
        </div>
    );
}

// Add Razorpay declaration
declare global {
    interface Window {
        Razorpay: any;
    }
}
