import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

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

    const { quotedUsername, quoteContent } = await request.json()

    if (!quotedUsername || !quoteContent) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 })
    }

    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    const quoterUsername = profile?.username

    if (!quoterUsername) {
      return NextResponse.json({ error: 'Publisher profile invalid.' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseAdminKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', quotedUsername.toLowerCase())
      .single()

    if (profileError || !profileData) {
      return NextResponse.json({ message: 'Target user not found, skipping email.' }, { status: 200 })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profileData.id)

    if (userError || !userData.user?.email) {
      return NextResponse.json({ error: 'Target email not found.' }, { status: 404 })
    }

    const targetEmail = userData.user.email

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