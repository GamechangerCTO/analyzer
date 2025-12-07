import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database.types'

export async function POST(request: NextRequest) {
  try {
    // 🔐 אימות המשתמש מה-session - לא מהבקשה!
    const supabaseAuth = createRouteHandlerClient<Database>({ cookies })
    const { data: { session } } = await supabaseAuth.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'לא מחובר למערכת' }, { status: 401 })
    }

    // 🔐 קבלת ה-adminId מה-session
    const adminId = session.user.id

    // יצירת קליינט עם service role key לפעולות ניהול
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

    // 🔐 בדיקת הרשאות - רק admin/owner/super admin יכולים לאשר
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('role, company_id')
      .eq('id', adminId)
      .single()

    const { data: isSuperAdmin } = await supabaseAdmin
      .from('system_admins')
      .select('id')
      .eq('user_id', adminId)
      .single()

    if (!currentUser || (!['admin', 'owner', 'manager'].includes(currentUser.role) && !isSuperAdmin)) {
      return NextResponse.json({ error: 'אין הרשאה לביצוע פעולה זו' }, { status: 403 })
    }

    const body = await request.json()
    const { requestId } = body

    // קבלת פרטי הבקשה
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('agent_approval_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !requestData) {
      return NextResponse.json({ error: 'לא נמצאה בקשה' }, { status: 404 })
    }

    // יצירת משתמש חדש
    const tempPassword = generateTempPassword()
    const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: requestData.full_name,
        role: 'agent',
        company_id: requestData.company_id
      }
    })

    if (userError) {
      return NextResponse.json({ error: `שגיאה ביצירת משתמש: ${userError.message}` }, { status: 400 })
    }

    // הוספת המשתמש לטבלת users
    if (newUser.user) {
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: newUser.user.id,
          email: requestData.email,
          full_name: requestData.full_name,
          role: 'agent',
          company_id: requestData.company_id,
          is_approved: true
        })

      if (insertError) {
        // אם נכשל בהוספה לטבלה, נמחק את המשתמש מה-auth
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        return NextResponse.json({ error: `שגיאה בהוספת משתמש לטבלה: ${insertError.message}` }, { status: 400 })
      }
    }

    // עדכון סטטוס הבקשה
    const { error: updateError } = await supabaseAdmin
      .from('agent_approval_requests')
      .update({
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json({ error: `שגיאה בעדכון סטטוס: ${updateError.message}` }, { status: 400 })
    }

    // יצירת התראה למנהל שביקש
    await createNotificationForRequester(supabaseAdmin, requestData, 'approved')

    return NextResponse.json({ 
      success: true, 
      message: `הנציג ${requestData.full_name} אושר בהצלחה!`,
      tempPassword: tempPassword 
    })

  } catch (error) {
    console.error('Error in approve-agent API:', error)
    return NextResponse.json({ error: 'שגיאה פנימית בשרת' }, { status: 500 })
  }
}

async function createNotificationForRequester(
  supabaseAdmin: any,
  request: any, 
  action: 'approved' | 'rejected',
  reason?: string
) {
  try {
    const message = action === 'approved' 
      ? `בקשתך להוספת הנציג ${request.full_name} אושרה על ידי מנהל המערכת`
      : `בקשתך להוספת הנציג ${request.full_name} נדחתה${reason ? `: ${reason}` : ''}`

    await supabaseAdmin
      .from('agent_notifications')
      .insert({
        user_id: request.requested_by,
        company_id: request.company_id,
        title: action === 'approved' ? 'בקשת נציג אושרה' : 'בקשת נציג נדחתה',
        message,
        notification_type: 'agent_request_response',
        metadata: {
          requestId: request.id,
          action,
          reason: reason || null,
          agentName: request.full_name
        }
      })
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}

function generateTempPassword() {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
} 