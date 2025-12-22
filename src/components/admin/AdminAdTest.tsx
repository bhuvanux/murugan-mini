import { useState } from "react";
import { adService } from "../../services/AdService";
import { AD_CONFIG } from "../../config/adConfig";
import { Play, Eye, EyeOff, Trophy, AlertCircle, CheckCircle2 } from "lucide-react";

export function AdminAdTest() {
    const [logs, setLogs] = useState<string[]>([]);
    const [isBannerVisible, setIsBannerVisible] = useState(false);
    const [isPremiumSimulated, setIsPremiumSimulated] = useState(false);
    const [isAdsEnabledSimulated, setIsAdsEnabledSimulated] = useState(AD_CONFIG.remoteConfig.adsEnabled);

    const addLog = (msg: string) => {
        setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 9)]);
    };

    const handleTestInterstitial = async () => {
        addLog("Requesting Interstitial...");
        const result = await adService.showInterstitial();
        if (result.success) {
            addLog("Interstitial shown successfully.");
        } else {
            addLog(`❌ Suppressed: ${result.reason}`);
        }
    };

    const handleTestRewarded = async () => {
        addLog("Requesting Rewarded Ad...");
        const result = await adService.showRewarded(() => {
            addLog("✨ Reward earned! Callback triggered.");
        });

        if (result.success) {
            addLog("Rewarded ad shown successfully.");
        } else {
            addLog(`❌ Suppressed: ${result.reason}`);
        }
    };

    const toggleBanner = async () => {
        if (isBannerVisible) {
            addLog("Hiding Banner...");
            await adService.hideBanner();
            setIsBannerVisible(false);
        } else {
            addLog("Showing Banner...");
            await adService.showBanner();
            setIsBannerVisible(true);
        }
    };

    const handleIncrementAction = () => {
        adService.incrementActions();
        addLog("Incremented meaningful action count.");
    };

    const togglePremium = () => {
        const next = !isPremiumSimulated;
        setIsPremiumSimulated(next);
        AD_CONFIG.remoteConfig.premiumUserOverride = next;
        addLog(`Premium simulated: ${next}`);
    };

    const toggleGlobalAds = () => {
        const next = !isAdsEnabledSimulated;
        setIsAdsEnabledSimulated(next);
        AD_CONFIG.remoteConfig.adsEnabled = next;
        addLog(`Global adsEnabled simulated: ${next}`);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Controls */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Play className="w-5 h-5 text-green-600" />
                        Ad Controls (Test Mode)
                    </h3>

                    <div className="space-y-2">
                        <button
                            onClick={handleTestInterstitial}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
                        >
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-orange-500" />
                                <span className="font-medium text-gray-700">Test Interstitial</span>
                            </div>
                            <span className="text-xs text-gray-400">ca-app-pub...1033173712</span>
                        </button>

                        <button
                            onClick={handleTestRewarded}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
                        >
                            <div className="flex items-center gap-3">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                <span className="font-medium text-gray-700">Test Rewarded</span>
                            </div>
                            <span className="text-xs text-gray-400">ca-app-pub...5224354917</span>
                        </button>

                        <button
                            onClick={toggleBanner}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
                        >
                            <div className="flex items-center gap-3">
                                {isBannerVisible ? (
                                    <EyeOff className="w-5 h-5 text-red-500" />
                                ) : (
                                    <Eye className="w-5 h-5 text-blue-500" />
                                )}
                                <span className="font-medium text-gray-700">
                                    {isBannerVisible ? "Hide Banner" : "Show Banner"}
                                </span>
                            </div>
                            <span className="text-xs text-gray-400">ca-app-pub...6300978111</span>
                        </button>

                        <button
                            onClick={handleIncrementAction}
                            className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-100"
                        >
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-purple-500" />
                                <span className="font-medium text-purple-700">Simulate Action (+1)</span>
                            </div>
                            <span className="text-xs text-purple-400">Bypass Guardrail</span>
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={togglePremium}
                                className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${isPremiumSimulated
                                    ? "bg-yellow-500 border-yellow-600 text-white"
                                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                    }`}
                            >
                                {isPremiumSimulated ? "Premium: ON" : "Premium: OFF"}
                            </button>
                            <button
                                onClick={toggleGlobalAds}
                                className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${isAdsEnabledSimulated
                                    ? "bg-green-600 border-green-700 text-white"
                                    : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                                    }`}
                            >
                                {isAdsEnabledSimulated ? "Ads: Enabled" : "Ads: Disabled"}
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700">
                        <strong>Note:</strong> Ads may be suppressed by launch safety rules (e.g. 60s delay on first launch, or session limits). Check console for suppression logs.
                    </div>
                </div>

                {/* Status & Settings */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Active Configuration
                    </h3>

                    <div className="text-sm space-y-2 text-gray-600">
                        <div className="flex justify-between">
                            <span>Ads Enabled:</span>
                            <span className="font-mono text-green-600">{AD_CONFIG.remoteConfig.adsEnabled ? "TRUE" : "FALSE"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Banners Enabled:</span>
                            <span className="font-mono text-gray-400">{AD_CONFIG.rules.bannersEnabled ? "TRUE" : "FALSE"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>First Launch Delay:</span>
                            <span className="font-mono">{AD_CONFIG.rules.firstLaunchDelaySec}s</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Session Limit:</span>
                            <span className="font-mono">{AD_CONFIG.rules.maxInterstitialsPerSession}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-semibold mb-2 text-gray-700">Test Logs</h4>
                        <div className="bg-black text-green-400 p-3 rounded-lg font-mono text-[10px] min-h-[100px] overflow-y-auto">
                            {logs.length === 0 ? "> Ready for testing..." : logs.map((log, i) => (
                                <div key={i}>{log}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
