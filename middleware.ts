import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()

  // 🆕 Partner API - אימות נפרד (לא דרך Supabase Auth)
  // נתיבי Partner API יטפלו באימות בעצמם דרך API keys
  if (request.nextUrl.pathname.startsWith('/api/partner/')) {
    return res
  }

  // נתיבים פתוחים (אין צורך בהתחברות)
  const publicPaths = ['/login', '/signup', '/signup-complete', '/api', '/not-approved', '/not-found', '/privacy-policy', '/legal-terms', '/subscription-setup', '/test-auth', '/change-password']
  
  // בדיקה האם הנתיב הנוכחי מאושר גם ללא התחברות
  const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))
  
  // רשימת משאבים סטטיים שתמיד מאושרים
  const isStaticResource = request.nextUrl.pathname.startsWith('/_next') || 
                            request.nextUrl.pathname.startsWith('/images') || 
                            request.nextUrl.pathname.startsWith('/favicon.ico') ||
                            request.nextUrl.pathname.startsWith('/avatars') ||
                            request.nextUrl.pathname.startsWith('/logo') ||
                            request.nextUrl.pathname.endsWith('.png') ||
                            request.nextUrl.pathname.endsWith('.jpg') ||
                            request.nextUrl.pathname.endsWith('.jpeg') ||
                            request.nextUrl.pathname.endsWith('.svg') ||
                            request.nextUrl.pathname.endsWith('.ico')
  
  // אם הנתיב ציבורי או משאב סטטי, אין צורך בבדיקת התחברות
  if (isPublicPath || isStaticResource) {
    return res
  }
  
  const supabase = createMiddlewareClient({ req: request, res })

  // בדיקת התחברות מפושטת
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    // אם אין משתמש מחובר והנתיב דורש התחברות, מפנים לדף הכניסה
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // משתמש מחובר - המשך רגיל
    return res
    
  } catch (authError) {
    console.error('Middleware auth error:', authError)
    // במקרה של שגיאה, מפנה ללוגין
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|avatars).*)'],
} 