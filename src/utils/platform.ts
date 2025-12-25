import { Capacitor } from '@capacitor/core';

/**
 * Returns true if the app is running as a native mobile app (Android/iOS).
 * Returns false if running in a web browser.
 */
export const isMobileApp = (): boolean => {
    return Capacitor.isNativePlatform();
};

/**
 * Returns true if the environment supports Admin features (Browser only).
 * Returns false if running as a native mobile app.
 */
export const isAdminEnvironment = (): boolean => {
    return !isMobileApp();
};
