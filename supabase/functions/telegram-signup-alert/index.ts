import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')
const ADMIN_URL = Deno.env.get('ADMIN_URL') || 'https://tamilkadavulmurugan.com/admin'

serve(async (req) => {
    const requestId = crypto.randomUUID()
    console.log(`[${requestId}] Function invoked`)

    try {
        const rawBody = await req.text()
        console.log(`[${requestId}] Raw body:`, rawBody)

        let payload;
        try {
            payload = JSON.parse(rawBody)
        } catch (e) {
            console.error(`[${requestId}] Failed to parse JSON:`, e.message)
            return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
        }

        const { record } = payload

        if (!record) {
            console.error(`[${requestId}] No record found in request body`)
            return new Response(JSON.stringify({ error: 'No record found' }), { status: 400 })
        }

        const { name, full_name, phone, city, device, created_at } = record
        const displayName = name || full_name || 'New User'

        // Format IST Time
        const date = new Date(created_at || new Date())
        const istTime = date.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'medium',
        })

        const message = `<b>Subject: New User Signup - ${displayName}</b>

A new user has signed up!

👤 <b>Name:</b> ${displayName}
📱 <b>Phone:</b> ${phone || 'N/A'}
📍 <b>City:</b> ${city || 'N/A'}
⏰ <b>Signup Time:</b> ${istTime}
📲 <b>Device:</b> ${device || 'N/A'}

View in admin:
${ADMIN_URL}`

        console.log(`[${requestId}] Sending Telegram notification for ${displayName}...`)

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            console.error(`[${requestId}] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing`)
            return new Response(JSON.stringify({ error: 'Config missing' }), { status: 500 })
        }

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML',
            }),
        })

        const result = await response.json()
        console.log(`[${requestId}] Telegram API response:`, result)

        if (!result.ok) {
            console.error(`[${requestId}] Telegram API error:`, result)
        }

        return new Response(JSON.stringify({ success: true, telegram_result: result }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        })
    } catch (error: any) {
        // Fail silently but log the error
        console.error(`[${requestId}] Edge Function error:`, error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        })
    }
})
