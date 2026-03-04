import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRoute, isValidUUID } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    // אימות session + בדיקת הרשאת admin
    const auth = await authenticateApiRoute({ requiredRoles: ['admin'] })
    if (!auth.success) return auth.error
    const { user: adminUser, supabaseAdmin } = auth

    const adminId = adminUser.id // שימוש ב-session במקום body

    // 🔐 בדיקת הרשאות
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
    const { requestId, reason } = body

    if (!requestId || !isValidUUID(requestId)) {
      return NextResponse.json({ error: 'מזהה בקשה לא תקין' }, { status: 400 })
    }

    // קבלת פרטי הבקשה
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('agent_approval_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !requestData) {
      return NextResponse.json({ error: 'לא נמצאה בקשה' }, { status: 404 })
    }

    // עדכון סטטוס הבקשה
    const { error: updateError } = await supabaseAdmin
      .from('agent_approval_requests')
      .update({
        status: 'rejected',
        approved_by: adminId,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json({ error: `שגיאה בעדכון סטטוס: ${updateError.message}` }, { status: 400 })
    }

    // יצירת התראה למנהל שביקש
    await createNotificationForRequester(supabaseAdmin, requestData, 'rejected', reason)

    return NextResponse.json({
      success: true,
      message: `הבקשה של ${requestData.full_name} נדחתה`
    })

  } catch (error) {
    console.error('Error in reject-agent API:', error)
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