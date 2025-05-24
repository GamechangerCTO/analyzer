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

  // בדיקת התחברות
  const { data: { session } } = await supabase.auth.getSession()
  
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
    return response
  }
  
  // אם אין משתמש מחובר והנתיב דורש התחברות, מפנים לדף הכניסה
  if (!session) {
    console.log('ניתוב לעמוד התחברות - אין משתמש מזוהה', request.nextUrl.pathname)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // לאחר שהמשתמש מזוהה, אפשר להמשיך
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
} 