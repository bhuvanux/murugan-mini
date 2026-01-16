import { supabase } from './supabase/client';

/**
 * Track when a user views a notification
 * Called when notification appears in the notification center/list
 */
export async function trackNotificationView(notificationId: string) {
    try {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(notificationId)) {
            console.error('[Notification Tracking] Invalid UUID:', notificationId);
            return;
        }

        const { error } = await supabase.rpc('increment_notification_view', {
            p_notification_id: notificationId
        });

        if (error) {
            console.error('[Notification Tracking] View error:', error);
        } else {
            console.log('[Notification Tracking] View tracked:', notificationId);
        }
    } catch (err) {
        console.error('[Notification Tracking] View exception:', err);
    }
}

/**
 * Track when a user opens/clicks a notification
 * Called when notification is tapped
 */
export async function trackNotificationOpen(notificationId: string) {
    try {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(notificationId)) {
            console.error('[Notification Tracking] Invalid UUID:', notificationId);
            return;
        }

        const { error } = await supabase.rpc('increment_notification_open', {
            p_notification_id: notificationId
        });

        if (error) {
            console.error('[Notification Tracking] Open error:', error);
        } else {
            console.log('[Notification Tracking] Open tracked:', notificationId);
        }
    } catch (err) {
        console.error('[Notification Tracking] Open exception:', err);
    }
}

/**
 * Get notification details for display in app
 */
export async function getNotificationDetails(notificationId: string) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', notificationId)
            .eq('status', 'sent')
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('[Notification] Fetch error:', err);
        return null;
    }
}

/**
 * Get all sent notifications for user's notification center
 */
export async function getUserNotifications(limit: number = 20) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('status', 'sent')
            .order('sent_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('[Notifications] Fetch error:', err);
        return [];
    }
}
