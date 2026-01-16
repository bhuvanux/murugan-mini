import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthForm } from './AuthForm';
import { OTPVerification } from './OTPVerification';
import { toast } from 'sonner';
import { analyticsTracker } from '../../utils/analytics/useAnalytics';
import imgSplashLogo from "../../assets/splash-logo.png";
import imgKolam from "../../assets/kolam_Bottom.png";

type ViewMode = 'login' | 'signup' | 'otp';

export function AuthContainer() {
    const { sendOtp, verifyOtp, signInWithMock, checkUserExists } = useAuth();
    const [step, setStep] = useState<'details' | 'otp'>('details');
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [authData, setAuthData] = useState<{
        phone: string;
        name?: string;
        city?: string;
    }>({ phone: '' });

    useEffect(() => {
        // Track View
        analyticsTracker.track('auth', 'auth_flow', 'auth_viewed');
    }, []);

    const handleDetailsSubmit = async (data: { phone: string; name?: string; city?: string }) => {
        setIsLoading(true);
        // Ensure +91 is added if not present (clean format)
        const cleanNumber = data.phone.trim().replace(/ /g, '');
        const formattedPhone = cleanNumber.startsWith('+') ? cleanNumber : `+91${cleanNumber}`;

        setAuthData({ ...data, phone: formattedPhone });

        try {
            // Smart Login Check: If in login mode, verify user exists
            if (mode === 'login') {
                const exists = await checkUserExists(formattedPhone);
                if (!exists) {
                    console.log('[Auth] User does not exist, switching to signup');
                    setMode('signup');
                    toast.info("Welcome! User not found. Please create an account.", {
                        duration: 5000,
                        style: { border: '1px solid #084C28', color: '#084C28' }
                    });
                    setIsLoading(false);
                    return;
                }
            }

            // Check if user ALREADY exists when in Signup mode
            if (mode === 'signup') {
                const exists = await checkUserExists(formattedPhone);
                if (exists) {
                    toast.error("Account already exists with this number. Please Login.", {
                        duration: 5000,
                    });
                    setMode('login'); // Helpful auto-switch, or just let them switch
                    setIsLoading(false);
                    return;
                }
            }

            const { data, error } = await sendOtp(formattedPhone);
            console.log('Send OTP raw result:', { data, error });

            if (error) {
                console.error('Send OTP SDK error:', error);
                const errorMessage = typeof error === 'object' ? (error.message || error.error || JSON.stringify(error)) : error;
                toast.error(errorMessage || 'Failed to send OTP. Network error.');
                return;
            }

            if (data && data.success === false) {
                console.error('Send OTP business error:', data);
                toast.error(data.error || 'WhatsApp API rejection. Check Fast2SMS setup.');
                return;
            }

            // Track OTP Requested and Sent
            analyticsTracker.track('auth', '00000000-0000-0000-0000-000000000001', 'otp_requested', {
                phone: formattedPhone,
                mode: mode
            });
            analyticsTracker.track('auth', '00000000-0000-0000-0000-000000000001', 'otp_sent', {
                phone: formattedPhone,
                mode: mode
            });

            toast.success("OTP sent successfully via WhatsApp!");
            setStep('otp');
        } catch (error: any) {
            console.error('Send OTP error:', error);
            toast.error(error.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpVerify = async (otp: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await verifyOtp(
                authData.phone,
                otp,
                {
                    ...(mode === 'signup' ? {
                        name: authData.name,
                        full_name: authData.name,
                        city: authData.city
                    } : {}),
                    device: navigator.userAgent
                }
            );

            console.log('[AuthContainer] verifyOtp result:', { data, error });

            if (error) throw error;

            if (data && data.success === false) {
                console.warn('[AuthContainer] OTP verification failed:', data.error);
                toast.error(data.error || 'Invalid OTP. Please try again.');
                return;
            }

            // Track Verification Success (Technical)
            analyticsTracker.track('auth', '00000000-0000-0000-0000-000000000001', 'otp_verified_fast2sms_success');
            analyticsTracker.track('auth', '00000000-0000-0000-0000-000000000001', 'otp_verified', {
                phone: authData.phone
            });

            // Track Login/Signup Completion
            const event = data.is_signup ? 'signup_completed' : 'login_completed';
            analyticsTracker.track('auth', '00000000-0000-0000-0000-000000000001', event, {
                phone: authData.phone,
                city: authData.city
            });

            // Track login success for existing users
            if (!data.is_signup) {
                console.log('[AuthContainer] Tracking login_success event for existing user');
                analyticsTracker.track('auth', '00000000-0000-0000-0000-000000000001', 'login_success', {
                    phone: authData.phone,
                    city: authData.city
                });
            } else {
                console.log('[AuthContainer] This was a signup, not a login');
            }

            // Note: Admin notification is now handled by database trigger after profile insert


            toast.success(data.message || 'Verified successfully');

            // Redirect happens automatically via AuthContext state change
        } catch (error: any) {
            console.error('Verify OTP error:', error);
            toast.error(error.message || 'Invalid OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setIsLoading(true);
        try {
            const { error } = await sendOtp(authData.phone);
            if (error) throw error;
            toast.success('OTP resent to your WhatsApp!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to resend OTP');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full bg-[#084C28] relative overflow-hidden flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >

            {/* Scrollable Content Container */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto z-10">

                {/* Logo Section */}
                <div className="mb-8 md:mb-12 flex flex-col items-center shrink-0">
                    <div className="w-32 h-32 md:w-36 md:h-36 relative">
                        <img
                            src={imgSplashLogo}
                            alt="Murugan Splash Logo"
                            className="w-full h-full object-contain drop-shadow-2xl"
                        />
                    </div>
                </div>

                {/* Auth Card */}
                <div className="w-full max-w-[370px] bg-white rounded-3xl shadow-2xl p-5 md:p-7 relative shrink-0">
                    {step === 'details' ? (
                        <AuthForm
                            mode={mode}
                            setMode={setMode}
                            onSubmit={handleDetailsSubmit}
                            isLoading={isLoading}
                        />
                    ) : (
                        <OTPVerification
                            phone={authData.phone}
                            onVerify={handleOtpVerify}
                            onResend={handleResendOtp}
                            onBack={() => setStep('details')}
                            isLoading={isLoading}
                        />
                    )}

                    {/* Footer Links */}
                    <div className="mt-8 pt-2 text-center font-sans">
                        <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                            By continuing, you agree to our<br />
                            <span className="text-[#084C28] font-semibold hover:underline cursor-pointer">Terms of Service</span> & <span className="text-[#084C28] font-semibold hover:underline cursor-pointer">Privacy Policy</span>
                        </p>
                    </div>
                </div>

                {/* Spacer for bottom pattern */}
                <div className="h-12 shrink-0"></div>
            </div>

            {/* Bottom Kolam Pattern */}
            <div className="absolute bottom-0 left-0 right-0 z-0 pointer-events-none">
                <img
                    src={imgKolam}
                    alt="Kolam Pattern"
                    className="w-full h-auto object-cover opacity-80 mix-blend-overlay md:opacity-100"
                />
            </div>
        </div>
    );
}
