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
  console.log('🚀 createUserWithServiceRole called with:', {
    email: userData.email,
    full_name: userData.full_name,
    role: userData.role,
    company_id: userData.company_id,
    has_password: !!userData.password
  });

  try {
    // בדיקת משתנים בסביבת העבודה
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing environment variables:', {
        SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      throw new Error('משתנים חסרים בסביבת העבודה');
    }

    // בדיקת תפקיד המשתמש המוסיף
    console.log('🔍 Getting current user...');
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('❌ No authenticated user found');
      throw new Error('משתמש לא מחובר')
    }

    console.log('✅ Current user found:', { id: user.id, email: user.email });
    
    // בדיקת התפקיד של המשתמש המוסיף
    console.log('🔍 Checking current user role...');
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      console.error('❌ Error checking current user role:', userError);
      throw new Error('שגיאה בבדיקת פרטי המשתמש המוסיף')
    }

    console.log('✅ Current user role:', currentUserData.role);
    
    // קביעת סטטוס האישור בהתאם לתפקיד המוסיף
    // אם מנהל מערכת מוסיף - המשתמש מאושר אוטומטית
    // אחרת, צריך אישור ממנהל מערכת
    const is_approved = currentUserData.role === 'admin' ? true : false
    
    // ✅ BYPASS לאדמין - מנהלי מערכת יכולים ליצור משתמשים ללא מגבלות מכסה
    if (currentUserData.role === 'admin') {
      console.log('🔑 Admin bypass: יצירת משתמש ללא בדיקת מכסה')
    }
    
    console.log('🔍 Creating supabase admin client...');
    // בדיקה אם המשתמש כבר קיים ב-Auth לפי האימייל
    const { data: existingUsers, error: existingError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (existingError) {
      console.error('❌ Error checking existing users:', existingError);
      throw new Error(`שגיאה בבדיקת משתמשים קיימים: ${existingError.message}`)
    }

    console.log('✅ Checked existing users, found:', existingUsers.users.length);
    
    // חיפוש משתמש קיים לפי אימייל
    const existingUser = existingUsers.users.find(user => user.email === userData.email)
    let authUser

    // אם המשתמש כבר קיים
    if (existingUser) {
      console.log('ℹ️ משתמש קיים במערכת Auth, מעדכן פרטים')
      authUser = existingUser
    } else {
      console.log('🔍 Creating new user in Auth...');
      // יצירת משתמש חדש ב-Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
        }
      })

      if (authError) {
        console.error('❌ Error creating user in Auth:', authError);
        throw authError;
      }
      if (!authData.user) {
        console.error('❌ Auth user creation returned no user');
        throw new Error('משתמש לא נוצר ב-Auth');
      }
      
      console.log('✅ User created in Auth:', authData.user.id);
      authUser = authData.user
    }

    console.log('🔍 Checking if user exists in public.users...');
    // בדיקה אם המשתמש כבר קיים בטבלת public.users
    const { data: existingPublicUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle()
    
    console.log('ℹ️ User exists in public.users:', !!existingPublicUser);

    // ולידציה נוספת לפני upsert
    if (userData.company_id) {
      console.log('🔍 Validating company_id exists...');
      const { data: companyExists, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('id', userData.company_id)
        .maybeSingle();
      
      if (companyError) {
        console.error('❌ Error validating company:', companyError);
        throw new Error(`שגיאה בבדיקת חברה: ${companyError.message}`);
      }
      
      if (!companyExists) {
        console.error('❌ Company not found:', userData.company_id);
        throw new Error(`החברה שנבחרה לא קיימת במערכת`);
      }
      
      console.log('✅ Company validation passed');
    }

    console.log('🔍 Upserting user to public.users...');
    console.log('📋 Upsert data:', {
      id: authUser.id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      company_id: userData.company_id || null,
      is_approved: is_approved
    });
    
    // בדיקה אם המשתמש כבר קיים ב-public.users
    const { data: existingPublicUserCheck } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();
    
    if (existingPublicUserCheck) {
      console.log('🔄 Updating existing user in public.users...');
      // עדכון משתמש קיים
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          company_id: userData.company_id || null,
          is_approved: is_approved
        })
        .eq('id', authUser.id);

      if (updateError) {
        console.error('❌ שגיאה בעדכון משתמש בטבלת users:', updateError);
        console.error('❌ Update error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        throw new Error(`Database error updating user: ${updateError.message}`)
      }
      
      console.log('✅ User updated in public.users successfully');
    } else {
      console.log('➕ Inserting new user to public.users...');
      // הוספת משתמש חדש
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUser.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          company_id: userData.company_id || null,
          is_approved: is_approved
        });

      if (insertError) {
        console.error('❌ שגיאה בהוספת משתמש בטבלת users:', insertError);
        console.error('❌ Insert error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        throw new Error(`Database error creating user: ${insertError.message}`)
      }
      
      console.log('✅ User inserted to public.users successfully');
    }

    console.log('✅ User upserted to public.users successfully');
    
    // אם קיים כבר משתמש בטבלה הציבורית והוא עודכן, עדכן גם את הסיסמה
    if (existingPublicUser) {
      console.log('🔍 Updating password for existing user...');
      const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: userData.password }
      )
      
      if (updatePasswordError) {
        console.warn('⚠️ שגיאה בעדכון סיסמה למשתמש קיים:', updatePasswordError)
      } else {
        console.log('✅ Password updated for existing user');
      }
    }

    // רענון הדף לאחר יצירת המשתמש
    console.log('🔄 Revalidating path...');
    revalidatePath('/dashboard/admin/users')
    
    console.log('✅ User creation completed successfully');
    // החזר את הסטטוס שנבחר כדי להציג הודעה מתאימה למשתמש
    return { 
      success: true, 
      user: authUser,
      is_approved: is_approved,
      isExisting: !!existingPublicUser
    }
  } catch (error) {
    console.error('❌ שגיאה ביצירת משתמש:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
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

 