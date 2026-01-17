import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import crypto from "https://deno.land/std@0.168.0/node/crypto.ts";

serve(async (req) => {
    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // IMPORTANT: Use Service Role for Updates
        )

        const signature = req.headers.get("x-razorpay-signature");
        const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
        const bodyText = await req.text();

        // 1. Verify Signature (Skip if no secret, for dev)
        if (webhookSecret && signature) {
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(bodyText)
                .digest("hex");

            if (expectedSignature !== signature) {
                throw new Error("Invalid signature");
            }
        } else {
            console.log("⚠️ WEBHOOK SECRET MISSING - SKIPPING SIGNATURE VERIFICATION")
        }

        const payload = JSON.parse(bodyText);
        const { event, payload: data } = payload;

        if (event === "payment.captured") {
            const payment = data.payment.entity;
            const orderId = payment.order_id;
            const userId = payment.notes?.user_id; // Setup notes in create-order

            // 2. Update Payment Status in DB
            // We find by provider_order_id if we have it, or we rely on notes logic if we can
            // But better to verify order_id matches

            // Find the payment record
            const { data: paymentRecord, error: fetchError } = await supabaseClient
                .from('payments')
                .select('*')
                .eq('provider_order_id', orderId)
                .single()

            if (paymentRecord) {
                await supabaseClient
                    .from('payments')
                    .update({
                        status: 'success',
                        provider_payment_id: payment.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', paymentRecord.id)

                // 3. Update User Subscription
                // Calculate expiry (e.g., +30 days)
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 30); // Hardcoded 30 days for Gugan plan for now

                await supabaseClient
                    .from('users')
                    .update({
                        is_premium: true,
                        plan_type: paymentRecord.plan_id || 'gugan',
                        subscription_end_date: expiryDate.toISOString()
                    })
                    .eq('id', paymentRecord.user_id)

                console.log(`✅ Subscription activated for user ${paymentRecord.user_id}`)
            } else {
                console.error(`❌ Payment record not found for order ${orderId}`)
            }
        } else if (event === "payment.failed") {
            // Handle failure...
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        )
    }
})
