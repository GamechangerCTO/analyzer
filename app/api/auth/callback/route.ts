import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const user = (await supabase.auth.getUser()).data.user
      if (user) {
        // Redirect to login page so the existing auth logic can handle user setup
        return NextResponse.redirect(`${origin}/login`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
} 