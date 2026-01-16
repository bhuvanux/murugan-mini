
import { createClient } from '@supabase/supabase-js';

// Hardcoding for script simplicity
const projectId = "lnherrwzjtemrvzahppg";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaGVycnd6anRlbXJ2emFocHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTkyNTksImV4cCI6MjA3OTU3NTI1OX0.Okhete2Bda3oXFVjh8-Xg5Xt-Rd_I1nwcq0kapJuAuI";

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

async function checkAnalytics() {
    console.log("Checking analytics_tracking table for recent events...");

    // 1. Fetch latest 20 events
    const { data: events, error } = await supabase
        .from('analytics_tracking')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("❌ Error fetching analytics:", error);
        return;
    }

    console.log(`✅ Found ${events.length} recent events.`);
    if (events.length > 0) {
        console.log("Latest event:", JSON.stringify(events[0], null, 2));

        // Group by event type to see what we have
        const counts = {};
        events.forEach(e => {
            counts[e.event_type] = (counts[e.event_type] || 0) + 1;
        });
        console.log("Event distribution (last 20):", counts);
    } else {
        console.log("⚠️ No events found! Tracking is not reaching the database.");
    }
}

checkAnalytics();
