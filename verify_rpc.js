
const { createClient } = require('@supabase/supabase-js');

// Hardcoding for script simplicity
const projectId = "lnherrwzjtemrvzahppg";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaGVycnd6anRlbXJ2emFocHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTkyNTksImV4cCI6MjA3OTU3NTI1OX0.Okhete2Bda3oXFVjh8-Xg5Xt-Rd_I1nwcq0kapJuAuI";

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

async function testRpc() {
    console.log("Testing track_analytics_event RPC...");

    const testId = "test-" + Date.now();

    // Payload matching the NEW signature (8 args)
    const payload = {
        p_module_name: "diagnostic",
        p_item_id: testId,
        p_event_type: "test_rpc_call",
        p_ip_address: "127.0.0.1",
        p_user_agent: "Node Diagnostic",
        p_device_type: "bot",
        p_metadata: { source: "script" },
        p_user_id: null
    };

    try {
        const { data, error } = await supabase.rpc("track_analytics_event", payload);

        if (error) {
            console.error("❌ RPC Call Failed:", error);
            // Common error for ambiguity: "function track_analytics_event(...) is not unique"
        } else {
            console.log("✅ RPC Call Success!", data);
        }

    } catch (e) {
        console.error("❌ Unexpected Error:", e);
    }
}

testRpc();
