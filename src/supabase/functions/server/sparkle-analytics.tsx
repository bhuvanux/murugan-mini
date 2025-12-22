import type { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

// Create Supabase client
function supabaseClient() {
    return createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
}

/**
 * Get analytics for a specific sparkle article
 * GET /api/analytics/sparkle/:id
 */
export async function getSparkleAnalytics(c: Context) {
    try {
        const sparkleId = c.req.param("id");
        const supabase = supabaseClient();

        // Get date range from query params or default to last 30 days
        const startDateParam = c.req.query("start_date");
        const endDateParam = c.req.query("end_date");

        let startDate: Date;
        let endDate: Date;

        if (startDateParam && endDateParam) {
            startDate = new Date(startDateParam);
            endDate = new Date(endDateParam);
            console.log(`[Sparkle Analytics] Using custom date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        } else {
            // Default to last 30 days
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            console.log(`[Sparkle Analytics] Using default date range (last 30 days)`);
        }

        // Get sparkle basic info from the main sparkles table
        const { data: sparkle, error: sparkleError } = await supabase
            .from("sparkles")
            .select("id, title, image_url, thumbnail_url, created_at, view_count, like_count, share_count")
            .eq("id", sparkleId)
            .single();

        if (sparkleError) {
            console.error("[Sparkle Analytics] Sparkle error:", sparkleError);
            return c.json({ error: sparkleError.message }, 500);
        }

        if (!sparkle) {
            return c.json({ error: "Sparkle not found" }, 404);
        }

        // Get events from unified analytics table with date range
        let events: any[] = [];

        const { data: unifiedEvents, error: unifiedError } = await supabase
            .from("unified_analytics")
            .select("event_type, created_at, metadata")
            .eq("module_name", "sparkle")
            .eq("item_id", sparkleId)
            .gte("created_at", startDate.toISOString())
            .lte("created_at", endDate.toISOString())
            .order("created_at", { ascending: false });

        if (!unifiedError && unifiedEvents) {
            console.log(`[Sparkle Analytics] ✅ Found ${unifiedEvents.length} events from unified analytics`);
            events = unifiedEvents;
        } else {
            console.log(`[Sparkle Analytics] ⚠️ Unified analytics query failed, trying legacy table:`, unifiedError);

            // Fallback to legacy sparkle_analytics table
            const { data: legacyEvents, error: eventsError } = await supabase
                .from("sparkle_analytics")
                .select("event_type, created_at, metadata")
                .eq("sparkle_id", sparkleId)
                .gte("created_at", startDate.toISOString())
                .lte("created_at", endDate.toISOString())
                .order("created_at", { ascending: false });

            if (!eventsError && legacyEvents) {
                console.log(`[Sparkle Analytics] ✅ Found ${legacyEvents.length} events from legacy table`);
                events = legacyEvents;
            } else {
                console.error("[Sparkle Analytics] ⚠️ No events found in any table");
                events = [];
            }
        }

        // Calculate metrics within the selected date range
        const eventsList = events || [];

        // Count events by type within the date range
        // Note: 'read' event is mapped to view counts in some contexts, so check for both 'view' and 'read'
        const viewsInRange = eventsList.filter(e => e.event_type === 'view' || e.event_type === 'read').length;
        const likesInRange = eventsList.filter(e => e.event_type === 'like').length;
        const sharesInRange = eventsList.filter(e => e.event_type === 'share').length;

        // Also calculate daily stats for the "Today" column if date range includes today
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const viewsToday = eventsList.filter(e =>
            (e.event_type === 'view' || e.event_type === 'read') && new Date(e.created_at) >= oneDayAgo
        ).length;

        const viewsWeek = eventsList.filter(e =>
            (e.event_type === 'view' || e.event_type === 'read') && new Date(e.created_at) >= oneWeekAgo
        ).length;

        const viewsMonth = eventsList.filter(e =>
            (e.event_type === 'view' || e.event_type === 'read') && new Date(e.created_at) >= oneMonthAgo
        ).length;

        const likesToday = eventsList.filter(e =>
            e.event_type === 'like' && new Date(e.created_at) >= oneDayAgo
        ).length;

        const likesWeek = eventsList.filter(e =>
            e.event_type === 'like' && new Date(e.created_at) >= oneWeekAgo
        ).length;

        const likesMonth = eventsList.filter(e =>
            e.event_type === 'like' && new Date(e.created_at) >= oneMonthAgo
        ).length;

        // Calculate conversion and engagement rates
        const totalViews = sparkle.view_count || 0;
        const totalLikes = sparkle.like_count || 0;
        const totalShares = sparkle.share_count || 0;
        const totalComments = 0; // Not implemented yet

        // Calculate engagement rate: (interactions / views) * 100
        const interactions = likesInRange + sharesInRange;
        const engagementRate = viewsInRange > 0 ? (interactions / viewsInRange) * 100 : 0;

        // Calculate virality score: (shares / views) * 100 * scaling info
        const viralityScore = viewsInRange > 0 ? (sharesInRange / viewsInRange) * 100 : 0;

        // Daily stats for the selected date range (limit to 30 days for chart readability)
        const dailyStats = [];
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysToShow = Math.min(daysDiff, 30); // Max 30 days for chart

        for (let i = daysToShow - 1; i >= 0; i--) {
            const date = new Date(endDate);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const dayEvents = eventsList.filter(e => {
                const eventDate = new Date(e.created_at);
                return eventDate >= date && eventDate < nextDate;
            });

            dailyStats.push({
                date: date.toISOString().split('T')[0],
                views: dayEvents.filter(e => e.event_type === 'view' || e.event_type === 'read').length,
                likes: dayEvents.filter(e => e.event_type === 'like').length,
                shares: dayEvents.filter(e => e.event_type === 'share').length,
            });
        }

        // Last interaction
        const lastInteraction = eventsList.length > 0 ? eventsList[0].created_at : null;

        // Return complete analytics matching SparkleAnalytics interface on client
        return c.json({
            success: true,
            data: {
                sparkle_id: sparkle.id,
                title: sparkle.title,
                image_url: sparkle.image_url,
                thumbnail_url: sparkle.thumbnail_url,

                // Date range info
                date_range: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    days: daysDiff,
                },

                // Core metrics (all time)
                total_views: totalViews,
                total_likes: totalLikes,
                total_shares: totalShares,
                total_comments: totalComments,

                // Range-specific metrics
                range_views: viewsInRange,
                range_likes: likesInRange,
                range_shares: sharesInRange,

                // Time-based metrics
                views_today: viewsToday,
                views_week: viewsWeek,
                views_month: viewsMonth,
                likes_today: likesToday,
                likes_week: likesWeek,
                likes_month: likesMonth,

                // Engagement metrics
                engagement_rate: parseFloat(engagementRate.toFixed(2)),
                virality_score: parseFloat(viralityScore.toFixed(2)),

                // Time series
                daily_stats: dailyStats,

                // Timestamps
                created_at: sparkle.created_at,
                last_interaction: lastInteraction,
            },
        });
    } catch (error: any) {
        console.error("[Sparkle Analytics] Exception:", error);
        return c.json({ error: error.message }, 500);
    }
}
