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
        <div className="space-y-8">
            <div className="text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-[#0d5e38]" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Verify OTP</h2>
                <p className="text-sm text-gray-500 mt-2">
                    We've sent a 6-digit code to <br />
                    <span className="font-semibold text-gray-900">{phone}</span>
                </p>
            </div>

            <div className="flex justify-center">
                <InputOTP
                    maxLength={6}
                    value={value}
                    onChange={setValue}
                    onComplete={handleComplete}
                    pattern={REGEXP_ONLY_DIGITS}
                >
                    <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                    </InputOTPGroup>
                </InputOTP>
            </div>

            <div className="space-y-4">
                <Button
                    onClick={() => handleComplete(value)}
                    className="w-full h-12 bg-[#0d5e38] hover:bg-[#0a4d2c] text-white font-bold rounded-xl"
                    disabled={isLoading || value.length < 6}
                >
                    {isLoading ? 'Verifying...' : 'Verify & Continue'}
                </Button>

                <div className="text-center">
                    <button
                        onClick={handleResend}
                        disabled={timer > 0 || isLoading}
                        className={`text-sm font-semibold flex items-center justify-center gap-2 mx-auto ${timer > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-[#0d5e38] hover:underline'
                            }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP via WhatsApp'}
                    </button>
                </div>
            </div>

            <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium mx-auto transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Change phone number
            </button>
        </div>
    );
}
