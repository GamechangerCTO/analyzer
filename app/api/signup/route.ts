import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      companyName,
      companySize,
      companySector, 
      fullName,
      jobTitle, 
      email,
      phone, 
      selectedPlan, 
      billingCycle = 'monthly' 
    } = body

    // בדיקת נתונים בסיסיים
    if (!userId || !companyName || !companySize || !companySector || !fullName || !jobTitle || !email || !selectedPlan) {
      return NextResponse.json(
        { error: 'חסרים נתונים נדרשים' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // שלב 1: יצירת החברה
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName.trim(),
        sector: companySector,
        is_poc: false // חברות חדשות לא POC
      })
      .select()
      .single()

    if (companyError) {
      console.error('Company creation error:', companyError)
      return NextResponse.json(
        { error: 'שגיאה ביצירת החברה' },
        { status: 500 }
      )
    }

    // שלב 2: קבלת פרטי החבילה שנבחרה
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', selectedPlan)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      console.error('Plan fetch error:', planError)
      return NextResponse.json(
        { error: 'חבילה לא נמצאה' },
        { status: 400 }
      )
    }

    // שלב 3: יצירת המנוי
    const nextBillingDate = new Date()
    if (billingCycle === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    }

    const planMinutes = plan.max_agents * 240 // חישוב דקות לפי נציגים

    const { data: subscription, error: subscriptionError } = await supabase
      .from('company_subscriptions')
      .insert({
        company_id: company.id,
        plan_id: plan.id,
        agents_count: plan.max_agents,
        // עדכון: השתמש בטבלה הקיימת
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

    // שלב 4: יצירת משתמש ראשי (מנהל החברה)
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        company_id: company.id,
        role: 'manager', // הוא יהיה המנהל הראשי
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone || null,
        job_title: jobTitle.trim(),
        is_approved: true // מנהל ראשי מאושר אוטומטית
      })
      .select()
      .single()

    if (userError) {
      console.error('User creation error:', userError)
      return NextResponse.json(
        { error: 'שגיאה ביצירת המשתמש' },
        { status: 500 }
      )
    }

    // שלב 5: יצירת מכסת דקות
    const { error: quotaError } = await supabase
      .from('company_minutes_quotas')
      .insert({
        company_id: company.id,
        total_minutes: planMinutes,
        used_minutes: 0,
        is_poc: false
      })

    if (quotaError) {
      console.error('Quota creation error:', quotaError)
      // לא נכשל בגלל זה אבל נלוג
    }

    // שלב 6: חישוב מחיר לפי מדרגות (ידני)
    let monthlyPrice = 0
    let remainingAgents = plan.max_agents
    
    // מדרגה 1: 1-5 נציגים = $69 לכל אחד
    if (remainingAgents > 0) {
      const agentsInTier = Math.min(remainingAgents, 5)
      monthlyPrice += agentsInTier * 69
      remainingAgents -= agentsInTier
    }
    
    // מדרגה 2: 6-10 נציגים = $59 לכל אחד
    if (remainingAgents > 0) {
      const agentsInTier = Math.min(remainingAgents, 5)
      monthlyPrice += agentsInTier * 59
      remainingAgents -= agentsInTier
    }
    
    // מדרגה 3: 11+ נציגים = $49 לכל אחד
    if (remainingAgents > 0) {
      monthlyPrice += remainingAgents * 49
    }

    const finalPrice = billingCycle === 'yearly' ? monthlyPrice * 10 : monthlyPrice

    return NextResponse.json({
      success: true,
      message: 'החשבון נוצר בהצלחה!',
      data: {
        companyId: company.id,
        subscriptionId: subscription.id,
        userId: user.id,
        planMinutes: planMinutes,
        monthlyPrice: finalPrice
      }
    })

  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { 
        error: 'שגיאה פנימית בשרת', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 