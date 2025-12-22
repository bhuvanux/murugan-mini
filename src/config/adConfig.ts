/**
 * AdMob Configuration for Murugan AI
 * 
 * NOTE: Use test IDs for development. Switch to production IDs for release.
 * Reference: https://developers.google.com/admob/android/test-ads#sample_ad_units
 */

export const AD_CONFIG = {
    // Test Ad Unit IDs (Generic for Android)
    testIds: {
        banner: "ca-app-pub-3940256099942544/6300978111",
        interstitial: "ca-app-pub-3940256099942544/1033173712",
        rewarded: "ca-app-pub-3940256099942544/5224354917",
        native: "ca-app-pub-3940256099942544/2247696110",
    },

    // Default Launch Rules
    rules: {
        firstLaunchDelaySec: 60, // No ads in the first 60 seconds
        maxInterstitialsPerSession: 1,
        interstitialCooldownSec: 300, // 5 minutes between interstitials
        minActionsBeforeInterstitial: 3, // New Guardrail: Min 3 actions before ads
        bannersEnabled: true, // Enabled for Step 2 integration
    },

    // Flags for admin override (initial static values)
    remoteConfig: {
        adsEnabled: true,
        modules: {
            wallpapers: true,
            songs: false, // Disabled for now
            sparkle: false,
        },
        premiumUserOverride: false, // If true, disable all ads
    }
};
