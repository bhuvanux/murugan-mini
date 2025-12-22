import type { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

// Create Supabase client with Service Role for Admin Access
function supabaseAdminClient() {
    return createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
}

/**
 * Validate API Key or Internal Token
 */
function isAuthorized(c: Context): boolean {
    const authHeader = c.req.header("Authorization");
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const automationKey = Deno.env.get('AUTOMATION_API_KEY'); // Optional custom key

    if (!authHeader) return false;

    const token = authHeader.replace("Bearer ", "");

    // Allow if token matches Service Role Key OR a specific Automation Key
    return token === serviceKey || (automationKey && token === automationKey);
}

/**
 * Ingest YouTube Short (Automation)
 * POST /api/spark/ingest
 */
export async function ingestSparkle(c: Context) {
    try {
        // 1. Auth Check
        if (!isAuthorized(c)) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        const body = await c.req.json();
        const {
            title,
            video_id,
            video_url,
            thumbnail_url,
            description,
            tags,
            source = "youtube",
            published_at, // YouTube original publish time
            status = "draft",
            ingested_at = new Date().toISOString(),
            ingested_by = "autobot",
            meta
        } = body;

        // 2. Validation
        if (!video_id || !title) {
            return c.json({ error: "Missing required fields: video_id, title" }, 400);
        }

        const supabase = supabaseAdminClient();

        // 3. Check for existing item (Upsert Logic)
        const { data: existing } = await supabase
            .from("sparkle")
            .select("id, publish_status")
            .eq("video_id", video_id)
            .single();

        let result;
        if (existing) {
            // Update existing
            console.log(`[Sparkle Automation] Updating existing video: ${video_id}`);
            const { data, error } = await supabase
                .from("sparkle")
                .update({
                    title,
                    description,
                    thumbnail_url,
                    video_url,
                    tags,
                    meta: meta || {},
                    updated_at: new Date().toISOString(),
                    // Note: We do NOT overwrite publish_status if it already exists, to prevent unpublishing
                })
                .eq("id", existing.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Insert new
            console.log(`[Sparkle Automation] Ingesting new video: ${video_id}`);
            const { data, error } = await supabase
                .from("sparkle")
                .insert({
                    title,
                    video_id,
                    video_url,
                    thumbnail_url,
                    description,
                    content: description || title, // Fallback for required 'content' field
                    tags,
                    source,
                    original_published_at: published_at,
                    publish_status: status,
                    ingested_at,
                    ingested_by,
                    meta: meta || {},
                })
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        return c.json({
            success: true,
            action: existing ? "updated" : "created",
            data: result
        });

    } catch (error: any) {
        console.error("[Sparkle Automation] Ingest error:", error);
        return c.json({ success: false, error: error.message }, 500);
    }
}

/**
 * Publish Sparkle Item
 * POST /api/spark/publish
 */
export async function publishSparkle(c: Context) {
    try {
        // 1. Auth Check
        if (!isAuthorized(c)) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        const body = await c.req.json();
        const { video_id } = body;

        if (!video_id) {
            return c.json({ error: "Missing required field: video_id" }, 400);
        }

        console.log(`[Sparkle Automation] Publishing video: ${video_id}`);
        const supabase = supabaseAdminClient();

        const { data, error } = await supabase
            .from("sparkle")
            .update({
                publish_status: "published",
                published_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("video_id", video_id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return c.json({ error: "Video not found", video_id }, 404);
            }
            throw error;
        }

        return c.json({
            success: true,
            data
        });

    } catch (error: any) {
        console.error("[Sparkle Automation] Publish error:", error);
        return c.json({ success: false, error: error.message }, 500);
    }
}
