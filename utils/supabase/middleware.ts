
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_COOKIE_NAME = 'sb-activiabook-auth-token'

/**
 * Clear all Supabase auth cookies, including chunked ones.
 * @supabase/ssr stores tokens in chunked cookies like:
 *   sb-acitviabook-auth-token.0, sb-activiabook-auth-token.1, etc.
 * We must delete ALL of them to fully invalidate the session.
 */
function clearAllAuthCookies(request: NextRequest, response: NextResponse) {
  const allCookies = request.cookies.getAll()
  for (const cookie of allCookies) {
    if (cookie.name === AUTH_COOKIE_NAME || cookie.name.startsWith(`${AUTH_COOKIE_NAME}.`)) {
      response.cookies.delete(cookie.name)
    }
  }
}

function hasAuthCookies(request: NextRequest): boolean {
  const allCookies = request.cookies.getAll()
  return allCookies.some(c => c.name === AUTH_COOKIE_NAME || c.name.startsWith(`${AUTH_COOKIE_NAME}.`))
}

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
    if (error) {
      // Auth error can be transient (session propagation delay, network blips).
      // Do NOT clear cookies here — it breaks new signups where the session
      // hasn't fully propagated yet. Just treat as unauthenticated.
      console.warn("Auth getUser error in middleware:", error.message)
      user = null
    } else {
      user = authUser
    }
  } catch (error) {
    // If refreshing the token fails (e.g. DB reset), treat as logged out
    console.error("Auth exception in middleware:", error)
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

  // Profile existence check — runs on ALL paths when user is authenticated.
  // This ensures ghost sessions are caught even on public pages (e.g. landing page).
  // Skip for newly created users (grace period) to allow the DB trigger to create the profile.
  if (user) {
    const userCreatedAt = new Date(user.created_at).getTime()
    const now = Date.now()
    const GRACE_PERIOD_MS = 60_000 // 60 seconds grace for profile creation trigger
    const isNewUser = (now - userCreatedAt) < GRACE_PERIOD_MS

    if (isNewUser) {
      console.log(`Middleware: User ${user.id} created ${Math.round((now - userCreatedAt) / 1000)}s ago — skipping profile check (grace period)`)
    } else {
      const { data: profile, error: profileError, status: profileStatus } = await supabase
        .from('profiles')
        .select('deleted_at')
        .eq('id', user.id)
        .single()

      console.log(`Middleware: Profile check for user ${user.id} — data:`, JSON.stringify(profile), 'error:', JSON.stringify(profileError), 'status:', profileStatus)

      // Handle profile status
      let shouldLogout = false
      let logoutReason = ''

      if (profileError) {
        // PGRST116: JSON object requested, but no rows returned (Not Found)
        // 406: Not Acceptable (often returned for missing records with .single())
        const isNotFound = profileError.code === 'PGRST116' || profileStatus === 406 || profileStatus === 404

        if (isNotFound) {
          shouldLogout = true
          logoutReason = 'profile_missing'
          console.log(`Middleware: Profile missing for user ${user.id}. Triggering logout.`)
        } else {
          // Transient error (e.g. 500, network timeout). 
          // We DO NOT logout to avoid accidental lockouts during outages.
          console.error(`Middleware: Transient error fetching profile for user ${user.id}:`, profileError)
        }
      } else if (!profile) {
        // Profile query succeeded but returned null (no matching row)
        shouldLogout = true
        logoutReason = 'profile_missing'
        console.log(`Middleware: Profile null for user ${user.id}. Triggering logout.`)
      } else if (profile.deleted_at) {
        shouldLogout = true
        logoutReason = 'account_closed'
        console.log(`Middleware: Profile explicitly marked as deleted for user ${user.id}. Triggering logout.`)
      }

      if (shouldLogout) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', logoutReason)

        const response = NextResponse.redirect(url)
        clearAllAuthCookies(request, response)
        return response
      }
    } // end else (not new user)
  } // end if (user)

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
