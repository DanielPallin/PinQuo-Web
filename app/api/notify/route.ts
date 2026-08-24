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
        subject: `🔥 @${quoterUsername} Quoted you!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
            <div style="padding: 40px 32px; text-align: center;">
              <h1 style="color: #0f172a; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px;">PinQuo</h1>
              
              <div style="margin: 32px 0;">
                <p style="font-size: 18px; color: #475569; line-height: 1.6; margin: 0;">
                  <strong>@${quoterUsername}</strong> just Immortalized something you said. 
                </p>
              </div>

              <div style="margin: 32px 0; padding: 24px; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 0 16px 16px 0; text-align: left;">
                <p style="font-size: 20px; font-style: italic; color: #0f172a; margin: 0; font-weight: 500;">“${quoteContent}”</p>
              </div>
              
              <div style="margin-top: 40px;">
                <a href="https://pinquo.app/feed" style="background-color: #0f172a; color: #ffffff; padding: 16px 36px; border-radius: 9999px; text-decoration: none; font-weight: 800; font-size: 16px; display: inline-block;">Check it out</a>
              </div>
            </div>
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