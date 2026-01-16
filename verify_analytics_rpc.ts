
import { createClient } from "npm:@supabase/supabase-js@2";
import { config } from "npm:dotenv";

// Load env vars
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://lnherrwzjtemrvzahppg.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY; // Using Anon key as frontend does

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testRpc() {
    console.log("Testing track_analytics_event RPC...");

    const testId = "test-" + Date.now();

    // Payload matching the NEW signature (8 args, but passed as object)
    const payload = {
        p_module_name: "diagnostic",
        p_item_id: testId,
        p_event_type: "test_rpc_call",
        p_ip_address: "127.0.0.1",
        p_user_agent: "Diagnostic Script",
        p_device_type: "bot",
        p_metadata: { source: "script" },
        p_user_id: null // explicitly null
    };

    try {
        const { data, error } = await supabase.rpc("track_analytics_event", payload);

        if (error) {
            console.error("❌ RPC Call Failed:", error);
            console.error("Error Details:", JSON.stringify(error, null, 2));
        } else {
            console.log("✅ RPC Call Success!", data);
        }

    } catch (e) {
        console.error("❌ Unexpected Error:", e);
    }
}

async function checkTable() {
    console.log("Checking analytics_tracking table for recent events...");
    const { data, error } = await supabase
        .from('analytics_tracking')
        .select('*')
        .eq('module_name', 'diagnostic')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("❌ Table Check Failed:", error);
    } else {
        console.log("Found rows:", data?.length);
        console.table(data);
    }
}

async function main() {
    await testRpc();
    await checkTable();
}

main();
