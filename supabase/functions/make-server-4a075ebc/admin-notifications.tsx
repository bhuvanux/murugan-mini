// Admin notification helper for new user signups
import { Hono } from "npm:hono";

const ADMIN_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "support@tamilkadavulmurugan.com";
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587");
const SMTP_USER = Deno.env.get("SMTP_USER") || "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") || "";
const SMTP_FROM = Deno.env.get("SMTP_FROM") || "noreply@tamilkadavulmurugan.com";

interface SignupNotificationData {
    name: string;
    phone: string;
    city?: string;
    signupTime: string;
    deviceInfo?: string;
}

/**
 * Send email notification to admin about new user signup
 */
export async function sendAdminSignupNotification(data: SignupNotificationData) {
    console.log('[AdminNotification] Sending signup notification:', data.phone);

    // If SMTP not configured, just log and return
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.warn('[AdminNotification] SMTP not configured, skipping email');
        return { success: false, error: 'SMTP not configured' };
    }

    try {
        // Prepare email content
        const emailSubject = `New User Signup - ${data.name}`;
        const emailBody = `
A new user has signed up to Tamil Kadavul Murugan app!

User Details:
━━━━━━━━━━━━━━━━━━━━━
👤 Name: ${data.name}
📱 Phone: ${data.phone}
📍 City: ${data.city || 'Not provided'}
⏰ Signup Time: ${new Date(data.signupTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
📲 Device: ${data.deviceInfo || 'Unknown'}

━━━━━━━━━━━━━━━━━━━━━

View user details in admin panel:
${Deno.env.get("APP_URL") || "https://app.tamilkadavulmurugan.com"}/admin

--
Tamil Kadavul Murugan Admin
    `.trim();

        // Send email using SMTP
        const response = await fetch(`https://api.smtp2go.com/v3/email/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: SMTP_PASS, // For SMTP2GO or similar
                to: [ADMIN_EMAIL],
                sender: SMTP_FROM,
                subject: emailSubject,
                text_body: emailBody,
            }),
        });

        if (!response.ok) {
            throw new Error(`SMTP send failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[AdminNotification] Email sent successfully:', result);

        return { success: true, result };
    } catch (error) {
        console.error('[AdminNotification] Failed to send email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * API endpoint to trigger admin notification (can be called from frontend too)
 */
export const adminNotificationRoutes = new Hono();

adminNotificationRoutes.post("/api/admin/notify-signup", async (c) => {
    try {
        const body = await c.req.json();
        const { name, phone, city, signupTime, deviceInfo } = body;

        if (!name || !phone) {
            return c.json({ error: "Missing required fields: name, phone" }, 400);
        }

        const result = await sendAdminSignupNotification({
            name,
            phone,
            city,
            signupTime: signupTime || new Date().toISOString(),
            deviceInfo,
        });

        return c.json(result);
    } catch (error) {
        console.error("[AdminNotification] API error:", error);
        return c.json({ error: error.message }, 500);
    }
});
