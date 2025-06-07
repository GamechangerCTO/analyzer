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
    const { fullName, email, companyId, requestedBy } = body

    if (!fullName || !email || !companyId || !requestedBy) {
      return NextResponse.json({ error: 'חסרים נתונים נדרשים' }, { status: 400 })
    }

    // בדיקה אם אפשר להוסיף משתמש לחברה (יש מקום במכסה)
    const { data: canAddData, error: canAddError } = await supabaseAdmin
      .rpc('can_add_user_to_company', { p_company_id: companyId })

    if (canAddError) {
      console.error('Error checking quota:', canAddError)
      return NextResponse.json({ error: 'שגיאה בבדיקת מכסה' }, { status: 500 })
    }

    // אם אין מקום במכסה - יצירת בקשה לאישור אדמין
    if (!canAddData) {
      // קבלת נתוני המכסה להודעה ברורה יותר
      const { data: quotaData } = await supabaseAdmin
        .rpc('get_company_user_quota', { p_company_id: companyId })

      const quota = quotaData?.[0]

      const { error: requestError } = await supabaseAdmin
        .from('agent_approval_requests')
        .insert({
          company_id: companyId,
          full_name: fullName,
          email: email,
          requested_by: requestedBy,
          status: 'pending'
        })

      if (requestError) {
        return NextResponse.json({ error: 'שגיאה ביצירת בקשה לאישור' }, { status: 400 })
      }

      // יצירת התראה למנהלי מערכת
      await createSystemAdminNotification(supabaseAdmin, {
        fullName,
        email,
        companyId,
        requestedBy,
        reason: 'exceeded_quota',
        currentQuota: quota
      })

      return NextResponse.json({ 
        requiresApproval: true,
        message: `הגעת למכסת המשתמשים המותרת (${quota?.used_users}/${quota?.total_users}). הבקשה נשלחה לאישור מנהל המערכת.`,
        quota: quota
      })
    }

    // יש מקום במכסה - יצירת משתמש מיידית
    const tempPassword = generateTempPassword()
    
    // בדיקה אם המשתמש כבר קיים
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser.users.find(u => u.email === email)

    if (userExists) {
      return NextResponse.json({ error: 'משתמש עם כתובת אימייל זו כבר קיים במערכת' }, { status: 400 })
    }

    // יצירת משתמש חדש
    const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'agent',
        company_id: companyId
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
          email: email,
          full_name: fullName,
          role: 'agent',
          company_id: companyId,
          is_approved: true,
          manager_id: requestedBy
        })

      if (insertError) {
        // אם נכשל בהוספה לטבלה, נמחק את המשתמש מה-auth
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        return NextResponse.json({ error: `שגיאה בהוספת משתמש לטבלה: ${insertError.message}` }, { status: 400 })
      }
    }

    // יצירת התראה למבקש
    await createSuccessNotification(supabaseAdmin, {
      fullName,
      email,
      companyId,
      requestedBy,
      tempPassword
    })

    return NextResponse.json({ 
      success: true, 
      message: `הנציג ${fullName} נוסף בהצלחה לחברה!`,
      tempPassword: tempPassword,
      directlyAdded: true
    })

  } catch (error) {
    console.error('Error in add-agent API:', error)
    return NextResponse.json({ error: 'שגיאה פנימית בשרת' }, { status: 500 })
  }
}

function generateTempPassword(): string {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
}

async function createSystemAdminNotification(
  supabaseAdmin: any,
  data: {
    fullName: string
    email: string
    companyId: string
    requestedBy: string
    reason: string
    currentQuota?: any
  }
) {
  try {
    // קבלת כל מנהלי המערכת
    const { data: admins } = await supabaseAdmin
      .from('system_admins')
      .select('user_id')

    if (admins && admins.length > 0) {
      const quotaText = data.currentQuota 
        ? `(כרגע ${data.currentQuota.used_users}/${data.currentQuota.total_users})`
        : ''

      // יצירת התראה לכל מנהל מערכת
      const notifications = admins.map((admin: { user_id: string }) => ({
        user_id: admin.user_id,
        company_id: data.companyId,
        title: 'בקשת הוספת נציג - חריגה ממכסה',
        message: `החברה הגיעה למכסת המשתמשים ${quotaText}. מנהל ביקש להוסיף: ${data.fullName} (${data.email})`,
        notification_type: 'agent_request_quota_exceeded',
        action_url: `/dashboard/admin/agent-requests`,
        metadata: {
          requestedBy: data.requestedBy,
          agentName: data.fullName,
          agentEmail: data.email,
          companyId: data.companyId,
          reason: data.reason,
          quota: data.currentQuota
        }
      }))

      await supabaseAdmin
        .from('agent_notifications')
        .insert(notifications)
    }
  } catch (error) {
    console.error('Error creating admin notifications:', error)
  }
}

async function createSuccessNotification(
  supabaseAdmin: any,
  data: {
    fullName: string
    email: string
    companyId: string
    requestedBy: string
    tempPassword: string
  }
) {
  try {
    await supabaseAdmin
      .from('agent_notifications')
      .insert({
        user_id: data.requestedBy,
        company_id: data.companyId,
        title: 'נציג נוסף בהצלחה',
        message: `הנציג ${data.fullName} (${data.email}) נוסף בהצלחה לחברה. סיסמה זמנית: ${data.tempPassword}`,
        notification_type: 'agent_added_success',
        metadata: {
          agentName: data.fullName,
          agentEmail: data.email,
          tempPassword: data.tempPassword
        }
      })
  } catch (error) {
    console.error('Error creating success notification:', error)
  }
} 