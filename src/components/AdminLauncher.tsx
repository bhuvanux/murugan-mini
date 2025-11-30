import React from "react";
import { Smartphone, Layout, ArrowRight } from "lucide-react";

interface AdminLauncherProps {
  onSelectMode: (mode: "mobile" | "admin") => void;
}

export function AdminLauncher({ onSelectMode }: AdminLauncherProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 via-green-700 to-green-900 flex items-center justify-center p-8">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 
            className="text-5xl text-white mb-4"
            style={{ fontFamily: "var(--font-tamil-bold)" }}
          >
            Tamil Kadavul Murugan
          </h1>
          <p className="text-green-200 text-xl">Select your interface</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Mobile App */}
          <button
            onClick={() => onSelectMode("mobile")}
            className="group bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 text-left"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Mobile App</h2>
            <p className="text-gray-600 mb-6">
              Access the user-facing mobile interface with Ask Gugan AI, wallpapers, media, and more
            </p>
            
            <div className="flex items-center gap-2 text-green-700 font-semibold group-hover:gap-3 transition-all">
              <span>Launch App</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </button>

          {/* Admin Panel */}
          <button
            onClick={() => onSelectMode("admin")}
            className="group bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 text-left"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Layout className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Admin Panel</h2>
            <p className="text-gray-600 mb-6">
              Manage content, view analytics, and control all aspects of the Murugan app
            </p>
            
            <div className="flex items-center gap-2 text-purple-700 font-semibold group-hover:gap-3 transition-all">
              <span>Open Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-green-200 text-sm">
            © 2024 Tamil Kadavul Murugan App • வேல் முருகா!
          </p>
        </div>
      </div>
    </div>
  );
}
