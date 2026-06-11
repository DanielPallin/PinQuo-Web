import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    // Aggressively hunt for the admin key, checking modern JSON, modern strings, and legacy formats
    const rawSecretKeys = process.env.SUPABASE_SECRET_KEYS || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    let supabaseAdminKey = ''

    if (rawSecretKeys) {
        try {
          const parsedKeys = JSON.parse(rawSecretKeys)
          supabaseAdminKey = Object.values(parsedKeys)[0] as string
        } catch (err) {
          // Because your key is a plain string, it safely lands right here!
          supabaseAdminKey = rawSecretKeys
        }
      }

    if (!apiKey || !supabaseUrl || !supabaseAdminKey) {
      return NextResponse.json({ error: 'Server authentication configuration missing.' }, { status: 500 })
    }

    const { quoterUsername, quotedUsername, quoteContent } = await request.json()

    if (!quoterUsername || !quotedUsername || !quoteContent) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 })
    }

    // Initialize the Admin Client to bypass Row Level Security
    const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Find the target user's profile ID
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', quotedUsername.toLowerCase())
      .single()

    // If the user doesn't exist, exit quietly (maybe they quoted a non-user)
    if (profileError || !profileData) {
      return NextResponse.json({ message: 'Target user not found, skipping email.' }, { status: 200 })
    }

    // Securely fetch their private email address from the hidden auth schema
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profileData.id)

    if (userError || !userData.user?.email) {
      return NextResponse.json({ error: 'Target email not found.' }, { status: 404 })
    }

    const targetEmail = userData.user.email

    // Dispatch the notification via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'PinQuo <hello@pinquo.app>',
        to: [targetEmail],
        subject: "Someone quoted you on PinQuo!",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 24px;">
            <h1 style="font-size: 24px; font-weight: 900; color: #000; margin-bottom: 8px;">PinQuo</h1>
            <p style="color: #475569; font-size: 16px; margin-bottom: 24px;">
              <strong>@${quoterUsername}</strong> just quoted you!
            </p>
            <a href="https://pinquo.app/feed" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 9999px; font-size: 15px;">
              View on PinQuo
            </a>
          </div>
        `,
      }),
    })

    if (!resendResponse.ok) return NextResponse.json({ error: 'Resend error' }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}