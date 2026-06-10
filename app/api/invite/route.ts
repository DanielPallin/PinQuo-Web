import { NextResponse } from 'next/server'

type InviteRequestBody = {
  email: string
  publisherName: string
  quoteContent: string
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Resend API key is missing on the server.' },
        { status: 500 }
      )
    }

    const body = (await request.json()) as InviteRequestBody
    const { email, publisherName, quoteContent } = body

    if (!email || !publisherName || !quoteContent) {
      return NextResponse.json(
        { error: 'Missing required validation fields.' },
        { status: 400 }
      )
    }

    // Determine target origin dynamically based on environment, defaulting to your production domain
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pinquo.app'
    const signupUrl = `${siteUrl}/signup?email=${encodeURIComponent(email)}`

    // Call Resend's email engine securely using native zero-dependency fetch
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
            
            <a href="${signupUrl}" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 9999px; font-size: 15px;">
              Claim Your Quote!
            </a>
          </div>
        `,
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error('Resend delivery failure:', errorText)
      return NextResponse.json(
        { error: 'Failed to send transactional invitation via Resend.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Invite route execution error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}