import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // 🔐 בדיקת הרשאות
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // בדיקה שזה super admin
    const { data: isSuperAdmin } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 })
    }

    // קבלת כל החבילות
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order')

    if (plansError) {
      console.error('Plans error:', plansError)
      return NextResponse.json({ error: 'שגיאה בטעינת החבילות', details: plansError }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      plans: plans || [],
      total: plans?.length || 0
    })

  } catch (error) {
    console.error('Debug plans API error:', error)
    return NextResponse.json(
      { 
        error: 'שגיאה פנימית בשרת', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 