/**
 * Music Controls Service
 * Wrapper for capacitor-music-controls-plugin-v3
 * Provides native media controls in notification shade
 */

import { Capacitor } from '@capacitor/core';
import { BackgroundMode } from '@anuradev/capacitor-background-mode';

// Type definitions for the plugin
interface MusicControlsPlugin {
    create(options: MusicControlsOptions): Promise<void>;
    updateIsPlaying(options: { isPlaying: boolean }): Promise<void>;
    updateElapsed(options: { elapsed: number; isPlaying: boolean }): Promise<void>;
    destroy(): Promise<void>;
    listen(): Promise<void>;
    addListener(
        eventName: 'controlsNotification',
        listenerFunc: (info: { message: string }) => void
    ): Promise<any>;
    removeAllListeners(): Promise<void>;
}

export type BackgroundModeEvent = 'appInBackground' | 'appInForeground';

interface MusicControlsOptions {
    track: string;
    artist: string;
    album?: string;
    cover?: string;
    isPlaying: boolean;
    dismissable: boolean;
    hasPrev: boolean;
    hasNext: boolean;
    hasClose: boolean;
    playIcon?: string;
    pauseIcon?: string;
    prevIcon?: string;
    nextIcon?: string;
    closeIcon?: string;
    notificationIcon?: string;
    duration?: number;
    elapsed?: number;
    hasSeekbar?: boolean;
}

export type MusicControlAction = 'music-controls-pause' | 'music-controls-play' | 'music-controls-next' | 'music-controls-previous' | 'music-controls-destroy';

export interface MusicControlsMetadata {
    track: string;
    artist: string;
    album?: string;
    cover?: string;
    duration?: number;
    elapsed?: number;
}

class MusicControlsService {
    private plugin: MusicControlsPlugin | null = null;
    private isInitialized = false;
    private isBackgroundModeEnabled = false;
    private listeners: Array<(action: MusicControlAction) => void> = [];
    private backgroundListeners: Array<(event: BackgroundModeEvent) => void> = [];

    constructor() {
        // Only initialize on native platforms
        if (Capacitor.isNativePlatform()) {
            this.initPlugin();
        }
    }

    private async initPlugin() {
        try {
            const { CapacitorMusicControls } = await import('capacitor-music-controls-plugin-v3');
            this.plugin = CapacitorMusicControls as unknown as MusicControlsPlugin;

            // Start listening for control events
            if (this.plugin) {
                await this.plugin.listen();
                await this.plugin.addListener('controlsNotification', (info) => {
                    this.handleControlEvent(info.message as MusicControlAction);
                });
            }

            // Listen for background events
            await BackgroundMode.addListener('appInBackground', () => {
                console.log('[MusicControls] App went to background');
                this.handleBackgroundEvent('appInBackground');
            });

            await BackgroundMode.addListener('appInForeground', () => {
                console.log('[MusicControls] App came to foreground');
                this.handleBackgroundEvent('appInForeground');
            });

            this.isInitialized = true;
            console.log('[MusicControls] Plugins initialized (Music + Background)');
        } catch (error) {
            console.error('[MusicControls] Failed to initialize plugins:', error);
        }
    }

