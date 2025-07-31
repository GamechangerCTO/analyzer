import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'חסר מזהה משתמש' },
        { status: 400 }
      )
    }

    // יצירת לקוח Supabase עם service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // קריאת תובנות הסוכן מהמסד נתונים
    const { data: agentInsights, error } = await supabase
      .from('agent_insights' as any)
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // אם אין נתונים או שיש שגיאה, נחזיר תשובה ריקה
      if (error.code === 'PGRST116') { // No rows found
        return NextResponse.json({ message: 'אין תובנות שמורות' }, { status: 404 })
      }
      
      console.error('שגיאה בקריאת תובנות סוכן מהמסד נתונים:', error)
      return NextResponse.json({ error: 'שגיאה בקריאת תובנות סוכן' }, { status: 500 })
    }

    // בדיקה אם התובנות עדכניות (פחות מ-24 שעות)
    const lastUpdated = new Date(agentInsights.last_updated)
    const now = new Date()
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)

    if (hoursSinceUpdate > 24) {
      console.log(`⏰ תובנות סוכן ישנות (${hoursSinceUpdate.toFixed(1)} שעות), נדרש עדכון`)
      return NextResponse.json({ message: 'תובנות ישנות, נדרש עדכון' }, { status: 404 })
    }

    console.log(`✅ תובנות סוכן עדכניות נמצאו (${hoursSinceUpdate.toFixed(1)} שעות מאז עדכון אחרון)`)
    
    return NextResponse.json({
      ...agentInsights,
      cache_status: 'fresh',
      hours_since_update: Math.round(hoursSinceUpdate * 10) / 10
    })

  } catch (error: any) {
    console.error('שגיאה כללית בקריאת תובנות סוכן מטמון:', error)
    return NextResponse.json(
      { error: 'שגיאה פנימית בשרת' },
      { status: 500 }
    )
  }
}