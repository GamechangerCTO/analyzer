import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API לשליפת פרומפטים לסימולציות מטבלת prompts
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // בדיקת authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const callType = searchParams.get('call_type')
    const simulationType = searchParams.get('simulation_type')

    // אם מבקשים פרומפט ספציפי לסוג שיחה
    if (callType) {
      const { data: promptData, error: promptError } = await supabase
        .from('prompts')
        .select('call_type, system_prompt, analysis_fields, analysis_criteria')
        .eq('call_type', callType)
        .eq('is_active', true)
        .single()

      if (promptError || !promptData) {
        return NextResponse.json({ 
          error: 'לא נמצא פרומפט לסוג השיחה הזה',
          fallback: true
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        prompt: promptData
      })
    }

    // אם מבקשים פרומפט לסימולציה
    if (simulationType) {
      // בינתיים נחזיר פרומפט כללי לסימולציות
      // בעתיד נוכל להוסיף פרומפטים ספציפיים לכל סוג סימולציה
      const { data: simulationPrompt, error: simError } = await supabase
        .from('prompts')
        .select('call_type, system_prompt')
        .eq('call_type', 'simulation_base')
        .eq('is_active', true)
        .single()

      if (simError || !simulationPrompt) {
        // אם אין פרומפט ייעודי לסימולציות, נחזיר פרומפט כללי
        return NextResponse.json({
          success: true,
          prompt: {
            call_type: 'simulation_base',
            system_prompt: generateDefaultSimulationPrompt(simulationType)
          },
          fallback: true
        })
      }

      return NextResponse.json({
        success: true,
        prompt: simulationPrompt
      })
    }

    // החזרת כל הפרומפטים הפעילים
    const { data: allPrompts, error: allError } = await supabase
      .from('prompts')
      .select('call_type, system_prompt, analysis_fields, analysis_criteria')
      .eq('is_active', true)
      .order('call_type')

    if (allError) {
      throw new Error(`שגיאה בשליפת פרומפטים: ${allError.message}`)
    }

    return NextResponse.json({
      success: true,
      prompts: allPrompts || []
    })

  } catch (error: any) {
    console.error('❌ שגיאה ב-API פרומפטים לסימולציות:', error)
    return NextResponse.json({ 
      error: 'שגיאה פנימית בשרת', 
      details: error.message 
    }, { status: 500 })
  }
}

/**
 * יצירת פרומפט ברירת מחדל לסימולציות
 */
function generateDefaultSimulationPrompt(simulationType: string): string {
  return `
🎯 אתה לקוח וירטואלי אינטליגנטי במערכת אימון מכירות ושירות

## 🎭 תפקידך:
אתה משחק תפקיד של לקוח אמיתי בסימולציה של ${simulationType || 'שיחת מכירות'}

## 📋 הנחיות בסיסיות:
- דבר בעברית טבעית בלבד
- התנהג כמו לקוח אמיתי עם צרכים, חששות ומגבלות
- היה אתגרי אבל הוגן - המטרה היא לאמן את הנציג
- העלה התנגדויות רלוונטיות והגיוניות
- הראה התקדמות אם הנציג מטפל בך טוב

## 🎪 סגנון התנהגות:
- היה טבעי ואמיתי
- הראה רגשות (חשש, התלהבות, תסכול)
- שנה את הטון לפי איכות הטיפול של הנציג
- אל תיכנע מהר מדי - זה יפגע באיכות האימון

## 🚫 התנגדויות נפוצות לשימוש:
- "אני צריך לחשוב על זה"
- "זה נשמע יקר"
- "אין לי זמן עכשיו"
- "אני כבר עובד עם ספק אחר"
- "אני לא בטוח שזה מתאים לי"

זכור: המטרה היא ללמד את הנציג, לא להקשות עליו מדי! 🎯
`
}

/**
 * POST - עדכון או יצירת פרומפט חדש
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // בדיקת authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // בדיקת הרשאות admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (userData?.role !== 'super_admin' && userData?.role !== 'admin') {
      return NextResponse.json({ error: 'אין הרשאה לעדכן פרומפטים' }, { status: 403 })
    }

    const { call_type, system_prompt, analysis_fields, analysis_criteria } = await request.json()

    if (!call_type || !system_prompt) {
      return NextResponse.json({ 
        error: 'חסרים שדות נדרשים: call_type, system_prompt' 
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('prompts')
      .upsert({
        call_type,
        system_prompt,
        analysis_fields: analysis_fields || null,
        analysis_criteria: analysis_criteria || null,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'call_type'
      })
      .select()

    if (error) {
      throw new Error(`שגיאה בעדכון הפרומפט: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'הפרומפט עודכן בהצלחה',
      data
    })

  } catch (error: any) {
    console.error('❌ שגיאה בעדכון פרומפט:', error)
    return NextResponse.json({ 
      error: 'שגיאה פנימית בשרת', 
      details: error.message 
    }, { status: 500 })
  }
}