    /**
     * Enable background mode to keep the WebView alive
     */
    async enableBackgroundMode(): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        try {
            if (!this.isBackgroundModeEnabled) {
                await BackgroundMode.enable({
                    title: 'Tamil Kadavul Murugan',
                    text: 'Music is playing in background',
                    resume: true,
                    hidden: false
                });
                // Optional: disable optimizations to ensure persistence
                await BackgroundMode.disableWebViewOptimizations();
                await BackgroundMode.requestDisableBatteryOptimizations();

                this.isBackgroundModeEnabled = true;
                console.log('[MusicControls] Background mode enabled');
            }
        } catch (error) {
            console.error('[MusicControls] Failed to enable background mode:', error);
        }
    }

    /**
     * Disable background mode when playback stops
     */
    async disableBackgroundMode(): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        try {
            if (this.isBackgroundModeEnabled) {
                await BackgroundMode.disable();
                this.isBackgroundModeEnabled = false;
                console.log('[MusicControls] Background mode disabled');
            }
        } catch (error) {
            console.error('[MusicControls] Failed to disable background mode:', error);
        }
    }

    /**
     * Create or update music controls with metadata
     */
    async create(metadata: MusicControlsMetadata, isPlaying: boolean): Promise<void> {
        if (!this.plugin || !this.isInitialized) {
            console.log('[MusicControls] Plugin not available (web mode)');
            return;
        }

        try {
            const options: MusicControlsOptions = {
                track: metadata.track,
                artist: metadata.artist,
                album: metadata.album || 'Tamil Kadavul Murugan',
                cover: metadata.cover || '',
                isPlaying,
                dismissable: true,
                hasPrev: true,
                hasNext: true,
                hasClose: true,
                duration: metadata.duration || 0,
                elapsed: metadata.elapsed || 0,
                hasSeekbar: false, // YouTube player doesn't support seeking from notification
            };

            await this.plugin.create(options);

            // Auto-enable background mode when creating controls (usually starts playing)
            if (isPlaying) {
                this.enableBackgroundMode();
            } else {
                this.disableBackgroundMode();
            }

            console.log('[MusicControls] Controls created/updated:', options);
        } catch (error) {
            console.error('[MusicControls] Failed to create controls:', error);
        }
    }

    /**
     * Update play/pause state
     */
    async updateIsPlaying(isPlaying: boolean): Promise<void> {
        if (!this.plugin || !this.isInitialized) return;

        try {
            await this.plugin.updateIsPlaying({ isPlaying });

            if (isPlaying) {
                this.enableBackgroundMode();
            } else {
                this.disableBackgroundMode();
            }

            console.log('[MusicControls] Updated isPlaying:', isPlaying);
        } catch (error) {
            console.error('[MusicControls] Failed to update isPlaying:', error);
        }
    }

    /**
     * Update elapsed time
     */
    async updateElapsed(elapsed: number, isPlaying: boolean): Promise<void> {
        if (!this.plugin || !this.isInitialized) return;

        try {
            await this.plugin.updateElapsed({ elapsed, isPlaying });
        } catch (error) {
            console.error('[MusicControls] Failed to update elapsed:', error);
        }
    }

    /**
     * Destroy music controls
     */
    async destroy(): Promise<void> {
        if (!this.plugin || !this.isInitialized) return;

        try {
            await this.disableBackgroundMode();
            await this.plugin.destroy();
            console.log('[MusicControls] Controls destroyed');
        } catch (error) {
            console.error('[MusicControls] Failed to destroy controls:', error);
        }
    }

    /**
     * Subscribe to control events
     */
    subscribe(callback: (action: MusicControlAction) => void): () => void {
        this.listeners.push(callback);

        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Subscribe to background mode events
     */
    subscribeToBackground(callback: (event: BackgroundModeEvent) => void): () => void {
        this.backgroundListeners.push(callback);
        return () => {
            this.backgroundListeners = this.backgroundListeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Handle control events from notification
     */
    private handleControlEvent(action: MusicControlAction) {
        console.log('[MusicControls] Control event:', action);

        // Notify all listeners
        this.listeners.forEach(callback => {
            try {
                callback(action);
            } catch (error) {
                console.error('[MusicControls] Error in listener callback:', error);
            }
        });
    }

    /**
     * Handle background events
     */
    private handleBackgroundEvent(event: BackgroundModeEvent) {
        this.backgroundListeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('[MusicControls] Error in background listener callback:', error);
            }
        });
    }

    /**
     * Check if running on native platform
     */
    isNative(): boolean {
        return Capacitor.isNativePlatform();
    }

    /**
     * Cleanup all listeners
     */
    async cleanup(): Promise<void> {
        if (!this.plugin || !this.isInitialized) return;

        try {
            await this.plugin.removeAllListeners();
            this.listeners = [];
            console.log('[MusicControls] Cleaned up all listeners');
        } catch (error) {
            console.error('[MusicControls] Failed to cleanup:', error);
        }
    }
}

// Export singleton instance
export const musicControls = new MusicControlsService();
