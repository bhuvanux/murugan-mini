import React, { useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { Smartphone, Loader2, AlertCircle } from 'lucide-react';

export function PhoneLogin() {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
      });

      if (error) throw error;

      setStep('otp');
      toast.success('OTP sent to your phone!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      toast.success('Successfully logged in!');
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      toast.success('Successfully logged in!');
    } catch (error: any) {
      toast.error(error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async () => {
    setLoading(true);

    try {
      // Create a demo account for testing
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (error) throw error;

      toast.success('Account created! You can now sign in.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(to bottom, #0d5e38, #084d2c)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: '#ffffff20' }}>
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white mb-2">Murugan Wallpapers & Videos</h1>
          <p className="text-white/80">Devotional wallpapers and videos for Lord Murugan</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Alert className="mb-4">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs">
              Phone authentication requires SMS provider setup. Use email login for testing.
            </AlertDescription>
          </Alert>

          {!showEmailLogin ? (
            <>
              {step === 'phone' ? (
                <form onSubmit={sendOTP} className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Include country code (e.g., +91 for India)
                    </p>
                  </div>
                  <Button type="submit" className="w-full" style={{ background: '#0d5e38' }} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send OTP'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowEmailLogin(true)}
                  >
                    Use Email Instead (Testing)
                  </Button>
                </form>
              ) : (
                <form onSubmit={verifyOTP} className="space-y-4">
                  <div>
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      maxLength={6}
                      className="mt-1 text-center text-2xl tracking-widest"
                    />
                  </div>
                  <Button type="submit" className="w-full" style={{ background: '#0d5e38' }} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify OTP'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setStep('phone');
                      setShowEmailLogin(false);
                    }}
                  >
                    Back to Login Options
                  </Button>
                </form>
              )}
            </>
          ) : (
            <form onSubmit={signInWithEmail} className="space-y-4">
              <div>
                <Label htmlFor="email">Email (for testing)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="demo@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" style={{ background: '#0d5e38' }} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={signUpWithEmail}
                disabled={loading}
              >
                Create Test Account
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowEmailLogin(false)}
              >
                Back to Phone Login
              </Button>
            </form>
          )}
        </div>

        <p className="text-xs text-center text-white/60 mt-4">
          By continuing, you agree to our Privacy Policy
        </p>
      </div>
    </div>
  );
}
