import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const reqBody = await req.json()
        const { phone } = reqBody
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 0. Check if user exists and log start
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('phone', phone)
            .maybeSingle()

        const metadata = (reqBody.metadata || {}) as any
        const city = reqBody.city || metadata.city || null
        const carrier = reqBody.carrier || metadata.carrier || null
        const device_id = reqBody.device_id || metadata.device_id || null
        const ip_address = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || null

        const { error: logStartError } = await supabase.from('auth_events').insert({
            user_id: existingUser?.id,
            event_type: existingUser ? 'auth_login_attempt' : 'auth_signup_started',
            device_id,
            ip_address,
            city,
            carrier,
            metadata: { phone }
        })

        if (logStartError) console.error('[send-otp] Failed to log start event:', logStartError)

        // 1. Save to database
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 mins
        const { error: upsertError } = await supabase.from('otp_sessions').upsert({
            phone,
            otp_code: otpCode,
            expires_at: expiresAt,
            attempts: 0
        }, { onConflict: 'phone' })

        if (upsertError) throw upsertError

        // 2. Call Fast2SMS WhatsApp API
        const FAST2SMS_KEY = Deno.env.get('FAST2SMS_KEY')
        const PHONE_NUMBER_ID = Deno.env.get('PHONE_NUMBER_ID')

        if (!FAST2SMS_KEY || !PHONE_NUMBER_ID) {
            throw new Error("Missing Fast2SMS configuration")
        }

        const payload = {
            messaging_product: "whatsapp",
            to: phone.startsWith('+') ? phone.slice(1) : phone, // Format as 91xxxxxxxxxx
            type: "template",
            template: {
                name: "otp_template",
                language: { code: "en" },
                components: [
                    { type: "body", parameters: [{ type: "text", text: otpCode }] },
                    { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: otpCode }] }
                ]
            }
        }

        console.log('[Fast2SMS Request Payload]:', JSON.stringify(payload, null, 2))

        const startTime = Date.now()

        const response = await fetch(`https://www.fast2sms.com/dev/whatsapp/v24.0/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'authorization': FAST2SMS_KEY!,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const result = await response.json()
        console.log('[Fast2SMS Response]:', result)

        if (!response.ok) {
            console.error('[Fast2SMS Error Details]:', result)

            await supabase.from('auth_events').insert({
                user_id: existingUser?.id,
                event_type: 'auth_otp_failed',
                device_id,
                ip_address,
                city,
                carrier,
                metadata: {
                    phone,
                    error: "Fast2SMS API Error",
                    details: result
                }
            })

            return new Response(JSON.stringify({
                success: false,
                error: result.error?.message || result.message || "Fast2SMS API Error",
                details: result
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200 // Return 200 to let client read the body
            })
        }

        const endTime = Date.now()
        const deliveryTime = (endTime - startTime) / 1000

        await supabase.from('auth_events').insert({
            user_id: existingUser?.id,
            event_type: 'auth_otp_sent',
            device_id,
            ip_address,
            city,
            carrier,
            metadata: {
                phone,
                delivery_time_seconds: deliveryTime,
                fast2sms_result: result
            }
        })

        return new Response(JSON.stringify({ success: true, ...result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        })
    } catch (error: any) {
        console.error('[Edge Function Catch]:', error)
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        })
    }
})
