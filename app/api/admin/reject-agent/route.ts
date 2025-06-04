import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database.types'

export async function POST(request: NextRequest) {
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
    const { requestId, adminId, reason } = body

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