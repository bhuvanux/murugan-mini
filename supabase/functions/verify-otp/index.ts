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
        const { phone, code } = reqBody

        const metadata = (reqBody.metadata || {}) as any
        const city = reqBody.city || metadata.city || null
        const carrier = reqBody.carrier || metadata.carrier || null
        const device_id = reqBody.device_id || metadata.device_id || null
        const ip_address = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || null

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Check session
        const { data: session, error } = await supabase
            .from('otp_sessions')
            .select('*')
            .eq('phone', phone)
            .single()

        if (error || !session) {
            console.error('[Verify OTP] No session found for:', phone)

            await supabase.from('auth_events').insert({
                event_type: 'auth_otp_failed',
                device_id,
                ip_address,
                city,
                carrier,
                metadata: { phone, error: "No OTP session found" }
            })

            return new Response(JSON.stringify({ success: false, error: "No OTP session found. Please request a new OTP." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200
            })
        }

        if (session.otp_code !== code) {
            console.error('[Verify OTP] Invalid code:', { expected: session.otp_code, received: code })

            await supabase.from('auth_events').insert({
                event_type: 'auth_otp_failed',
                device_id,
                ip_address,
                city,
                carrier,
                metadata: { phone, error: "Invalid OTP code" }
            })

            return new Response(JSON.stringify({ success: false, error: "Invalid OTP code" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200
            })
        }

        if (new Date(session.expires_at) < new Date()) {
            console.error('[Verify OTP] Expired session')

            await supabase.from('auth_events').insert({
                event_type: 'auth_otp_failed',
                device_id,
                ip_address,
                city,
                carrier,
                metadata: { phone, error: "OTP has expired" }
            })

            return new Response(JSON.stringify({ success: false, error: "OTP has expired. Please request a new one." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200
            })
        }

        // 2. Success - Cleanup
        await supabase.from('otp_sessions').delete().eq('phone', phone)


        // 4. Upsert User into public.users
        const fullName = metadata.full_name || null
        // city and metadata are already declared at the top

        // Check if user exists first to determine if it's a signup
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('phone', phone)
            .maybeSingle()

        const isSignup = !existingUser

        // Perform Upsert
        const { error: userError } = await supabase.from('users').upsert({
            phone,
            ...(fullName ? { full_name: fullName } : {}),
            ...(city ? { city: city } : {}),
            last_login_at: new Date().toISOString()
        }, { onConflict: 'phone' })

        if (userError) {
            console.error('[Verify OTP] User upsert failed:', userError)
        } else {
            console.log('[Verify OTP] User upsert successful for:', phone)
        }

        // 5. Log Success Events & Fetch Full Profile
        const { data: newUser } = await supabase
            .from('users')
            .select('id, city, full_name, name')
            .eq('phone', phone)
            .single()

        const { error: eventsError } = await supabase.from('auth_events').insert([
            {
                user_id: newUser?.id,
                event_type: 'auth_otp_verified',
                device_id,
                ip_address,
                city,
                carrier,
                metadata: { phone }
            },
            {
                user_id: newUser?.id,
                event_type: isSignup ? 'auth_signup_completed' : 'auth_login_success',
                device_id,
                ip_address,
                city,
                carrier,
                metadata: { phone }
            },
            {
                user_id: newUser?.id,
                event_type: 'auth_session_started',
                device_id,
                ip_address,
                city,
                carrier,
                metadata: { phone }
            }
        ])

        if (eventsError) {
            console.error('[Verify OTP] Failed to log events:', eventsError)
        } else {
            console.log('[Verify OTP] Successfully logged auth events for:', phone)
        }

        return new Response(JSON.stringify({
            success: true,
            message: "OTP Verified Successfully",
            is_signup: isSignup,
            user: {
                id: newUser?.id,
                aud: 'authenticated',
                role: 'authenticated',
                phone: phone,
                user_metadata: {
                    city: newUser?.city || city,
                    full_name: newUser?.full_name || newUser?.name || fullName
                }
            }
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        })
    } catch (error: any) {
        console.error('[Verify OTP] Unexpected error:', error)
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        })
    }
})
