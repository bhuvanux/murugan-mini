import image_aefa8dc74d7f949c3233faf44a28b2568db3db4f from "figma:asset/aefa8dc74d7f949c3233faf44a28b2568db3db4f.png";
import image_d5f2b8db8be54cd7632e2a54ce5388d6337b0c00 from "figma:asset/d5f2b8db8be54cd7632e2a54ce5388d6337b0c00.png";
import React, { useState } from "react";
import imgMurugan from "figma:asset/8e5811f67c54e8087eb0692bd69aff3dac1f38ec.png";
import imgLogoShape from "figma:asset/b166eb00853c2e20d074e43e510909bfd1339cf8.png";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Info, CheckCircle, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner@2.0.3";

export function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsLoading(true);

    try {
      toast.info(
        "Phone authentication requires SMS provider setup. Please use email login for testing.",
      );
      setIsEmailMode(true);
    } catch (error: any) {
      console.error("Phone auth error:", error);
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);

    try {
      await signIn(email, password);
      toast.success("Successfully signed in!");
    } catch (error: any) {
      console.error("Email auth error:", error);
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[rgb(8,76,40)] fixed inset-0 z-50 flex flex-col items-center overflow-auto m-[0px] p-[0px]">
      {/* Header with Logo Shape and Murugan Image */}
      <div className="relative flex flex-col items-center pt-8">
        {/* Logo Background Shape */}
        <div className="relative w-[260px] h-[260px] flex items-start justify-center">
          <img
            src={image_aefa8dc74d7f949c3233faf44a28b2568db3db4f}
            alt=""
            className="absolute inset-0 w-full h-full object-contain p-[0px] mt-[58px] mr-[0px] mb-[0px] ml-[0px]"
          />
        </div>
      </div>

      {/* Login Form Card */}
      <div className="w-full max-w-[380px] bg-white rounded-[22px] shadow-2xl mx-4 mt-[88px] mb-[32px] mr-[0px] ml-[0px] p-[24px]">
        {!isEmailMode ? (
          // Phone Number Login Form
          <form
            onSubmit={handlePhoneSubmit}
            className="space-y-4"
          >
            {/* Info Alert */}
            <Alert className="bg-gray-50 border-gray-200">
              <Info className="h-4 w-4 text-gray-600" />
              <AlertDescription className="text-gray-700 text-[13px] leading-relaxed">
                Phone authentication requires SMS provider
                setup. Use email login for testing.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="block text-gray-900 text-[14px]"
                style={{ fontWeight: 600 }}
              >
                Phone Number
              </label>
              <div className="relative">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) =>
                    setPhoneNumber(e.target.value)
                  }
                  className="text-[15px] pr-16 h-[48px] border-gray-300 rounded-lg"
                  disabled={isLoading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-500" />
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                Include country code (e.g., +91 for India)
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#0d5e38] hover:bg-[#0a4d2c] text-white py-3 rounded-[12px] text-[15px] h-[48px]"
              style={{ fontWeight: 600 }}
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send OTP"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-gray-700 hover:bg-gray-50 text-[15px] h-[48px]"
              style={{ fontWeight: 500 }}
              onClick={() => setIsEmailMode(true)}
              disabled={isLoading}
            >
              Use Email Instead (Testing)
            </Button>
          </form>
        ) : (
          // Email Login Form
          <form
            onSubmit={handleEmailSubmit}
            className="space-y-4"
          >
            <h2
              className="text-[20px] text-gray-900 text-center mb-4"
              style={{ fontWeight: 700 }}
            >
              Email Login
            </h2>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-gray-900 text-[14px]"
                style={{ fontWeight: 600 }}
              >
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-[15px] h-[48px] border-gray-300 rounded-lg"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-gray-900 text-[14px]"
                style={{ fontWeight: 600 }}
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-[15px] h-[48px] border-gray-300 rounded-lg"
                disabled={isLoading}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#0d5e38] hover:bg-[#0a4d2c] text-white py-3 rounded-[12px] text-[15px] h-[48px]"
              style={{ fontWeight: 600 }}
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-gray-700 hover:bg-gray-50 text-[15px] h-[48px]"
              style={{ fontWeight: 500 }}
              onClick={() => setIsEmailMode(false)}
              disabled={isLoading}
            >
              Back to Phone Login
            </Button>

            <div className="pt-2 text-center">
              <p className="text-[13px] text-gray-600">
                Test Account: <br />
                <span className="font-mono text-[12px]">
                  test@murugan.com / test1234
                </span>
              </p>
            </div>
          </form>
        )}

        {/* Privacy Policy */}
        <p className="text-[12px] text-gray-500 text-center mt-6 leading-relaxed">
          By continuing, you agree to our{" "}
          <button className="text-[#0d5e38] underline">
            Privacy Policy
          </button>
        </p>
      </div>

      {/* Bottom Decorative Pattern - Traditional Kolam */}
      <div className="w-full max-w-[200px] mb-8 opacity-25">
        <svg
          className="w-full h-auto"
          viewBox="0 0 200 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="100"
            cy="40"
            r="8"
            fill="#14874A"
            fillOpacity="0.4"
          />
          <circle
            cx="70"
            cy="40"
            r="8"
            fill="#14874A"
            fillOpacity="0.4"
          />
          <circle
            cx="130"
            cy="40"
            r="8"
            fill="#14874A"
            fillOpacity="0.4"
          />
          <circle
            cx="85"
            cy="60"
            r="8"
            fill="#14874A"
            fillOpacity="0.4"
          />
          <circle
            cx="115"
            cy="60"
            r="8"
            fill="#14874A"
            fillOpacity="0.4"
          />
          <circle
            cx="100"
            cy="80"
            r="8"
            fill="#14874A"
            fillOpacity="0.4"
          />
          <circle
            cx="70"
            cy="80"
            r="8"
            fill="#14874A"
            fillOpacity="0.4"
          />
          <circle
            cx="130"
            cy="80"
            r="8"
            fill="#14874A"
            fillOpacity="0.4"
          />
          <path
            d="M 70 40 Q 85 30 100 40 Q 115 30 130 40"
            stroke="#14874A"
            strokeWidth="2"
            fill="none"
            strokeOpacity="0.3"
          />
          <path
            d="M 70 80 Q 85 70 100 80 Q 115 70 130 80"
            stroke="#14874A"
            strokeWidth="2"
            fill="none"
            strokeOpacity="0.3"
          />
          <path
            d="M 70 40 Q 60 60 70 80"
            stroke="#14874A"
            strokeWidth="2"
            fill="none"
            strokeOpacity="0.3"
          />
          <path
            d="M 130 40 Q 140 60 130 80"
            stroke="#14874A"
            strokeWidth="2"
            fill="none"
            strokeOpacity="0.3"
          />
        </svg>
      </div>
    </div>
  );
}