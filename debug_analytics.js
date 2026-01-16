
const { createClient } = require('@supabase/supabase-js');

const projectId = "lnherrwzjtemrvzahppg";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaGVycnd6anRlbXJ2emFocHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTkyNTksImV4cCI6MjA3OTU3NTI1OX0.Okhete2Bda3oXFVjh8-Xg5Xt-Rd_I1nwcq0kapJuAuI";

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

async function checkAnalytics() {
    console.log("=== Checking auth_events table ===");
    const { data: authEvents, error: authError } = await supabase
        .from('auth_events')
        .select('event_type, event_time')
        .order('event_time', { ascending: false })
        .limit(100);

    if (authError) {
        console.error("❌ Error fetching auth_events:", authError);
    } else {
        console.log(`✅ Found ${authEvents.length} recent auth events.`);
        const counts = {};
        authEvents.forEach((e) => {
            counts[e.event_type] = (counts[e.event_type] || 0) + 1;
        });
        console.log("Event distribution:", counts);
        if (authEvents.length > 0) {
            console.log("Latest event time:", authEvents[0].event_time);
        }
    }

    console.log("\n=== Checking analytics_tracking table ===");
    const { data: trackerEvents, error: trackerError } = await supabase
        .from('analytics_tracking')
        .select('event_type, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

    if (trackerError) {
        console.error("❌ Error fetching analytics_tracking:", trackerError);
    } else {
        console.log(`✅ Found ${trackerEvents.length} recent tracker events.`);
        const counts = {};
        trackerEvents.forEach((e) => {
            counts[e.event_type] = (counts[e.event_type] || 0) + 1;
        });
        console.log("Event distribution:", counts);
    }

    // Check for today
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const { count: todayCount } = await supabase
        .from('auth_events')
        .select('*', { count: 'exact', head: true })
        .gte('event_time', todayStr);

    console.log(`\nEvents since ${todayStr} (UTC): ${todayCount}`);
}

checkAnalytics();
