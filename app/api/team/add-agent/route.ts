import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, notes } = body

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, password and full name are required' },
        { status: 400 }
      )
    }

    // Password validation
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
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

    // מגבלת נציגים הוסרה - רק מגבלת דקות רלוונטית

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
    // הסיסמה מתקבלת מהמנהל, והנציג יתבקש להחליף אותה בכניסה הראשונה

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

    console.log('Creating user with data:', { email, full_name, companyId })
    
    const { data: newUser, error: userCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
        role: 'agent',
        company_id: companyId,
        force_password_change: true // נציג יתבקש להחליף סיסמה בכניסה הראשונה
      }
    })
    
    console.log('Created user result:', newUser?.user?.id, newUser?.user?.email)

    if (userCreateError) {
      console.error('Error creating user:', userCreateError)
      return NextResponse.json(
        { error: `שגיאה ביצירת משתמש: ${userCreateError.message}` },
        { status: 400 }
      )
    }

    // הוספת המשתמש לטבלת users
    if (newUser.user) {
      // בדיקה אם המשתמש כבר קיים בטבלת users (למניעת duplicate key)
      const { data: existingUserInTable, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', newUser.user.id)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        // אם יש שגיאה אמיתית (לא "לא נמצא")
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        console.error('Error checking existing user in table:', checkError)
        return NextResponse.json(
          { error: `שגיאה בבדיקת משתמש קיים: ${checkError.message}` },
          { status: 400 }
        )
      }

      if (!existingUserInTable) {
        // המשתמש לא קיים בטבלה - נוסיף אותו
        console.log('Inserting user to table:', { 
          id: newUser.user.id, 
          email, 
          full_name, 
          role: 'agent', 
          company_id: companyId 
        })
        
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
      } else {
        // המשתמש כבר קיים בטבלה (יוצר על ידי trigger) - נעדכן אותו עם הנתונים המלאים
        console.log('Updating existing user created by trigger:', { 
          id: newUser.user.id, 
          email, 
          full_name, 
          company_id: companyId 
        })
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: full_name,
            company_id: companyId,
            is_approved: true
          })
          .eq('id', newUser.user.id)

        if (updateError) {
          // אם נכשל בעדכון, נמחק את המשתמש מה-auth
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
          console.error('Error updating user in table:', updateError)
          return NextResponse.json(
            { error: `שגיאה בעדכון משתמש: ${updateError.message}` },
            { status: 400 }
          )
        }
      }
    }

    // הצלחה - החזרת פרטים
    return NextResponse.json({
      success: true,
      message: `נציג ${full_name} נוסף בהצלחה למערכת!`,
      agent: {
        id: newUser.user?.id,
        email: email,
        full_name: full_name
      },
      note: 'הנציג יכול להתחבר מיד עם הפרטים שהוגדרו ויידרש להחליף את הסיסמה בכניסה הראשונה'
    })

  } catch (error) {
    console.error('Error in add-agent API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 