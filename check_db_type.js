
const { createClient } = require('@supabase/supabase-js');

const projectId = "lnherrwzjtemrvzahppg";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaGVycnd6anRlbXJ2emFocHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTkyNTksImV4cCI6MjA3OTU3NTI1OX0.Okhete2Bda3oXFVjh8-Xg5Xt-Rd_I1nwcq0kapJuAuI";

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

async function checkType() {
    console.log("Checking analytics_tracking.user_id type...");

    // Try to insert a row with a NON-UUID string for user_id
    const testId = "test-type-" + Date.now();
    const nonUuid = "not-a-uuid-string";

    const { error } = await supabase.from('analytics_tracking').insert({
        module_name: 'diagnostic',
        item_id: testId,
        event_type: 'type_check',
        user_id: nonUuid, // If column is UUID, this will fail
        ip_address: '127.0.0.1'
    });

    if (error) {
        if (error.message.includes("invalid input syntax for type uuid")) {
            console.log("RESULT: user_id column IS type UUID.");
        } else {
            console.log("RESULT: Insert error:", error.message);
            // Could be other error, but likely types.
        }
    } else {
        console.log("RESULT: user_id column IS type TEXT (Insert succeeded with non-UUID string).");

        // Clean up
        await supabase.from('analytics_tracking').delete().eq('item_id', testId);
    }
}

checkType();
