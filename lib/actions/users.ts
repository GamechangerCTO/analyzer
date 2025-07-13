'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database.types'
import { cookies } from 'next/headers'
import { createClient as createServerClient } from '@/lib/supabase/server'

// יצירת לקוח סופאבייס עם הרשאות service_role
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createUserWithServiceRole(userData: {
  email: string
  password: string
  full_name: string
  role: string
  company_id?: string | null
  is_approved?: boolean
}) {
  try {
    // בדיקת תפקיד המשתמש המוסיף
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('משתמש לא מחובר')
    }
    
    // בדיקת התפקיד של המשתמש המוסיף
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      throw new Error('שגיאה בבדיקת פרטי המשתמש המוסיף')
    }
    
    // קביעת סטטוס האישור בהתאם לתפקיד המוסיף
    // אם מנהל מערכת מוסיף - המשתמש מאושר אוטומטית
    // אחרת, צריך אישור ממנהל מערכת
    const is_approved = currentUserData.role === 'admin' ? true : false
    
    // ✅ BYPASS לאדמין - מנהלי מערכת יכולים ליצור משתמשים ללא מגבלות מכסה
    if (currentUserData.role === 'admin') {
      console.log('Admin bypass: יצירת משתמש ללא בדיקת מכסה')
    }
    
    // בדיקה אם המשתמש כבר קיים ב-Auth לפי האימייל
    const { data: existingUsers, error: existingError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (existingError) {
      throw new Error(`שגיאה בבדיקת משתמשים קיימים: ${existingError.message}`)
    }
    
    // חיפוש משתמש קיים לפי אימייל
    const existingUser = existingUsers.users.find(user => user.email === userData.email)
    let authUser

    // אם המשתמש כבר קיים
    if (existingUser) {
      console.log('משתמש קיים במערכת Auth, מעדכן פרטים')
      authUser = existingUser
    } else {
      // יצירת משתמש חדש ב-Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('משתמש לא נוצר ב-Auth')
      
      authUser = authData.user
    }

    // בדיקה אם המשתמש כבר קיים בטבלת public.users
    const { data: existingPublicUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle()
      
    // שימוש ב-upsert כדי ליצור או לעדכן משתמש קיים
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authUser.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        company_id: userData.company_id || null,
        is_approved: is_approved
      }, { onConflict: 'id' })

    if (upsertError) {
      console.error('שגיאה בהוספת/עדכון משתמש בטבלת users:', upsertError)
      throw new Error(`שגיאה בהוספת/עדכון משתמש: ${upsertError.message}`)
    }
    
    // אם קיים כבר משתמש בטבלה הציבורית והוא עודכן, עדכן גם את הסיסמה
    if (existingPublicUser) {
      const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: userData.password }
      )
      
      if (updatePasswordError) {
        console.warn('שגיאה בעדכון סיסמה למשתמש קיים:', updatePasswordError)
      }
    }

    // רענון הדף לאחר יצירת המשתמש
    revalidatePath('/dashboard/admin/users')
    
    // החזר את הסטטוס שנבחר כדי להציג הודעה מתאימה למשתמש
    return { 
      success: true, 
      user: authUser,
      is_approved: is_approved,
      isExisting: !!existingPublicUser
    }
  } catch (error) {
    console.error('שגיאה ביצירת משתמש:', error)
    const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה'
    return { success: false, error: errorMessage }
  }
}

export async function approveUserById(userId: string) {
  try {
    // בדיקת תפקיד המשתמש המעדכן - רק מנהל מערכת יכול לאשר
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('משתמש לא מחובר')
    }
    
    // בדיקת התפקיד של המשתמש המעדכן
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      throw new Error('שגיאה בבדיקת פרטי המשתמש המעדכן')
    }
    
    // וידוא שהמעדכן הוא מנהל מערכת
    if (currentUserData.role !== 'admin') {
      throw new Error('רק מנהל מערכת יכול לאשר משתמשים')
    }
    
    // עדכון סטטוס האישור של המשתמש בטבלה
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ is_approved: true })
      .eq('id', userId)
    
    if (updateError) {
      throw new Error(`שגיאה בעדכון סטטוס המשתמש: ${updateError.message}`)
    }
    
    // רענון הדף לאחר העדכון
    revalidatePath('/dashboard/admin/users')
    
    return { success: true }
  } catch (error) {
    console.error('שגיאה באישור משתמש:', error)
    const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה'
    return { success: false, error: errorMessage }
  }
}

// אישור המשתמש שהועלה בדוגמה - פונקציה לשימוש חד פעמי
export async function approveSpecificUser() {
  try {
    const specificUserId = '2759aed1-b865-402f-9bb8-faf89a879e93'
    
    // עדכון סטטוס האישור של המשתמש הספציפי
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ is_approved: true })
      .eq('id', specificUserId)
    
    if (updateError) {
      throw new Error(`שגיאה בעדכון סטטוס המשתמש: ${updateError.message}`)
    }
    
    // רענון הדף לאחר העדכון
    revalidatePath('/dashboard/admin/users')
    
    return { success: true, message: 'המשתמש triroars@gmail.com אושר בהצלחה' }
  } catch (error) {
    console.error('שגיאה באישור המשתמש הספציפי:', error)
    const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה'
    return { success: false, error: errorMessage }
  }
}

 