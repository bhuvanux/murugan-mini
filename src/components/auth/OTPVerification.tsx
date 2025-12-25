import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
    InputOTP,
    InputOTPSlot,
    InputOTPSeparator,
    InputOTPGroup,
} from "../ui/input-otp";
import { MessageSquare, RefreshCw, ArrowLeft } from 'lucide-react';

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
        <div className="space-y-8 font-sans">
            <div className="text-center">
                <div className="w-16 h-16 bg-[#e6f2ec] rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                    <MessageSquare className="w-8 h-8 text-[#084C28]" />
                </div>
                <h2 className="text-2xl font-bold text-[#084C28]">Verify OTP</h2>
                <p className="text-sm text-gray-500 mt-3 font-medium">
                    We've sent a 6-digit code to <br />
                    <span className="font-bold text-gray-900 text-lg">{phone}</span>
                </p>
            </div>

            <div className="flex justify-center py-4">
                <InputOTP
                    maxLength={6}
                    value={value}
                    onChange={setValue}
                    onComplete={handleComplete}
                    pattern={REGEXP_ONLY_DIGITS}
                >
                    <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot
                                key={index}
                                index={index}
                                className="h-14 w-12 text-xl font-bold rounded-xl border border-gray-200 shadow-sm focus:border-[#084C28] focus:ring-1 focus:ring-[#084C28] bg-white text-[#084C28]"
                            />
                        ))}
                    </InputOTPGroup>
                </InputOTP>
            </div>

            <div className="space-y-6">
                <Button
                    onClick={() => handleComplete(value)}
                    className="w-full h-14 bg-[#084C28] hover:bg-[#063a1f] text-white font-bold rounded-2xl shadow-md text-base transition-all active:scale-[0.98]"
                    disabled={isLoading || value.length < 6}
                >
                    {isLoading ? 'Verifying...' : 'Verify & Continue'}
                </Button>

                <div className="text-center">
                    <button
                        onClick={handleResend}
                        disabled={timer > 0 || isLoading}
                        className={`text-sm font-bold flex items-center justify-center gap-2 mx-auto py-2 transition-colors ${timer > 0
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-[#084C28] hover:text-[#063a1f] hover:underline'
                            }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP via WhatsApp'}
                    </button>
                </div>
            </div>

            <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-500 hover:text-[#084C28] font-semibold mx-auto transition-colors text-sm"
            >
                <ArrowLeft className="w-4 h-4" /> Change phone number
            </button>
        </div>
    );
}
