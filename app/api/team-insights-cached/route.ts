import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'חסר מזהה חברה' },
        { status: 400 }
      )
    }

    // יצירת לקוח Supabase עם service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // קריאת תובנות מהמסד נתונים
    const { data: teamInsights, error } = await supabase
      .from('team_insights' as any)
      .select('*')
      .eq('company_id', companyId)
      .single()

    if (error) {
      // אם אין נתונים או שיש שגיאה, נחזיר תשובה ריקה
      if (error.code === 'PGRST116') { // No rows found
        return NextResponse.json({ message: 'אין תובנות שמורות' }, { status: 404 })
      }
      
      console.error('שגיאה בקריאת תובנות מהמסד נתונים:', error)
      return NextResponse.json({ error: 'שגיאה בקריאת תובנות' }, { status: 500 })
    }

    // בדיקה אם התובנות עדכניות (פחות מ-24 שעות)
    const lastUpdated = new Date(teamInsights.last_updated)
    const now = new Date()
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)

    if (hoursSinceUpdate > 24) {
      console.log(`⏰ תובנות ישנות (${hoursSinceUpdate.toFixed(1)} שעות), נדרש עדכון`)
      return NextResponse.json({ message: 'תובנות ישנות, נדרש עדכון' }, { status: 404 })
    }

    console.log(`✅ תובנות עדכניות נמצאו (${hoursSinceUpdate.toFixed(1)} שעות מאז עדכון אחרון)`)
    
    return NextResponse.json({
      ...teamInsights,
      cache_status: 'fresh',
      hours_since_update: Math.round(hoursSinceUpdate * 10) / 10
    })

  } catch (error: any) {
    console.error('שגיאה כללית בקריאת תובנות מטמון:', error)
    return NextResponse.json(
      { error: 'שגיאה פנימית בשרת' },
      { status: 500 }
    )
  }
}