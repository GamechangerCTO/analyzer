import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // 🔐 רק super admins יכולים לבדוק את זה
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: isSuperAdmin } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 })
    }

    // רק לפיתוח - לא מחזיר שום מידע רגיש בproduction
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        success: true,
        message: 'Environment check disabled in production',
        data: { NODE_ENV: 'production' }
      })
    }

    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
    }
    
    return NextResponse.json({
      success: true,
      message: 'Environment variables check completed',
      data: envCheck
    })
    
  } catch (error) {
    console.error('❌ Error checking environment:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal error'
    }, { status: 500 })
  }
} 