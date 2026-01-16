import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
    InputOTP,
    InputOTPSlot,
    InputOTPSeparator,
    InputOTPGroup,
} from "../ui/input-otp";
import { ArrowLeft, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

interface OTPVerificationProps {
    phone: string;
    onVerify: (otp: string) => void;
    onResend: () => void;
    onBack: () => void;
    isLoading: boolean;
}

export function OTPVerification({ phone, onVerify, onResend, onBack, isLoading }: OTPVerificationProps) {
    const [value, setValue] = useState("");
    const [timer, setTimer] = useState(30);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleComplete = (otp: string) => {
        onVerify(otp);
    };

    const handleResend = () => {
        if (timer === 0) {
            onResend();
            setTimer(30);
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto animate-fade-in" style={{ animationDuration: '0.4s' }}>
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#e0f2e9] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-[#084C28]" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Verify WhatsApp OTP</h2>
                <p className="text-gray-500 text-sm">
                    We have sent the OTP to <strong className="text-[#084C28] font-bold">WhatsApp</strong> on <span className="text-gray-900 font-medium whitespace-nowrap">{phone}</span>
                </p>
            </div>

            <div className="flex justify-center py-6">
                <InputOTP
                    maxLength={6}
                    value={value}
                    onChange={setValue}
                    onComplete={handleComplete}
                    pattern={REGEXP_ONLY_DIGITS}
                    autoFocus
                    spellCheck={false}
                    inputMode="numeric"
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    ref={(ref: any) => {
                        if (ref) {
                            setTimeout(() => {
                                ref.focus();
                                ref.click();
                                setIsFocused(true);
                            }, 500);
                        }
                    }}
                >
                    <div className="flex gap-3">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot
                                key={index}
                                index={index}
                            />
                        ))}
                    </div>
                </InputOTP>
            </div>

            {/* Resend Timer */}
            <div className="text-center space-y-4">
                <div className="h-4">
                    <button
                        onClick={handleResend}
                        disabled={timer > 0 || isLoading}
                        className={`text-xs font-semibold flex items-center justify-center gap-1.5 mx-auto transition-colors ${timer > 0
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-[#084C28] hover:text-[#063a1f]'
                            }`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP via WhatsApp'}
                    </button>
                </div>

                <Button
                    onClick={() => handleComplete(value)}
                    className="w-full h-12 bg-[#084C28] hover:bg-[#063a1f] text-white font-semibold rounded-xl shadow-md text-sm transition-all active:scale-[0.98]"
                    disabled={isLoading || value.length < 6}
                >
                    {isLoading ? 'Verifying...' : 'Verify & Continue'}
                </Button>
            </div>

            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-gray-400 hover:text-[#084C28] font-medium mx-auto transition-colors text-xs pt-4"
            >
                <ArrowLeft className="w-3.5 h-3.5" /> Change Phone Number
            </button>
        </div>
    );
}
