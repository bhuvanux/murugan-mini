/**
 * Notification CRUD Operations with FCM Integration
 */

import { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { uploadFile, getPublicUrl } from "./storage-init.tsx";

// Firebase Admin SDK imports
import { initializeApp, cert, getApps, App } from "npm:firebase-admin@12/app";
import { getMessaging, Messaging } from "npm:firebase-admin@12/messaging";

const supabaseClient = () =>
    createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

function generateFilename(originalName: string, prefix: string): string {
    const timestamp = Date.now();
    const random = crypto.randomUUID().slice(0, 8);
    const ext = originalName.split(".").pop();
    return `${prefix}/${timestamp}-${random}.${ext}`;
}

// Firebase Admin App initialization
let firebaseApp: App | null = null;

function getFirebaseApp(): App {
    if (firebaseApp) return firebaseApp;

    const serviceAccount = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccount) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
    }

    try {
        const credential = JSON.parse(serviceAccount);

        // Check if app already exists
        const existingApps = getApps();
        if (existingApps.length > 0) {
            firebaseApp = existingApps[0];
            return firebaseApp;
        }

        // Initialize new app
        firebaseApp = initializeApp({
            credential: cert(credential),
            projectId: credential.project_id,
        });

        console.log("[Firebase] Admin SDK initialized successfully");
        return firebaseApp;
    } catch (error) {
        console.error("[Firebase] Initialization error:", error);
        throw new Error("Failed to initialize Firebase Admin SDK");
    }
}

/**
 * Send FCM push notification to multiple devices
 * @param notification - Notification data from database
 * @param tokens - Array of FCM tokens
 * @returns Success and failure counts
 */
async function sendFCMPushNotification(notification: any, tokens: string[]) {
    try {
        const app = getFirebaseApp();
        const messaging = getMessaging(app);

        if (!tokens || tokens.length === 0) {
            return { success: 0, failure: 0, errors: ["No FCM tokens provided"] };
        }

        console.log(`[FCM] Sending notification "${notification.title}" to ${tokens.length} devices`);

        // Build FCM message payload
        const message = {
            notification: {
                title: notification.title,
                body: notification.short_description || (notification.message_content ? notification.message_content.substring(0, 100) : ""),
                imageUrl: notification.image_url || undefined,
            },
            data: {
                notification_id: notification.id,
                type: notification.notification_type,
                message_content: notification.message_content,
                click_action: "FLUTTER_NOTIFICATION_CLICK",
            },
            android: {
                priority: "high" as const, // Always use HIGH priority for reliable delivery
                notification: {
                    channelId: notification.notification_type === "important" ? "important_notifications" : "general_notifications",
                    sound: "default",
                    priority: "max" as const, // Maximum Android notification priority
                    icon: "ic_launcher_foreground", // Use silhouette for background notifications
                    color: "#0d5e38", // Brand green color
                    visibility: "public" as const, // Show on lock screen
                    defaultVibrateTimings: true, // Vibrate on delivery
                },
            },
            // FCM Options for delivery optimization
            apns: {
                headers: {
                    "apns-priority": "10", // iOS high priority
                },
                payload: {
                    aps: {
                        contentAvailable: true,
                    },
                },
            },
        };

        // FCM has a limit of 500 tokens per multicast
        const batchSize = 500;
        let totalSuccess = 0;
        let totalFailure = 0;
        const errors: string[] = [];

        for (let i = 0; i < tokens.length; i += batchSize) {
            const batch = tokens.slice(i, i + batchSize);

            try {
                const response = await messaging.sendEachForMulticast({
                    tokens: batch,
                    ...message,
                });

                totalSuccess += response.successCount;
                totalFailure += response.failureCount;

                // Log individual failures
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const error = resp.error?.message || "Unknown error";
                        errors.push(`Token ${i + idx}: ${error}`);

                        // TODO: Handle token errors (e.g., remove invalid tokens)
                        if (error.includes("registration-token-not-registered")) {
                            console.warn(`[FCM] Invalid token at index ${i + idx}, should be removed from database`);
                        }
                    }
                });
            } catch (batchError: any) {
                console.error(`[FCM] Batch ${i}-${i + batchSize} error:`, batchError);
                errors.push(`Batch error: ${batchError.message}`);
                totalFailure += batch.length;
            }
        }

        console.log(`[FCM] Results: ${totalSuccess} successful, ${totalFailure} failed out of ${tokens.length} tokens`);

        return {
            success: totalSuccess,
            failure: totalFailure,
            errors: errors.slice(0, 10), // Return first 10 errors
        };
    } catch (error: any) {
        console.error("[FCM] Send error:", error);
        return {
            success: 0,
            failure: tokens.length,
            errors: [error.message],
        };
    }
}

