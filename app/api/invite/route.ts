import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type InviteRequestBody = {
  email: string
  publisherName: string
  quoteContent: string
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const rawSecretKeys = process.env.SUPABASE_SECRET_KEYS

    let supabaseAdminKey = ''

    // Safely parse the new Supabase JSON dictionary format for secret keys
    if (rawSecretKeys) {
      try {
        const parsedKeys = JSON.parse(rawSecretKeys)
        // Extract the first available secret key value from the dictionary object
        supabaseAdminKey = Object.values(parsedKeys)[0] as string
      } catch (err) {
        // Fallback: If the JSON fails to parse because you pasted the raw token directly
        supabaseAdminKey = rawSecretKeys
      }
    }

    if (!apiKey || !supabaseUrl || !supabaseAdminKey) {
      return NextResponse.json(
        { error: 'Server authentication environment variables are missing or misconfigured.' },
        { status: 500 }
      )
    }

    const body = (await request.json()) as InviteRequestBody
    const { email, publisherName, quoteContent } = body

    if (!email || !publisherName || !quoteContent) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 })
    }

    // Initialize the Admin Supabase client using the extracted secure key
    const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const host = request.headers.get('host') || 'pinquo.app'
    const protocol = host.includes('localhost:') ? 'http' : 'https'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`

    // Generate an official, secure magic authentication link from Supabase
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${siteUrl}/setup` // Bounces them straight to onboarding once clicked
      }
    })

    if (linkError) {
      console.error('Supabase link generation failed:', linkError)
      return NextResponse.json({ error: 'Failed to pre-authenticate user.' }, { status: 500 })
    }

    // This is our single-use secure entry token url
    const secureAuthUrl = linkData.properties.action_link

    // Dispatch the email via Resend with the official link
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'PinQuo <hello@pinquo.app>',
        to: [email],
        subject: `${publisherName} just quoted you on PinQuo!`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 24px;">
            <h1 style="font-size: 24px; font-weight: 900; color: #000; margin-bottom: 8px;">PinQuo</h1>
            <p style="color: #475569; font-size: 16px; margin-bottom: 24px;">
              <strong>@${publisherName.toLowerCase()}</strong> just published a quote said by you!
            </p>
            <div style="background-color: #f8fafc; border-left: 4px solid #000; padding: 16px; margin-bottom: 28px; font-style: italic; color: #0f172a; font-size: 18px;">
              “ ${quoteContent} ”
            </div>
            <a href="${secureAuthUrl}" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 9999px; font-size: 15px;">
              Claim Your Quote!
            </a>
          </div>
        `,
      }),
    })

    if (!resendResponse.ok) return NextResponse.json({ error: 'Resend email error' }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}