import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthForm } from './AuthForm';
import { OTPVerification } from './OTPVerification';
import { toast } from 'sonner';
import imgSplashLogo from "../../assets/splash-logo.png";
import imgKolam from "../../assets/kolam_Bottom.png";

export function AuthContainer() {
    const { sendOtp, verifyOtp, signInWithMock } = useAuth();
    const [step, setStep] = useState<'details' | 'otp'>('details');
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [authData, setAuthData] = useState<{
        phone: string;
        name?: string;
        city?: string;
    }>({ phone: '' });

    const handleDetailsSubmit = async (data: { phone: string; name?: string; city?: string }) => {
        setIsLoading(true);
        // Ensure +91 is added if not present (though UI enforces it prefix-wise, data might need it)
        const formattedPhone = data.phone.startsWith('+') ? data.phone : `+91${data.phone}`;

        setAuthData({ ...data, phone: formattedPhone });

        try {
            const { error } = await sendOtp(formattedPhone);
            if (error) {
                console.error('Send OTP error:', error);
                // Proceed anyway for mock testing if real OTP fails
                toast.warning('Network/Config Issue: Proceeding to Dummy OTP Check...');
            } else {
                toast.success('OTP sent to your WhatsApp!');
            }
            // ALWAYS proceed to OTP step for now to allow 1234
            setStep('otp');
        } catch (error: any) {
            console.error('Send OTP error:', error);
            // Even on crash, proceed
            setStep('otp');
            toast.error(error.message || 'Failed to send OTP. Proceeding for Dev...');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpVerify = async (otp: string) => {
        setIsLoading(true);
        try {
            // Dummy OTP Bypass
            if (otp === '1234') {
                // Use MOCK implementation
                signInWithMock(
                    authData.phone,
                    mode === 'signup' ? { full_name: authData.name, city: authData.city } : undefined
                );
                toast.success(mode === 'signup' ? 'Welcome to Murugan AI!' : 'Successfully logged in!');
                return; // Context update will trigger UI change
            }

            const { error } = await verifyOtp(
                authData.phone,
                otp,
                mode === 'signup' ? { full_name: authData.name, city: authData.city } : undefined
            );

            if (error) throw error;

            toast.success(mode === 'signup' ? 'Welcome to Murugan AI!' : 'Successfully logged in!');
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
        <div className="min-h-screen w-full bg-[#084C28] relative overflow-hidden flex flex-col">

            {/* Scrollable Content Container */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto z-10">

                {/* Logo Section */}
                <div className="mb-6 md:mb-10 flex flex-col items-center shrink-0">
                    <div className="w-40 h-40 md:w-48 md:h-48 relative">
                        <img
                            src={imgSplashLogo}
                            alt="Murugan Splash Logo"
                            className="w-full h-full object-contain drop-shadow-2xl"
                        />
                    </div>
                </div>

                {/* Auth Card */}
                <div className="w-full max-w-[380px] bg-white rounded-3xl shadow-2xl p-6 md:p-8 relative shrink-0">
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
                    <div className="mt-6 pt-2 text-center">
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            By continuing, you agree to our<br />
                            <span className="text-[#084C28] font-bold hover:underline cursor-pointer">Terms of Service</span> & <span className="text-[#084C28] font-bold hover:underline cursor-pointer">Privacy Policy</span>
                        </p>
                    </div>
                </div>

                {/* Spacer for bottom pattern */}
                <div className="h-20 shrink-0"></div>
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
