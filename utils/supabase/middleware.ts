
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
  console.log('Middleware creating Supabase client with URL:', supabaseUrl)

  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,

    {
      cookieOptions: {
        name: 'sb-activiabook-auth-token',
      },
      cookies: {

        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with




  let user = null
  try {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()
    user = authUser
  } catch (error) {
    // If refreshing the token fails (e.g. DB reset), treat as logged out
    console.error("Auth error in middleware:", error)
    user = null
  }



  const path = request.nextUrl.pathname

  // Public Paths
  const isPublicPath = path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/auth') ||
    path.startsWith('/signup') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/api/legal')

  if (user && !isPublicPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('deleted_at')
      .eq('id', user.id)
      .single()

    if (profile?.deleted_at) {
      // Clear session by redirecting to a sign-out flow or just clearing cookies
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'account_closed')

      // We create a response that clears the auth cookie
      const response = NextResponse.redirect(url)
      response.cookies.delete('sb-activiabook-auth-token')
      return response
    }
  }

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }


  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new Response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  return supabaseResponse
}
