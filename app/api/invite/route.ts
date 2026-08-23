import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type InviteRequestBody = {
  email: string
  quoteContent: string
}

export async function POST(request: Request) {
  try {

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Resend API key missing.' }, { status: 500 })

    const body = (await request.json()) as InviteRequestBody
    const { email, quoteContent } = body

    if (!email || !quoteContent) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    const publisherName = profile?.username || 'Someone'

    const host = request.headers.get('host') || 'pinquo.app'
    const protocol = host.includes('localhost:') ? 'http' : 'https'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'PinQuo <hello@pinquo.app>',
        to: [email],
        subject: `✨ ${publisherName} just quoted you on PinQuo!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #0f172a; padding: 40px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px;">PinQuo</h1>
              <p style="color: #94a3b8; font-size: 16px; margin-top: 8px; font-weight: 500;">The Platform for Memorable Quotes</p>
            </div>
            <div style="padding: 40px 32px;">
              <p style="font-size: 18px; color: #334155; margin-top: 0; font-weight: 600;">Someone is talking about you.</p>
              <p style="font-size: 16px; color: #475569; line-height: 1.6;"><strong>@${publisherName.toLowerCase()}</strong> Immortalized something you said on PinQuo!</p>
              
              <div style="margin: 32px 0; padding: 24px; background-color: #f8fafc; border-left: 4px solid #10b981; border-radius: 0 16px 16px 0;">
                <p style="font-size: 20px; font-style: italic; color: #0f172a; margin: 0; font-weight: 500;">“${quoteContent}”</p>
              </div>
              
              <p style="font-size: 15px; color: #64748b; margin-bottom: 32px;">See all comments, reactions and laughter at PinQuo.</p>
              
              <div style="text-align: center;">
                <a href="${siteUrl}" style="background-color: #10b981; color: #ffffff; padding: 16px 36px; border-radius: 9999px; text-decoration: none; font-weight: 800; font-size: 16px; display: inline-block; letter-spacing: 0.5px;">Create Account</a>
              </div>
            </div>
          </div>
        `,
      }),
    })

    if (!resendResponse.ok) return NextResponse.json({ error: 'Resend error' }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}