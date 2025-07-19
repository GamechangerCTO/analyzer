import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, full_name, phone } = body

    if (!email || !full_name) {
      return NextResponse.json(
        { error: 'Email and full name are required' },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    const supabase = createClient()
    
    // קבלת משתמש נוכחי
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // קבלת פרטי המשתמש הנוכחי
    const { data: currentUserData, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (currentUserError || !currentUserData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      )
    }

    // בדיקה שהמשתמש הוא מנהל או אדמין
    if (currentUserData.role !== 'manager' && currentUserData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only managers and admins can add agents' },
        { status: 403 }
      )
    }

    const companyId = currentUserData.company_id

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID not found' },
        { status: 400 }
      )
    }

    // ✅ BYPASS לאדמין - מנהלי מערכת יכולים ליצור נציגים ללא מגבלות מכסה
    let skipQuotaCheck = false
    if (currentUserData.role === 'admin') {
      console.log('Admin bypass: יצירת נציג ללא בדיקת מכסה')
      skipQuotaCheck = true
    }

    // בדיקת מכסה זמינה למנהלים - בדיקה לפי מנוי במקום מכסות ישנות
    if (!skipQuotaCheck) {
      // קבלת פרטי המנוי של החברה
      const { data: subscription, error: subError } = await supabase
        .from('company_subscriptions')
        .select('agents_count')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single()

      if (subError || !subscription) {
        return NextResponse.json(
          { error: 'לא נמצא מנוי פעיל לחברה. אנא הגדירו חבילה תחילה.' },
          { status: 400 }
        )
      }

      // ספירת נציגים קיימים
      const { count: currentAgentsCount, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('role', 'agent')

      if (countError) {
        console.error('Error counting agents:', countError)
        return NextResponse.json(
          { error: 'שגיאה בבדיקת מספר נציגים' },
          { status: 500 }
        )
      }

      if ((currentAgentsCount || 0) >= subscription.agents_count) {
        return NextResponse.json(
          { 
            error: 'הגעתם למספר הנציגים המקסימלי',
            message: `החבילה שלכם מאפשרת עד ${subscription.agents_count} נציגים. כרגע יש לכם ${currentAgentsCount || 0} נציגים. אנא שדרגו את החבילה להוספת נציגים נוספים.`,
            current_agents: currentAgentsCount || 0,
            max_agents: subscription.agents_count
          },
          { status: 400 }
        )
      }
    }

    // בדיקה אם המייל כבר קיים
    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'משתמש עם כתובת מייל זו כבר קיים במערכת' },
        { status: 400 }
      )
    }

    // יצירת משתמש ישירות במערכת SaaS - ללא צורך באישור אדמין
    
    // יצירת סיסמה זמנית
    const generateTempPassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      let password = ''
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return password
    }

    const tempPassword = generateTempPassword()

    // יצירת משתמש חדש ב-Supabase Auth
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: newUser, error: userCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
        role: 'agent',
        company_id: companyId
      }
    })

    if (userCreateError) {
      console.error('Error creating user:', userCreateError)
      return NextResponse.json(
        { error: `שגיאה ביצירת משתמש: ${userCreateError.message}` },
        { status: 400 }
      )
    }

    // הוספת המשתמש לטבלת users
    if (newUser.user) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: newUser.user.id,
          email: email,
          full_name: full_name,
          role: 'agent',
          company_id: companyId,
          is_approved: true // נציג מאושר אוטומטית במערכת SaaS
        })

      if (insertError) {
        // אם נכשל בהוספה לטבלה, נמחק את המשתמש מה-auth
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        console.error('Error inserting user into table:', insertError)
        return NextResponse.json(
          { error: `שגיאה בהוספת משתמש לטבלה: ${insertError.message}` },
          { status: 400 }
        )
      }
    }

    // הצלחה - החזרת פרטים
    return NextResponse.json({
      success: true,
      message: `נציג ${full_name} נוסף בהצלחה למערכת!`,
      agent: {
        id: newUser.user?.id,
        email: email,
        full_name: full_name,
        temp_password: tempPassword // רק לפעם הראשונה - המשתמש יידרש לשנות
      },
      note: 'הנציג יקבל מייל עם פרטי הגישה ויידרש לשנות את הסיסמה בהתחברות הראשונה'
    })

  } catch (error) {
    console.error('Error in add-agent API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 