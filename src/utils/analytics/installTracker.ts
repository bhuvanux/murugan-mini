import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabase/client';
import { projectId } from '../supabase/info';

const INSTALL_TRACKED_KEY = 'app_install_tracked';

export async function trackAppInstall() {
    try {
        // 1. Check if already tracked locally
        const { value } = await Preferences.get({ key: INSTALL_TRACKED_KEY });
        if (value === 'true') {
            console.log('[InstallTracker] Already tracked locally.');
            return;
        }

        // 2. Collect Device Info
        const info = await Device.getInfo();
        const id = await Device.getId();
        const appInfo = await App.getInfo();

        // 3. Prepare payload
        const payload = {
            device_id: id.identifier,
            platform: info.platform,
            os_version: info.osVersion,
            model: info.model,
            manufacturer: info.manufacturer,
            app_version: appInfo.version,
            metadata: {
                isVirtual: info.isVirtual,
                webViewVersion: info.webViewVersion,
                name: info.name
            }
        };

        console.log('[InstallTracker] Tracking install...', payload);

        // 4. Send to Edge Function
        const projectUrl = `https://${projectId}.supabase.co`;
        const response = await fetch(`${projectUrl}/functions/v1/make-server-4a075ebc/api/analytics/track-install`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            console.log('[InstallTracker] Install tracked successfully:', result);
            // 5. Mark as tracked locally
            await Preferences.set({
                key: INSTALL_TRACKED_KEY,
                value: 'true'
            });
        } else {
            console.error('[InstallTracker] Failed to track install:', result.error);
        }
    } catch (error) {
        console.error('[InstallTracker] Error during tracking:', error);
    }
}

export const sendHeartbeat = async () => {
    try {
        const { value: deviceId } = await Preferences.get({ key: 'device_id' }); // Note: We might need to ensure this is set or derive it again

        // If we don't have a stored ID, we might be new or cleared. 
        // For heartbeat, we should probably get the ID from Device plugin if not in preferences, 
        // but for now let's assume if it's not in prefs, we invoke trackAppInstall or just skip.
        // Let's re-fetch ID from Device plugin to be safe as trackAppInstall sets the preference AFTER success.

        const { identifier } = await Device.getId();
        if (!identifier) return;

        const projectUrl = `https://${projectId}.supabase.co`;

        // Fire and forget
        fetch(`${projectUrl}/functions/v1/make-server-4a075ebc/api/analytics/heartbeat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ device_id: identifier }),
        }).catch(err => console.error('[Heartbeat] Failed:', err));

    } catch (error) {
        console.error('[Heartbeat] Error:', error);
    }
};
