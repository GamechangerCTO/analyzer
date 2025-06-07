import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId, companyId, additionalUsers } = body

    if (!requestId || !companyId || !additionalUsers) {
      return NextResponse.json(
        { error: 'חסרים נתונים נדרשים' },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // וודא שהמשתמש מחובר והוא מנהל מערכת
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // בדיקה שהמשתמש הוא מנהל מערכת
    const { data: adminData, error: adminError } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (adminError || !adminData) {
      return NextResponse.json(
        { error: 'Access denied - admin only' },
        { status: 403 }
      )
    }

    // קבלת המכסה הנוכחית
    const { data: currentQuota, error: quotaError } = await supabase
      .rpc('get_company_user_quota', { p_company_id: companyId })

    if (quotaError) {
      console.error('Error getting current quota:', quotaError)
      return NextResponse.json(
        { error: 'Failed to get current quota' },
        { status: 500 }
      )
    }

    if (!currentQuota || currentQuota.length === 0) {
      return NextResponse.json(
        { error: 'Company quota not found' },
        { status: 404 }
      )
    }

    const newTotalUsers = currentQuota[0].total_users + additionalUsers

    // עדכון המכסה
    const { error: updateError } = await supabase
      .from('company_user_quotas')
      .update({ 
        total_users: newTotalUsers,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)

    if (updateError) {
      console.error('Error updating quota:', updateError)
      return NextResponse.json(
        { error: 'Failed to update quota' },
        { status: 500 }
      )
    }

    // סימון הבקשה כאושרה
    const { error: requestUpdateError } = await supabase
      .from('agent_approval_requests')
      .update({ 
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (requestUpdateError) {
      console.error('Error updating request status:', requestUpdateError)
      // לא נכשיל את הבקשה בגלל זה, המכסה כבר עודכנה
    }

    // יצירת התראה לחברה על הגדלת המכסה
    await createCompanyNotification(supabase, {
      companyId,
      additionalUsers,
      newTotalUsers,
      requestId
    })

    return NextResponse.json({
      success: true,
      message: 'רכישת המכסה עובדה בהצלחה',
      newQuota: {
        total_users: newTotalUsers,
        used_users: currentQuota[0].used_users,
        available_users: newTotalUsers - currentQuota[0].used_users
      }
    })

  } catch (error) {
    console.error('Error in process-quota-purchase API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function createCompanyNotification(
  supabase: any,
  data: {
    companyId: string
    additionalUsers: number
    newTotalUsers: number
    requestId: string
  }
) {
  try {
    // קבלת כל מנהלי החברה
    const { data: managers } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', data.companyId)
      .eq('role', 'manager')

    if (managers && managers.length > 0) {
      // יצירת התראה לכל מנהל בחברה
      const notifications = managers.map((manager: { id: string }) => ({
        user_id: manager.id,
        company_id: data.companyId,
        title: 'מכסת המשתמשים הוגדלה!',
        message: `מכסת המשתמשים שלכם הוגדלה ב-${data.additionalUsers} משתמשים. סה"כ זמינים עכשיו: ${data.newTotalUsers} משתמשים`,
        notification_type: 'quota_increased',
        action_url: `/team`,
        metadata: {
          requestId: data.requestId,
          additionalUsers: data.additionalUsers,
          newTotalUsers: data.newTotalUsers,
          type: 'quota_increase'
        }
      }))

      await supabase
        .from('agent_notifications')
        .insert(notifications)
    }
  } catch (error) {
    console.error('Error creating company notifications:', error)
  }
} 