import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: { path: string; maxAge: number; domain?: string; sameSite?: "lax" | "strict" | "none"; secure?: boolean }) {
          request.cookies.set(name, value)
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: { path: string; domain?: string }) {
          request.cookies.set(name, '')
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          })
        },
      },
    }
  )

  // נתיבים פתוחים (אין צורך בהתחברות)
  const publicPaths = ['/login', '/api', '/not-approved', '/not-found']
  
  // בדיקה האם הנתיב הנוכחי מאושר גם ללא התחברות
  const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))
  
  // רשימת משאבים סטטיים שתמיד מאושרים
  const isStaticResource = request.nextUrl.pathname.startsWith('/_next') || 
                            request.nextUrl.pathname.startsWith('/images') || 
                            request.nextUrl.pathname.startsWith('/favicon.ico')
  
  // אם הנתיב ציבורי או משאב סטטי, אין צורך בבדיקת התחברות
  if (isPublicPath || isStaticResource) {
    console.log('Middleware - Allowing public path:', request.nextUrl.pathname)
    return response
  }
  
  // דיבוג מתקדם לauth
  console.log('Middleware - Checking auth for path:', request.nextUrl.pathname)
  console.log('Middleware - Auth cookies present:', {
    'sb-access-token': !!request.cookies.get('sb-oesbtvlnnvygbntkrqyk-auth-token'),
    'sb-refresh-token': !!request.cookies.get('sb-oesbtvlnnvygbntkrqyk-auth-token-code-verifier'),
    allCookies: request.cookies.getAll().map(c => c.name)
  })

  // בדיקת התחברות
  const { data: { session }, error } = await supabase.auth.getSession()
  
  console.log('Middleware - Session check result:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    userEmail: session?.user?.email,
    sessionError: error?.message,
    sessionExpires: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A'
  })
  
  // אם אין משתמש מחובר והנתיב דורש התחברות, מפנים לדף הכניסה
  if (!session) {
    console.log('Middleware - No session found, redirecting to login from:', request.nextUrl.pathname)
    console.log('Middleware - Full URL was:', request.url)
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  console.log('Middleware - Auth successful for:', session.user.email, 'accessing:', request.nextUrl.pathname)

  // לאחר שהמשתמש מזוהה, אפשר להמשיך
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
} 