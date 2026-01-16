
import { createClient } from 'npm:@supabase/supabase-js@2.39.7'
import { JWT } from 'npm:google-auth-library@9.7.0'

// Define CORS headers centrally
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

console.log("Hello from send-push!")

Deno.serve(async (req) => {
    // Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Basic verification of payload
        const bodyText = await req.text();
        if (!bodyText) {
            throw new Error("Missing request body");
        }
        const { title, body, targetType } = JSON.parse(bodyText);

        console.log(`Sending notification: ${title}`);

        // Create Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Missing Supabase Environment Variables");
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Fetch Tokens
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('fcm_token')
            .not('fcm_token', 'is', null)

        if (userError) throw userError

        if (!users || users.length === 0) {
            console.log("No users found with tokens");
            return new Response(
                JSON.stringify({ message: 'No registered devices found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Filter valid tokens
        const tokens = users.map(u => u.fcm_token).filter(t => t && t.length > 10)
        const uniqueTokens = [...new Set(tokens)]

        console.log(`Found ${uniqueTokens.length} unique tokens`);

        // 2. Authenticate with Service Account from Secret
        let serviceAccount;
        try {
            const jsonString = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
            if (!jsonString) {
                throw new Error("Missing FIREBASE_SERVICE_ACCOUNT secret.");
            }
            serviceAccount = JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT", e);
            throw new Error("Server Error: Invalid FIREBASE_SERVICE_ACCOUNT secret.");
        }

        const client = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });

        const context = await client.authorize();
        const accessToken = context.access_token;

        // 3. Send to FCM (V1 API)
        const results = []
        const BATCH_SIZE = 5; // Conservative batch size

        for (let i = 0; i < uniqueTokens.length; i += BATCH_SIZE) {
            const batch = uniqueTokens.slice(i, i + BATCH_SIZE);
            const promises = batch.map(token =>
                fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: {
                            token: token,
                            notification: {
                                title: title,
                                body: body
                            },
                            android: {
                                notification: {
                                    sound: "default",
                                    click_action: "FLUTTER_NOTIFICATION_CLICK"
                                }
                            }
                        }
                    })
                }).then(res => res.json())
            );

            const batchResults = await Promise.all(promises);
            results.push(...batchResults);
        }

        return new Response(
            JSON.stringify({ success: true, sent_count: results.length, details: results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error("Error in function:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