// Get all notifications
export async function getNotifications(c: Context) {
    try {
        const supabase = supabaseClient();
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("[Get Notifications] Error:", error);
            return c.json({ success: false, error: error.message }, 500);
        }

        return c.json({ success: true, data: data || [] });
    } catch (error: any) {
        console.error("[Get Notifications] Exception:", error);
        return c.json({ success: false, error: error.message }, 500);
    }
}

// Get notification statistics
export async function getNotificationStats(c: Context) {
    try {
        const supabase = supabaseClient();
        const { data, error } = await supabase.rpc("get_notification_stats");

        if (error) {
            console.error("[Get Notification Stats] Error:", error);
            return c.json({ success: false, error: error.message }, 500);
        }

        return c.json({ success: true, data });
    } catch (error: any) {
        console.error("[Get Notification Stats] Exception:", error);
        return c.json({ success: false, error: error.message }, 500);
    }
}

// Get notification analytics
export async function getNotificationAnalytics(c: Context) {
    try {
        const notificationId = c.req.param("id");
        const startDate = c.req.query("start_date") || null;
        const endDate = c.req.query("end_date") || null;

        const supabase = supabaseClient();
        const { data, error } = await supabase.rpc("get_notification_analytics", {
            p_notification_id: notificationId,
            p_start_date: startDate,
            p_end_date: endDate,
        });

        if (error) {
            console.error("[Get Notification Analytics] Error:", error);
            return c.json({ success: false, error: error.message }, 500);
        }

        return c.json({ success: true, data });
    } catch (error: any) {
        console.error("[Get Notification Analytics] Exception:", error);
        return c.json({ success: false, error: error.message }, 500);
    }
}

// Upload notification with image
export async function uploadNotification(c: Context) {
    try {
        console.log("[Notification Upload] Starting...");
        const formData = await c.req.formData();
        const file = formData.get("file") as File;
        const title = formData.get("title") as string;
        const shortDescription = formData.get("short_description") as string;
        const messageContent = formData.get("message_content") as string;
        const displayType = formData.get("display_type") as string || "push";
        const notificationType = formData.get("notification_type") as string || "normal";
        const targetAudience = formData.get("target_audience") as string || "all_users";
        const status = formData.get("status") as string || "draft";
        const scheduledAt = formData.get("scheduled_at") as string;
        const navigationUrl = formData.get("navigation_url") as string;
        const buttonText = formData.get("button_text") as string;

        console.log("[Notification Upload] Form data:", { title, displayType, status });

        // Basic validation
        if (!file || !title) {
            return c.json({ success: false, error: "Image and title are required" }, 400);
        }

        // Only require message_content for non-fullscreen types
        if (displayType !== "fullscreen_banner" && !messageContent) {
            return c.json({ success: false, error: "Message content is required for this notification type" }, 400);
        }

        // Upload image
        const filename = generateFilename(file.name, "notifications");
        console.log("[Notification Upload] Uploading image:", filename);

        const uploadResult = await uploadFile("notifications", filename, file, {
            contentType: file.type,
        });

        if (!uploadResult.success) {
            console.error("[Notification Upload] Image upload failed:", uploadResult.error);
            return c.json({ success: false, error: uploadResult.error }, 500);
        }

        // Generate public URL
        const supabase = supabaseClient();
        const { data: urlData } = supabase.storage.from("notifications").getPublicUrl(filename);
        const imageUrl = urlData.publicUrl;

        console.log("[Notification Upload] Image uploaded:", imageUrl);

        // Save to database with proper sent_at if status is sent
        const insertData: any = {
            title,
            image_url: imageUrl,
            display_type: displayType,
            notification_type: notificationType,
            status: status,
            target_audience: targetAudience,
            scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        };

        // Add optional fields only if they exist
        if (shortDescription) insertData.short_description = shortDescription;
        if (messageContent) insertData.message_content = messageContent;
        if (navigationUrl) insertData.navigation_url = navigationUrl;
        if (buttonText) insertData.button_text = buttonText;

        // Set sent_at if status is sent
        if (status === "sent") {
            insertData.sent_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from("notifications")
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error("[Notification Upload] Database error:", error);
            return c.json({ success: false, error: error.message }, 500);
        }

        console.log("[Notification Upload] Success! ID:", data.id);

        return c.json({ success: true, data });
    } catch (error: any) {
        console.error("[Notification Upload] Exception:", error);
        return c.json({ success: false, error: error.message }, 500);
    }
}

