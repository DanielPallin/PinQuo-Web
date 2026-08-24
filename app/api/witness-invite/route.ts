import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

type WitnessTarget = {
  type: 'user' | 'email'
  value: string // user UUID or email string
}

type WitnessInviteBody = {
  witnesses: WitnessTarget[]
  publisherName: string
  quoteContent: string
}

export async function POST(request: Request) {
  try {
    const supabaseServer = await createServerClient()
    const { data: { user } } = await supabaseServer.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.RESEND_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const rawSecretKeys = process.env.SUPABASE_SECRET_KEYS || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    let supabaseAdminKey = ''
    if (rawSecretKeys) {
      try {
        const parsedKeys = JSON.parse(rawSecretKeys)
        supabaseAdminKey = Object.values(parsedKeys)[0] as string
      } catch (err) {
        supabaseAdminKey = rawSecretKeys
      }
    }

    if (!apiKey || !supabaseUrl || !supabaseAdminKey) {
      return NextResponse.json({ error: 'Server authentication configuration missing.' }, { status: 500 })
    }

    const { witnesses, publisherName, quoteContent } = (await request.json()) as WitnessInviteBody

    if (!witnesses || !Array.isArray(witnesses) || witnesses.length === 0) {
      return NextResponse.json({ error: 'Missing witnesses array.' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseAdminKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Resolve all target email addresses (both direct emails and user IDs)
    const targetEmails: string[] = []

    for (const w of witnesses) {
      if (w.type === 'email') {
        targetEmails.push(w.value)
      } else if (w.type === 'user') {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(w.value)
        if (userData.user?.email) {
          targetEmails.push(userData.user.email)
        }
      }
    }

    if (targetEmails.length === 0) {
      return NextResponse.json({ success: true, message: 'No valid emails found to notify.' }, { status: 200 })
    }

    const host = request.headers.get('host') || 'pinquo.app'
    const protocol = host.includes('localhost:') ? 'http' : 'https'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`

    // Dispatch emails individually for privacy (BCC style equivalent)
    const emailPromises = targetEmails.map(email => 
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'PinQuo <hello@pinquo.app>',
          to: [email],
          subject: `🕵️ @${publisherName} called you as a witness!`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
              <div style="background-color: #0f172a; padding: 40px 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px;">PinQuo</h1>
                <p style="color: #94a3b8; font-size: 16px; margin-top: 8px; font-weight: 500;">The platform for memorable Quotes</p>
              </div>
              <div style="padding: 40px 32px;">
                <p style="font-size: 18px; color: #334155; margin-top: 0; font-weight: 600;">Someone claims you were there.</p>
                <p style="font-size: 16px; color: #475569; line-height: 1.6;"><strong>@${publisherName.toLowerCase()}</strong> just called you a witness to verify a Quote:</p>
                
                <div style="margin: 32px 0; padding: 24px; background-color: #f8fafc; border-left: 4px solid #10b981; border-radius: 0 16px 16px 0;">
                  <p style="font-size: 20px; font-style: italic; color: #0f172a; margin: 0; font-weight: 500;">“${quoteContent}”</p>
                </div>
                
                <p style="font-size: 15px; color: #64748b; margin-bottom: 32px;">Did this really happen?. Log in to Confirm or Deny this quote.</p>
                
                <div style="text-align: center;">
                  <a href="${siteUrl}/feed" style="background-color: #10b981; color: #ffffff; padding: 16px 36px; border-radius: 9999px; text-decoration: none; font-weight: 800; font-size: 16px; display: inline-block; letter-spacing: 0.5px;">Vote Now</a>
                </div>
              </div>
            </div>
          `,
        }),
      })
    )

    await Promise.all(emailPromises)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Witness email error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}