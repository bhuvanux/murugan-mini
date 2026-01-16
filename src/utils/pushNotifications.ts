
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from './supabase/client';
import { Capacitor } from '@capacitor/core';

export const setupPushNotifications = async (userId: string) => {
    if (!Capacitor.isNativePlatform()) {
        console.log('[Push] Not a native platform, skipping push setup');
        return;
    }

    try {
        // 1. Check permissions for push notifications
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }


        if (permStatus.receive !== 'granted') {
            console.log('[Push] User denied permissions');
            return;
        }

        // 1.5 Request Local Notifications permissions (for foreground notifications)
        let localPermStatus = await LocalNotifications.checkPermissions();
        if (localPermStatus.display === 'prompt') {
            localPermStatus = await LocalNotifications.requestPermissions();
        }

        // 2. Create Notification Channels (Required for Android 8+)
        // Backend sends to "general_notifications" and "important_notifications"

        // General Channel
        await PushNotifications.createChannel({
            id: 'general_notifications',
            name: 'General Notifications',
            description: 'Regular updates and news',
            importance: 3, // Default
            visibility: 1,
            vibration: true,
            sound: 'default',
        });

        // Important Channel
        await PushNotifications.createChannel({
            id: 'important_notifications',
            name: 'Important Updates',
            description: 'Critical alerts and announcements',
            importance: 5, // High
            visibility: 1,
            vibration: true,
            sound: 'default',
        });

        // Legacy/Default fallback
        await PushNotifications.createChannel({
            id: 'default',
            name: 'Default Notifications',
            description: 'General app notifications',
            importance: 3,
            visibility: 1,
        });

        // 3. Register with FCM
        await PushNotifications.register();

        // 4. Add listeners

        // On registration success: Save token to Supabase
        PushNotifications.addListener('registration', async (token) => {
            console.log('[Push] Registration token:', token.value);

            try {
                const { error } = await supabase
                    .from('users')
                    .update({ fcm_token: token.value })
                    .eq('id', userId);

                if (error) throw error;
                console.log('[Push] Token saved to database');
            } catch (err) {
                console.error('[Push] Failed to save token:', err);
            }
        });

        // On registration error
        PushNotifications.addListener('registrationError', (error) => {
            console.error('[Push] Registration failed:', error);
        });

        // On notification received (Foreground)
        // When app is in foreground, FCM doesn't auto-display notifications
        // We manually create a local notification to show it in the system tray
        PushNotifications.addListener('pushNotificationReceived', async (notification) => {
            console.log('[Push] Received in foreground:', notification);

            try {
                // Create a local notification to display in system tray
                await LocalNotifications.schedule({
                    notifications: [
                        {
                            title: notification.title || 'New Notification',
                            body: notification.body || '',
                            id: Date.now(),
                            schedule: { at: new Date(Date.now() + 100) }, // Show immediately
                            sound: 'default',
                            smallIcon: 'ic_launcher_foreground',
                            largeIcon: 'ic_launcher', // Show full app icon on the right
                            channelId: 'default',
                            extra: notification.data || {},
                        }
                    ]
                });
                console.log('[Push] Local notification scheduled for system tray');
            } catch (err) {
                console.error('[Push] Failed to create local notification:', err);
            }
        });

        // On notification tapped (Background/Closed)
        PushNotifications.addListener('pushNotificationActionPerformed', async (notification) => {
            console.log('[Push] Action performed:', notification);

            // Track notification open
            const notificationId = notification.notification.data?.notification_id;
            if (notificationId) {
                try {
                    const { trackNotificationOpen } = await import('./notificationTracking');
                    await trackNotificationOpen(notificationId);
                } catch (err) {
                    console.error('[Push] Failed to track open:', err);
                }
            }

            // Logic to navigate to specific screen can go here
            // Example: Navigate to notification detail screen
        });

        // Also listen to local notification taps (when user taps the notification we created)
        LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
            console.log('[LocalPush] Tapped:', notification);

            // Track notification open if we have the ID in extra data
            const notificationId = notification.notification.extra?.notification_id;
            if (notificationId) {
                try {
                    const { trackNotificationOpen } = await import('./notificationTracking');
                    await trackNotificationOpen(notificationId);
                } catch (err) {
                    console.error('[LocalPush] Failed to track open:', err);
                }
            }
        });

    } catch (error) {
        console.error('[Push] Setup failed:', error);
    }
};
