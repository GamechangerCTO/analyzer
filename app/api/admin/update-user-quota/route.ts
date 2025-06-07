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
    const { companyId, totalUsers, adminId } = body

    if (!companyId || !totalUsers || !adminId) {
      return NextResponse.json({ error: 'חסרים נתונים נדרשים' }, { status: 400 })
    }

    // בדיקה שהמשתמש הוא אדמין
    const { data: adminData } = await supabaseAdmin
      .from('system_admins')
      .select('user_id')
      .eq('user_id', adminId)
      .single()

    if (!adminData) {
      return NextResponse.json({ error: 'אין הרשאה לביצוע פעולה זו' }, { status: 403 })
    }

    // עדכון מכסת המשתמשים
    const { data, error } = await supabaseAdmin
      .from('company_user_quotas')
      .upsert({
        company_id: companyId,
        total_users: totalUsers,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id'
      })
      .select()

    if (error) {
      return NextResponse.json({ error: `שגיאה בעדכון מכסה: ${error.message}` }, { status: 400 })
    }

    // קבלת פרטי החברה להודעה
    const { data: companyData } = await supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    // יצירת התראה למנהלי החברה
    await createCompanyNotification(supabaseAdmin, {
      companyId,
      companyName: companyData?.name || 'לא ידוע',
      newQuota: totalUsers,
      adminId
    })

    return NextResponse.json({ 
      success: true, 
      message: `מכסת המשתמשים עודכנה בהצלחה ל-${totalUsers} משתמשים`,
      data: data
    })

  } catch (error) {
    console.error('Error in update-user-quota API:', error)
    return NextResponse.json({ error: 'שגיאה פנימית בשרת' }, { status: 500 })
  }
}

async function createCompanyNotification(
  supabaseAdmin: any,
  data: {
    companyId: string
    companyName: string
    newQuota: number
    adminId: string
  }
) {
  try {
    // קבלת כל מנהלי החברה
    const { data: managers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('company_id', data.companyId)
      .eq('role', 'manager')

    if (managers && managers.length > 0) {
      // יצירת התראה לכל מנהל בחברה
      const notifications = managers.map((manager: { id: string }) => ({
        user_id: manager.id,
        company_id: data.companyId,
        title: 'מכסת המשתמשים עודכנה',
        message: `מנהל המערכת עדכן את מכסת המשתמשים של החברה ל-${data.newQuota} משתמשים`,
        notification_type: 'quota_updated',
        metadata: {
          newQuota: data.newQuota,
          updatedBy: data.adminId,
          companyName: data.companyName
        }
      }))

      await supabaseAdmin
        .from('agent_notifications')
        .insert(notifications)
    }
  } catch (error) {
    console.error('Error creating company notifications:', error)
  }
} 