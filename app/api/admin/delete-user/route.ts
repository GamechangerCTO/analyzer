import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRoute, isValidUUID } from '@/lib/api-auth'

export async function DELETE(request: NextRequest) {
  try {
    // אימות session + בדיקת הרשאת admin
    const auth = await authenticateApiRoute({ requiredRoles: ['admin'] })
    if (!auth.success) return auth.error
    const { supabaseAdmin } = auth

    const body = await request.json()
    const { userId } = body

    if (!userId || !isValidUUID(userId)) {
      return NextResponse.json({
        error: 'מזהה משתמש לא תקין'
      }, { status: 400 })
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

      // מכסת משתמשים הוסרה - רק מכסת דקות רלוונטית
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