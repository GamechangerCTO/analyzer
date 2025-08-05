import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    console.log('Received signup request:', { userId, companyName, fullName, email, selectedPlan })

    // בדיקת נתונים בסיסיים
    if (!userId || !companyName || !companySize || !companySector || !fullName || !jobTitle || !email || !selectedPlan) {
      return NextResponse.json(
        { error: 'חסרים נתונים נדרשים' },
        { status: 400 }
      )
    }

    // יצירת Supabase client עם service role key לעקיפת RLS
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!supabaseServiceKey || !supabaseUrl) {
      console.error('Missing Supabase configuration')
      return NextResponse.json(
        { error: 'שגיאה בתצורת השרת' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. יצירת החברה
    console.log('Creating company...', { companyName, companySector, companySize })
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        sector: companySector,
        product_info: `חברה בתחום ${companySector} עם ${companySize} עובדים`,
        is_poc: true
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

    console.log('Company created successfully:', company.id)

    // 2. יצירת המשתמש (עכשיו users ללא RLS אז זה יעבוד)
    console.log('Creating user...', { userId, companyId: company.id, fullName, email })
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        company_id: company.id,
        role: 'owner',
        full_name: fullName,
        job_title: jobTitle,
        email: email,
        phone: phone,
        is_approved: true
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

    console.log('User created successfully:', user.id)

    // 3. יצירת מכסת דקות לחברה
    const { error: quotaError } = await supabase
      .from('company_minutes_quotas')
      .insert({
        company_id: company.id,
        total_minutes: 240,
        used_minutes: 0,
        is_poc: true,
        poc_limit_minutes: 240
      })

    if (quotaError) {
      console.error('Quota creation error:', quotaError)
      // לא נכשיל את כל התהליך בגלל זה
    }

    // 4. מגבלת משתמשים הוסרה - רק מגבלת דקות רלוונטית

    console.log('Signup completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'ההרשמה הושלמה בהצלחה',
      data: {
        userId: user.id,
        companyId: company.id,
        companyName: company.name
      }
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'שגיאה כללית בהרשמה' },
      { status: 500 }
    )
  }
} 