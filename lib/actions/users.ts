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
    
    // ניסיון להביא משתמש לפי אימייל (בדיקה יותר ישירה)
    console.log('🔍 Checking if user exists by email...');
    let authUser;
    let userExists = false;
    
    try {
      // ניסיון לחפש משתמש לפי אימייל
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ Error listing users:', listError);
        throw new Error(`שגיאה בשליפת רשימת משתמשים: ${listError.message}`);
      }
      
      console.log('✅ Listed existing users, found:', existingUsers.users.length);
      
      // חיפוש לפי אימייל
      const existingUser = existingUsers.users.find(user => user.email === userData.email);
      
      if (existingUser) {
        console.log('ℹ️ משתמש כבר קיים ב-Auth:', existingUser.id);
        authUser = existingUser;
        userExists = true;
        
        // עדכון סיסמה למשתמש קיים אם נדרש
        if (userData.password) {
          console.log('🔄 Updating password for existing user...');
          const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
            authUser.id,
            { password: userData.password }
          );
          
          if (updatePasswordError) {
            console.warn('⚠️ Warning updating password:', updatePasswordError.message);
          } else {
            console.log('✅ Password updated successfully');
          }
        }
      }
    } catch (listError) {
      console.warn('⚠️ Could not list users, will try to create directly:', listError);
    }
    
    // אם המשתמש לא קיים, ננסה ליצור חדש
    if (!userExists) {
      console.log('🔍 Creating new user in Auth...');
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name,
          }
        });

        if (authError) {
          console.error('❌ Error creating user in Auth:', authError);
          
          // אם השגיאה היא שהמשתמש כבר קיים, ננסה לחפש אותו שוב
          if (authError.message.includes('already') || authError.message.includes('exists') || authError.code === 'duplicate_email') {
            console.log('🔄 User might already exist, trying to find again...');
            
            // ניסיון נוסף לחפש
            const { data: retryUsers } = await supabaseAdmin.auth.admin.listUsers();
            const foundUser = retryUsers?.users.find(user => user.email === userData.email);
            
            if (foundUser) {
              console.log('✅ Found existing user on retry:', foundUser.id);
              authUser = foundUser;
              userExists = true;
            } else {
              throw new Error(`המשתמש ${userData.email} כבר קיים במערכת אבל לא ניתן לגשת אליו`);
            }
          } else {
            throw authError;
          }
        } else if (!authData.user) {
          throw new Error('משתמש לא נוצר ב-Auth');
        } else {
          console.log('✅ User created in Auth:', authData.user.id);
          authUser = authData.user;
        }
      } catch (createError) {
        console.error('❌ Final error creating user:', createError);
        throw createError;
      }
    }

    // ולידציה שיש לנו authUser
    if (!authUser) {
      throw new Error('לא הצלחנו ליצור או למצוא משתמש ב-Auth');
    }

    console.log('🔍 Checking if user exists in public.users...');
    // בדיקה אם המשתמש כבר קיים בטבלת public.users
    const { data: existingPublicUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle()
    
    console.log('ℹ️ User exists in public.users:', !!existingPublicUser);

    // ולידציה: אדמינים לא צריכים להיות משויכים לחברה
    if (userData.role === 'admin' && userData.company_id) {
      console.error('❌ Admin user cannot have company association');
      throw new Error('מנהלי מערכת לא צריכים להיות משויכים לחברה ספציפית');
    }

    // ולידציה: מנהלים ונציגים חייבים להיות משויכים לחברה
    if ((userData.role === 'manager' || userData.role === 'agent') && !userData.company_id) {
      const roleText = userData.role === 'manager' ? 'מנהלים' : 'נציגים';
      console.error(`❌ ${userData.role} user must have company association`);
      throw new Error(`${roleText} חייבים להיות משויכים לחברה. אנא בחר חברה`);
    }

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
    
    // אם קיים כבר משתמש בטבלה הציבורית והוא עודכן, עדכן גם את הסיסמה (רק אם לא עודכנו כבר)
    if (existingPublicUser && !userExists && userData.password) {
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
      isExisting: !!existingPublicUser || userExists
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

 