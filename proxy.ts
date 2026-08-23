import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Create an unmodified Supabase server client using your updated Publishable Key
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get the current user safely from the server
  const { data: { user } } = await supabase.auth.getUser()

  // Define routes that DO NOT require a login
  // (We allow '/' and anything starting with '/auth' for email verifications)
  const isPublicRoute = request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/auth')

  // RULE 1: If user is NOT logged in and tries to access a private page, kick them to '/'
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // RULE 2: If user IS logged in and visits the login page ('/'), push them to '/feed'
  if (user && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  return supabaseResponse
}

// Ensure the proxy only runs on actual pages, ignoring static images and Next.js background files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}