import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const user = (await supabase.auth.getUser()).data.user
      if (user) {
        // ניתוב ישיר לדשבורד במקום חזרה ל-login
        const finalDestination = next.startsWith('/') ? next : '/dashboard'
        return NextResponse.redirect(`${origin}${finalDestination}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
} 