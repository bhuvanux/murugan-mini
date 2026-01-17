import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Razorpay from 'https://esm.sh/razorpay@2.9.2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user } } = await supabaseClient.auth.getUser()

        if (!user) {
            throw new Error('User not found')
        }

        const { planId = 'gugan' } = await req.json()

        // 1. Fetch Plan Details
        const { data: configData, error: configError } = await supabaseClient
            .from('app_config')
            .select('value')
            .eq('key', `subscription_plan_${planId}`)
            .single()

        if (configError || !configData) {
            throw new Error('Invalid plan selected')
        }

        const plan = configData.value
        const amountInPaise = plan.price * 100

        // 2. Initialize Razorpay (Mock if keys missing for dev)
        const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

        let orderId = `order_${Date.now()}_mock`
        let providerPaymentId = null

        if (razorpayKeyId && razorpayKeySecret) {
            const instance = new Razorpay({
                key_id: razorpayKeyId,
                key_secret: razorpayKeySecret,
            })

            const order = await instance.orders.create({
                amount: amountInPaise,
                currency: plan.currency || "INR",
                receipt: `receipt_${user.id.slice(0, 8)}_${Date.now()}`,
                notes: {
                    user_id: user.id,
                    plan_id: planId
                }
            })
            orderId = order.id
        } else {
            console.log("⚠️ RAZORPAY KEYS MISSING - USING MOCK ORDER ID")
        }

        // 3. Create Record in DB
        const { data: paymentData, error: insertError } = await supabaseClient
            .from('payments')
            .insert({
                user_id: user.id,
                amount: plan.price,
                currency: plan.currency || 'INR',
                provider_order_id: orderId,
                status: 'pending',
                plan_id: planId,
                metadata: { plan_details: plan }
            })
            .select()
            .single()

        if (insertError) {
            throw insertError
        }

        return new Response(
            JSON.stringify({
                orderId,
                amount: amountInPaise,
                currency: plan.currency || "INR",
                key: razorpayKeyId, // Send key to frontend
                user_email: user.email,
                user_phone: user.phone
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
