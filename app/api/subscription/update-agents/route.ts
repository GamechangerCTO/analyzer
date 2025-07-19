import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscriptionId, newAgentCount } = body

    // בדיקת נתונים בסיסיים
    if (!subscriptionId || !newAgentCount || newAgentCount < 1) {
      return NextResponse.json(
        { error: 'נתונים לא תקינים' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // בדיקת הרשאות - רק מנהלי החברה יכולים לעדכן
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'שגיאה באימות המשתמש' },
        { status: 401 }
      )
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.company_id) {
      return NextResponse.json(
        { error: 'לא נמצאו פרטי משתמש או חברה' },
        { status: 404 }
      )
    }

    if (userData.role !== 'manager' && userData.role !== 'owner') {
      return NextResponse.json(
        { error: 'אין הרשאה לבצע פעולה זו' },
        { status: 403 }
      )
    }

    // קבלת פרטי המנוי הנוכחי
    const { data: subscription, error: subError } = await supabase
      .from('company_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('company_id', userData.company_id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'מנוי לא נמצא' },
        { status: 404 }
      )
    }

    // חישוב מחיר חדש לפי מדרגות
    const calculateAgentPrice = (agents: number) => {
      let totalPrice = 0
      let remainingAgents = agents
      
      // מדרגה 1: 1-5 נציגים = $69 לכל אחד
      if (remainingAgents > 0) {
        const agentsInTier = Math.min(remainingAgents, 5)
        totalPrice += agentsInTier * 69
        remainingAgents -= agentsInTier
      }
      
      // מדרגה 2: 6-10 נציגים = $59 לכל אחד
      if (remainingAgents > 0) {
        const agentsInTier = Math.min(remainingAgents, 5)
        totalPrice += agentsInTier * 59
        remainingAgents -= agentsInTier
      }
      
      // מדרגה 3: 11+ נציגים = $49 לכל אחד
      if (remainingAgents > 0) {
        totalPrice += remainingAgents * 49
      }
      
      return totalPrice
    }

    const oldPrice = calculateAgentPrice(subscription.agents_count)
    const newPrice = calculateAgentPrice(newAgentCount)
    const newMinutes = newAgentCount * 240

    // עדכון המנוי
    const { error: updateError } = await supabase
      .from('company_subscriptions')
      .update({
        agents_count: newAgentCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    if (updateError) {
      console.error('Update subscription error:', updateError)
      return NextResponse.json(
        { error: 'שגיאה בעדכון המנוי' },
        { status: 500 }
      )
    }

    // עדכון מכסת הדקות
    const { error: quotaError } = await supabase
      .from('company_minutes_quotas')
      .update({
        total_minutes: newMinutes,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', userData.company_id)

    if (quotaError) {
      console.error('Update quota error:', quotaError)
      // לא נכשל בגלל זה אבל נלוג
    }

    // יצירת רשומת שינוי (אופציונלי - לוג של השינוי)
    const changeLog = {
      company_id: userData.company_id,
      subscription_id: subscriptionId,
      changed_by: user.id,
      change_type: 'agent_count_update',
      old_value: subscription.agents_count,
      new_value: newAgentCount,
      old_price: oldPrice,
      new_price: newPrice,
      created_at: new Date().toISOString()
    }

    // רישום השינוי ללוג (אופציונלי - כרגע רק ללוג הקונסול)
    console.log('Agent count updated:', {
      companyId: userData.company_id,
      subscriptionId: subscriptionId,
      oldAgentCount: subscription.agents_count,
      newAgentCount: newAgentCount,
      oldPrice: oldPrice,
      newPrice: newPrice,
      priceDifference: newPrice - oldPrice
    })

    return NextResponse.json({
      success: true,
      message: 'מספר הנציגים עודכן בהצלחה',
      data: {
        oldAgentCount: subscription.agents_count,
        newAgentCount: newAgentCount,
        oldPrice: oldPrice,
        newPrice: newPrice,
        newMinutes: newMinutes,
        priceDifference: newPrice - oldPrice
      }
    })

  } catch (error) {
    console.error('Update agents API error:', error)
    return NextResponse.json(
      { 
        error: 'שגיאה פנימית בשרת', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 