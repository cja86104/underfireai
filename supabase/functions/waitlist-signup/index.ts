// ============================================
// Supabase Edge Function: waitlist-signup
// Path: supabase/functions/waitlist-signup/index.ts
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── CORS headers (allows your Hostinger site to call this) ──
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://underfireai.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// ── Send email via Hostinger SMTP ──
async function sendEmail(to: string, subject: string, html: string) {
  const SMTP_HOST = Deno.env.get('SMTP_HOST') ?? 'smtp.hostinger.com'
  const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') ?? '465')
  const SMTP_USER = Deno.env.get('SMTP_USER') ?? ''       // hello@underfireai.com
  const SMTP_PASS = Deno.env.get('SMTP_PASS') ?? ''       // your email password
  const FROM_NAME = 'UnderFireAI'
  const FROM_EMAIL = SMTP_USER

  // Use Deno SMTP library
  const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: true,
      auth: {
        username: SMTP_USER,
        password: SMTP_PASS,
      },
    },
  })

  await client.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  })

  await client.close()
}

// ── Email templates ──
function confirmationEmail(email: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { margin:0; padding:0; background:#09010a; font-family:'Helvetica Neue',Arial,sans-serif; }
    .wrap { max-width:560px; margin:0 auto; padding:40px 20px; }
    .logo { font-size:28px; font-weight:900; letter-spacing:3px; text-transform:uppercase; color:#fff; margin-bottom:32px; }
    .logo span { color:#fb923c; }
    .card { background:rgba(255,255,255,0.04); border:1px solid rgba(251,146,60,0.15); border-radius:16px; padding:40px; }
    h1 { font-size:28px; font-weight:800; color:#fff; margin:0 0 12px; }
    p { font-size:16px; color:rgba(255,255,255,0.75); line-height:1.7; margin:0 0 16px; }
    .fire { font-size:48px; margin-bottom:20px; display:block; }
    .badge { display:inline-block; background:rgba(234,88,12,0.15); border:1px solid rgba(234,88,12,0.3); color:#fb923c; font-size:13px; font-weight:600; padding:6px 16px; border-radius:6px; margin-bottom:24px; letter-spacing:1px; text-transform:uppercase; }
    .footer { margin-top:32px; font-size:13px; color:rgba(255,255,255,0.3); text-align:center; }
    .footer a { color:#fb923c; text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">UnderFire<span>AI</span></div>
    <div class="card">
      <span class="fire">🔥</span>
      <div class="badge">You're on the list</div>
      <h1>Welcome to the fire.</h1>
      <p>You're officially on the UnderFireAI waitlist. We'll notify you the moment we launch.</p>
      <p>While you wait — think about the last interview that caught you off guard. The interviewer who went silent. The follow-up you didn't see coming. The one that got away.</p>
      <p><strong style="color:#fff;">That's exactly what we're training you for.</strong></p>
      <p>See you on the other side,<br/><strong style="color:#fb923c;">The UnderFireAI Team</strong></p>
    </div>
    <div class="footer">
      <p>You signed up at <a href="https://underfireai.com">underfireai.com</a><br/>
      Built by <a href="https://allencodeco.com">Allen Code Co.</a></p>
    </div>
  </div>
</body>
</html>
  `
}

function notificationEmail(email: string, count: number): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;">
    <h2 style="color:#ea580c;margin:0 0 16px;">🔥 New Waitlist Signup</h2>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Total signups:</strong> ${count}</p>
    <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
  </div>
</body>
</html>
  `
}

// ── Main handler ──
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // ── GET /waitlist-signup/count ──
  if (req.method === 'GET' && url.pathname.endsWith('/count')) {
    const { data, error } = await supabase.rpc('get_waitlist_count')
    if (error) return new Response(JSON.stringify({ count: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    return new Response(JSON.stringify({ count: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // ── POST /waitlist-signup ──
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const email = (body.email ?? '').toLowerCase().trim()
      const source = body.source ?? 'landing_page'
      const referrer = body.referrer ?? ''

      // Basic validation
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return new Response(JSON.stringify({ error: 'Invalid email' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Insert into DB
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert({ email, source, referrer })

      // Handle duplicate
      if (insertError?.code === '23505') {
        return new Response(JSON.stringify({ message: 'duplicate' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (insertError) throw insertError

      // Get updated count
      const { data: countData } = await supabase.rpc('get_waitlist_count')
      const count = countData ?? 0

      // Send emails (don't let email failures break the signup)
      try {
        await sendEmail(email, '🔥 You\'re on the UnderFireAI waitlist', confirmationEmail(email))
        await sendEmail(
          Deno.env.get('NOTIFY_EMAIL') ?? 'hello@underfireai.com',
          `🔥 New waitlist signup — ${email}`,
          notificationEmail(email, count)
        )
      } catch (emailErr) {
        console.error('Email send failed:', emailErr)
        // Don't fail the request — email is best-effort
      }

      return new Response(JSON.stringify({ success: true, count }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (err) {
      console.error('Signup error:', err)
      return new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response('Not found', { status: 404, headers: corsHeaders })
})