// Create notification (without image)
export async function createNotification(c: Context) {
    try {
        const body = await c.req.json();
        const supabase = supabaseClient();

        const { data, error } = await supabase
            .from("notifications")
            .insert(body)
            .select()
            .single();

        if (error) {
            console.error("[Create Notification] Error:", error);
            return c.json({ success: false, error: error.message }, 500);
        }

        return c.json({ success: true, data });
    } catch (error: any) {
        console.error("[Create Notification] Exception:", error);
        return c.json({ success: false, error: error.message }, 500);
    }
}

// Update notification
export async function updateNotification(c: Context) {
    try {
        const id = c.req.param("id");
        const body = await c.req.json();
        const supabase = supabaseClient();

        console.log("[Update Notification] Updating:", id, body);

        const { data, error } = await supabase
            .from("notifications")
            .update(body)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("[Update Notification] Error:", error);
            return c.json({ success: false, error: error.message }, 500);
        }

        return c.json({ success: true, data });
    } catch (error: any) {
        console.error("[Update Notification] Exception:", error);
        return c.json({ success: false, error: error.message }, 500);
    }
}

// Delete notification
export async function deleteNotification(c: Context) {
    try {
        const id = c.req.param("id");
        const supabase = supabaseClient();

        const { error } = await supabase.from("notifications").delete().eq("id", id);

        if (error) {
            console.error("[Delete Notification] Error:", error);
            return c.json({ success: false, error: error.message }, 500);
        }

        return c.json({ success: true });
    } catch (error: any) {
        console.error("[Delete Notification] Exception:", error);
        return c.json({ success: false, error: error.message }, 500);
    }
}

// Send notification immediately
export async function sendNotification(c: Context) {
    try {
        const id = c.req.param("id");
        const supabase = supabaseClient();

        // Get notification details
        const { data: notification, error: notifError } = await supabase
            .from("notifications")
            .select("*")
            .eq("id", id)
            .single();

        if (notifError || !notification) {
            return c.json({ success: false, error: "Notification not found" }, 404);
        }

        console.log(`[Send Notification] Sending notification: ${notification.title}`);

        // Fetch all FCM tokens from users
        const { data: users, error: usersError } = await supabase
            .from("users")
            .select("fcm_token")
            .not("fcm_token", "is", null);

        if (usersError) {
            console.error("[Send Notification] Error fetching users:", usersError);
            return c.json({ success: false, error: "Failed to fetch user tokens" }, 500);
        }

        const tokens = users
            .map((u: any) => u.fcm_token)
            .filter((token: string | null) => token && token.length > 0);

        console.log(`[Send Notification] Found ${tokens.length} FCM tokens`);

        // Send FCM notification
        let fcmResult = { success: 0, failure: 0, errors: [] };
        if (tokens.length > 0) {
            fcmResult = await sendFCMPushNotification(notification, tokens);
            console.log(`[Send Notification] FCM Results:`, fcmResult);
        } else {
            console.warn("[Send Notification] No FCM tokens found, skipping push notification");
        }

        // Update notification status to sent
        const { data: updatedNotif, error: updateError } = await supabase
            .from("notifications")
            .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                metadata: {
                    fcm_delivery: {
                        total_tokens: tokens.length,
                        success_count: fcmResult.success,
                        failure_count: fcmResult.failure,
                        errors: fcmResult.errors,
                        sent_at: new Date().toISOString(),
                    },
                },
            })
            .eq("id", id)
            .select()
            .single();

        if (updateError) {
            console.error("[Send Notification] Database update error:", updateError);
            return c.json({ success: false, error: updateError.message }, 500);
        }

        console.log(`[Send Notification] ✅ Notification sent successfully`);

        return c.json({
            success: true,
            data: updatedNotif,
            delivery_stats: {
                total_devices: tokens.length,
                successful: fcmResult.success,
                failed: fcmResult.failure,
            }
        });
    } catch (error: any) {
        console.error("[Send Notification] Exception:", error);
        return c.json({ success: false, error: error.message }, 500);
    }
}

// Bulk delete notifications
export async function bulkDeleteNotifications(c: Context) {
    try {
        const body = await c.req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return c.json({ success: false, error: "IDs array is required" }, 400);
        }

        console.log(`[Bulk Delete] Deleting ${ids.length} notifications`);

        const supabase = supabaseClient();
        const { error } = await supabase
            .from("notifications")
            .delete()
            .in("id", ids);

        if (error) {
            console.error("[Bulk Delete] Error:", error);
            return c.json({ success: false, error: error.message }, 500);
        }

        console.log(`[Bulk Delete] ✅ Successfully deleted ${ids.length} notifications`);

        return c.json({
            success: true,
            deleted_count: ids.length
        });
    } catch (error: any) {
        console.error("[Bulk Delete] Exception:", error);
        return c.json({ success: false, error: error.message }, 500);
    }
}
