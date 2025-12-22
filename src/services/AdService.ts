import {
    AdMob,
    BannerAdSize,
    BannerAdPosition,
    AdOptions,
    BannerAdOptions,
    RewardAdOptions
} from '@capacitor-community/admob';
import { AD_CONFIG } from '../config/adConfig';

class AdService {
    private static instance: AdService;
    private isInitialized: boolean = false;
    private sessionStartTime: number = Date.now();
    private interstitialsShownThisSession: number = 0;
    private meaningfulActionsCount: number = 0;
    private isFirstLaunch: boolean = false;

    private constructor() {
        this.checkFirstLaunch();
    }

    public static getInstance(): AdService {
        if (!AdService.instance) {
            AdService.instance = new AdService();
        }
        return AdService.instance;
    }

    private checkFirstLaunch() {
        const hasLaunchedBefore = localStorage.getItem('murugan_app_has_launched');
        if (!hasLaunchedBefore) {
            this.isFirstLaunch = true;
            localStorage.setItem('murugan_app_has_launched', 'true');
        }
    }

    /**
     * Increment the count of meaningful user actions (scrolls, views, etc.)
     */
    public incrementActions() {
        this.meaningfulActionsCount++;
        // Also persist to session storage to survive partial reloads if needed
        sessionStorage.setItem('murugan_ad_actions', this.meaningfulActionsCount.toString());
        console.log(`[AdService] Meaningful action count: ${this.meaningfulActionsCount}/${AD_CONFIG.rules.minActionsBeforeInterstitial}`);
    }

    public async initialize() {
        if (this.isInitialized) return;

        try {
            await AdMob.initialize({
                testingDevices: [], // Add test device IDs if needed
                initializeForTesting: true, // Set to true to use test ads
            });

            // Request tracking authorization on iOS
            try {
                await AdMob.requestTrackingAuthorization();
            } catch {
                // May fail on non-iOS or if already handled
            }

            this.isInitialized = true;
            console.log('AdMob Initialized Successfully');
        } catch (error) {
            console.error('AdMob Initialization Failed:', error);
        }
    }

    /**
     * Check if it's safe to show an ad. 
     * Returns { safe: boolean, reason?: string }
     */
    private getAdSafetyStatus(adType: 'interstitial' | 'banner' | 'rewarded'): { safe: boolean; reason?: string } {
        // 1. Check global enable flag
        if (!AD_CONFIG.remoteConfig.adsEnabled) {
            return { safe: false, reason: "ads disabled globally" };
        }

        // 2. Check premium override
        if (AD_CONFIG.remoteConfig.premiumUserOverride) {
            return { safe: false, reason: "premium user detected" };
        }

        // 3. First launch delay rule (60 seconds)
        if (this.isFirstLaunch) {
            const timeSinceStart = (Date.now() - this.sessionStartTime) / 1000;
            if (timeSinceStart < AD_CONFIG.rules.firstLaunchDelaySec) {
                return { safe: false, reason: `first launch delay (${Math.round(AD_CONFIG.rules.firstLaunchDelaySec - timeSinceStart)}s remaining)` };
            }
        }

        // 4. Interstitial specific rules
        if (adType === 'interstitial') {
            // Guardrail: meaningful actions
            if (this.meaningfulActionsCount < AD_CONFIG.rules.minActionsBeforeInterstitial) {
                return { safe: false, reason: `min actions not met (${this.meaningfulActionsCount}/${AD_CONFIG.rules.minActionsBeforeInterstitial})` };
            }

            if (this.isFirstLaunch) {
                return { safe: false, reason: "no interstitials on first session" };
            }

            if (this.interstitialsShownThisSession >= AD_CONFIG.rules.maxInterstitialsPerSession) {
                return { safe: false, reason: "session limit reached" };
            }
        }

        return { safe: true };
    }

    private isSafeToShowAd(adType: 'interstitial' | 'banner' | 'rewarded'): boolean {
        const { safe, reason } = this.getAdSafetyStatus(adType);
        if (!safe) {
            console.log(`Ad suppressed: ${reason}`);
        }
        return safe;
    }

    /**
     * Show a banner ad.
     * NOTE: Banners are disabled by default for launch.
     */
    public async showBanner() {
        if (!this.isSafeToShowAd('banner')) return;
        if (!AD_CONFIG.rules.bannersEnabled) return;

        const options: BannerAdOptions = {
            adId: AD_CONFIG.testIds.banner,
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
        };

        try {
            await AdMob.showBanner(options);
        } catch (error) {
            console.error('Failed to show banner:', error);
        }
    }

    public async hideBanner() {
        try {
            await AdMob.hideBanner();
            console.log('[AdService] Banner hidden');
        } catch (error) {
            console.error('[AdService] Failed to hide banner:', error);
        }
    }

    public async removeBanner() {
        try {
            await AdMob.removeBanner();
            console.log('[AdService] Banner removed');
        } catch (error) {
            console.error('[AdService] Failed to remove banner:', error);
        }
    }

    /**
     * Show an interstitial ad.
     */
    public async showInterstitial(): Promise<{ success: boolean; reason?: string }> {
        const status = this.getAdSafetyStatus('interstitial');
        if (!status.safe) return { success: false, reason: status.reason };

        const options: AdOptions = {
            adId: AD_CONFIG.testIds.interstitial,
        };

        try {
            await AdMob.prepareInterstitial(options);
            await AdMob.showInterstitial();
            this.interstitialsShownThisSession++;
            return { success: true };
        } catch (error: any) {
            console.error('Failed to show interstitial:', error);
            return { success: false, reason: error.message || "playback error" };
        }
    }

    /**
     * Show a rewarded ad.
     * REWARDED ads are strictly user-initiated.
     */
    public async showRewarded(onReward: () => void): Promise<{ success: boolean; reason?: string }> {
        const status = this.getAdSafetyStatus('rewarded');
        if (!status.safe) return { success: false, reason: status.reason };

        const options: RewardAdOptions = {
            adId: AD_CONFIG.testIds.rewarded,
        };

        try {
            await AdMob.prepareRewardVideoAd(options);
            const reward = await AdMob.showRewardVideoAd();
            if (reward) {
                onReward();
                return { success: true };
            }
            return { success: false, reason: "no reward earned" };
        } catch (error: any) {
            console.error('Failed to show rewarded ad:', error);
            return { success: false, reason: error.message || "playback error" };
        }
    }
}

export const adService = AdService.getInstance();
