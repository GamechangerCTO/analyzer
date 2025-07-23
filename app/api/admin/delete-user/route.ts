import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export async function DELETE(request: NextRequest) {
  try {
    // יצירת קליינט עם service role key
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const body = await request.json()
    const { userId, adminId } = body

    if (!userId || !adminId) {
      return NextResponse.json({ 
        error: 'חסרים נתונים נדרשים' 
      }, { status: 400 })
    }

    // בדיקה שהמשתמש הנוכחי הוא אדמין
    const { data: adminUser } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single()

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ 
        error: 'אין הרשאה לביצוע פעולה זו' 
      }, { status: 403 })
    }

    // קבלת פרטי המשתמש לפני המחיקה
    const { data: userToDelete, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, company_id, role')
      .eq('id', userId)
      .single()

    if (getUserError || !userToDelete) {
      return NextResponse.json({ 
        error: 'משתמש לא נמצא' 
      }, { status: 404 })
    }

    // שלב 1: מחיקת השיחות של המשתמש (אופציונלי - אפשר להשאיר עם NULL user_id)
    console.log('🗑️ Updating calls to remove user reference...')
    const { error: callsUpdateError } = await supabaseAdmin
      .from('calls')
      .update({ user_id: null })
      .eq('user_id', userId)

    if (callsUpdateError) {
      console.warn('⚠️ Warning updating calls:', callsUpdateError)
    }

    // שלב 2: מחיקת סימולציות של המשתמש
    console.log('🗑️ Deleting user simulations...')
    const { error: simulationsError } = await supabaseAdmin
      .from('simulations')
      .delete()
      .eq('agent_id', userId)

    if (simulationsError) {
      console.warn('⚠️ Warning deleting simulations:', simulationsError)
    }

    // שלב 3: מחיקת בקשות אישור קשורות
    console.log('🗑️ Deleting related approval requests...')
    const { error: requestsError } = await supabaseAdmin
      .from('agent_approval_requests')
      .delete()
      .eq('requested_by', userId)

    if (requestsError) {
      console.warn('⚠️ Warning deleting approval requests:', requestsError)
    }

    // שלב 4: מחיקת המשתמש מטבלת users
    console.log('🗑️ Deleting user from users table...')
    const { error: deleteUserError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteUserError) {
      throw new Error(`שגיאה במחיקת משתמש מטבלת users: ${deleteUserError.message}`)
    }

    // שלב 5: עדכון מכסת החברה (אם המשתמש היה משויך לחברה)
    if (userToDelete.company_id) {
      console.log('📊 Updating company quotas...')
      
      // ספירת משתמשים נוכחיים בחברה
      const { data: companyUsers, error: countError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('company_id', userToDelete.company_id)

      if (!countError) {
        const currentUserCount = companyUsers?.length || 0

        // עדכון מכסת המשתמשים
        const { error: quotaUpdateError } = await supabaseAdmin
          .from('company_user_quotas')
          .update({ 
            used_users: currentUserCount,
            updated_at: new Date().toISOString()
          })
          .eq('company_id', userToDelete.company_id)

        if (quotaUpdateError) {
          console.warn('⚠️ Warning updating user quota:', quotaUpdateError)
        }
      }
    }

    // שלב 6: מחיקת המשתמש מ-Supabase Auth (אופציונלי)
    console.log('🗑️ Deleting user from auth...')
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authDeleteError) {
      console.warn('⚠️ Warning deleting from auth:', authDeleteError)
      // לא נכשיל את כל התהליך בגלל זה
    }

    console.log('✅ User deleted successfully')

    return NextResponse.json({ 
      success: true, 
      message: `המשתמש ${userToDelete.full_name || userToDelete.email} נמחק בהצלחה`,
      deletedUser: {
        id: userToDelete.id,
        email: userToDelete.email,
        full_name: userToDelete.full_name
      }
    })

  } catch (error) {
    console.error('❌ Error in delete-user API:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'שגיאה פנימית בשרת' 
    }, { status: 500 })
  }
} 