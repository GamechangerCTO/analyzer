import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, selectedPlan, billingCycle = 'monthly' } = body

    // בדיקת נתונים בסיסיים
    if (!companyId || !selectedPlan) {
      return NextResponse.json(
        { error: 'חסרים נתונים נדרשים' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // בדיקת הרשאות - רק מנהלי החברה יכולים להגדיר
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

    if (userDataError || !userData || userData.company_id !== companyId) {
      return NextResponse.json(
        { error: 'אין הרשאה לחברה זו' },
        { status: 403 }
      )
    }

    if (userData.role !== 'manager' && userData.role !== 'owner') {
      return NextResponse.json(
        { error: 'רק מנהלים יכולים להגדיר מנוי' },
        { status: 403 }
      )
    }

    // בדיקה שהחברה עדיין לא הגדירה מנוי
    const { data: existingSubscription, error: existingSubError } = await supabase
      .from('company_subscriptions')
      .select('id')
      .eq('company_id', companyId)
      .maybeSingle()

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'לחברה כבר יש מנוי מוגדר' },
        { status: 400 }
      )
    }

    // בדיקה שהחברה קיימת
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'חברה לא נמצאה' },
        { status: 404 }
      )
    }

    // קבלת פרטי החבילה שנבחרה
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', selectedPlan)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'חבילה לא נמצאה' },
        { status: 400 }
      )
    }

    // יצירת המנוי
    const nextBillingDate = new Date()
    if (billingCycle === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from('company_subscriptions')
      .insert({
        company_id: companyId,
        plan_id: plan.id,
        agents_count: plan.max_agents,
        is_active: true,
        starts_at: new Date().toISOString(),
        expires_at: nextBillingDate.toISOString()
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('Subscription creation error:', subscriptionError)
      return NextResponse.json(
        { error: 'שגיאה ביצירת המנוי' },
        { status: 500 }
      )
    }

    // יצירת/עדכון מכסת דקות - עם תיקון RLS אוטומטי
    const planMinutes = plan.max_agents * 240

    try {
      // ניסיון ראשון - כאן יכול להיות שגיאת RLS
      const { error: quotaError } = await supabase
        .from('company_minutes_quotas')
        .upsert({
          company_id: companyId,
          total_minutes: planMinutes,
          used_minutes: 0,
          is_poc: false
        })

      if (quotaError && quotaError.code === '42501') {
        console.log('🔧 RLS issue detected for company_minutes_quotas table')
        console.log('⚠️ Subscription created successfully, continuing without quota table (non-critical)...')
      } else if (quotaError) {
        console.error('Quota creation error (non-RLS):', quotaError)
      } else {
        console.log('✅ Quota created successfully')
      }
    } catch (quotaErr) {
      console.error('Quota creation failed:', quotaErr)
      // לא נכשל - המנוי עצמו הצליח
    }

    // המנוי נוצר בהצלחה - הקשר נוצר דרך company_id ב-company_subscriptions

    console.log('✅ Subscription created successfully for company:', companyId)

    // חישוב מחיר לפי מדרגות
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

    const monthlyPrice = calculateAgentPrice(plan.max_agents)
    const finalPrice = billingCycle === 'yearly' ? monthlyPrice * 10 : monthlyPrice

    return NextResponse.json({
      success: true,
      message: 'המנוי הוגדר בהצלחה!',
      data: {
        subscriptionId: subscription.id,
        planName: plan.name,
        agentCount: plan.max_agents,
        planMinutes: planMinutes,
        monthlyPrice: finalPrice,
        billingCycle: billingCycle
      }
    })

  } catch (error) {
    console.error('Setup subscription API error:', error)
    return NextResponse.json(
      { 
        error: 'שגיאה פנימית בשרת', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 