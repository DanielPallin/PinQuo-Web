import { NextResponse } from 'next/server'

type InviteRequestBody = {
  email: string
  publisherName: string
  quoteContent: string
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Resend API key missing.' }, { status: 500 })

    const body = (await request.json()) as InviteRequestBody
    const { email, publisherName, quoteContent } = body

    if (!email || !publisherName || !quoteContent) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 })
    }

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
            <a href="${siteUrl}" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 9999px; font-size: 15px;">
              Join PinQuo!
            </a>
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