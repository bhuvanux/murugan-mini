
const { createClient } = require('@supabase/supabase-js');

const projectId = "lnherrwzjtemrvzahppg";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaGVycnd6anRlbXJ2emFocHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTkyNTksImV4cCI6MjA3OTU3NTI1OX0.Okhete2Bda3oXFVjh8-Xg5Xt-Rd_I1nwcq0kapJuAuI";

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

async function testRpcV2() {
    console.log("Testing track_analytics_event_v2 RPC...");

    // Use a VALID UUID for item_id (Mocking a wallpaper ID)
    const testId = "00000000-0000-0000-0000-000000000001";
    // Use a VALID UUID for user_id
    const userId = "00000000-0000-0000-0000-000000000002";

    // Payload matching the V2 signature AND Constraints
    const payload = {
        p_module_name: "wallpaper", // Must be a valid module
        p_item_id: testId,
        p_event_type: "view",       // Must be a valid event type
        p_ip_address: "127.0.0.1",
        p_user_agent: "Node Diagnostic V2",
        p_device_type: "bot",
        p_metadata: { source: "script_v2_valid" },
        p_user_id: userId
    };

    try {
        const { data, error } = await supabase.rpc("track_analytics_event_v2", payload);

        if (error) {
            console.error("❌ RPC V2 Call Failed:", error);
        } else {
            console.log("✅ RPC V2 Call Success!", data);

            // Check if it inserted
            console.log("Checking DB for insertion...");
            // Note: 'view' events might be debounced (returned success but no new insert if 24h).
            // Check the returned data to see if 'tracked' is true.
            if (data && data.length > 0 && data[0].tracked) {
                console.log("✅ Event was TRACKED (Inserted).");
            } else if (data && data.length > 0 && data[0].already_tracked) {
                console.log("✅ Event was recognized (Already Tracked logic works).");
            }

            // Let's force a 'like' event to avoid 24h debounce for views if run multiple times
            const payloadLike = { ...payload, p_event_type: 'like' };
            console.log("Testing 'like' event...");
            const { data: likeData, error: likeError } = await supabase.rpc("track_analytics_event_v2", payloadLike);
            if (likeError) {
                console.error("❌ Like Event Failed:", likeError);
            } else {
                console.log("✅ LIKE Event Success!", likeData);

                // Cleanup if possible (though we can't delete easily without RLS)
                // But at least we confirmed Insert works.
            }
        }

    } catch (e) {
        console.error("❌ Unexpected Error:", e);
    }
}

testRpcV2();
