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
    const { quotaId, newTotal, adminId } = body

    if (!quotaId || !newTotal || !adminId) {
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

    // קבלת פרטי המכסה הנוכחיים
    const { data: currentQuota, error: quotaError } = await supabaseAdmin
      .from('company_user_quotas')
      .select('company_id, used_users')
      .eq('id', quotaId)
      .single()

    if (quotaError || !currentQuota) {
      return NextResponse.json({ error: 'לא נמצאה מכסה להעדכן' }, { status: 404 })
    }

    // בדיקה שהמכסה החדשה לא קטנה ממספר המשתמשים הקיימים
    if (newTotal < currentQuota.used_users) {
      return NextResponse.json({ 
        error: `לא ניתן לקבוע מכסה של ${newTotal} כאשר יש כבר ${currentQuota.used_users} משתמשים בשימוש`
      }, { status: 400 })
    }

    // עדכון מכסת המשתמשים
    const { data, error } = await supabaseAdmin
      .from('company_user_quotas')
      .update({
        total_users: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', quotaId)
      .select('*, companies!inner(name)')

    if (error) {
      return NextResponse.json({ error: `שגיאה בעדכון מכסה: ${error.message}` }, { status: 400 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'לא נמצאה מכסה להעדכן' }, { status: 404 })
    }

    const updatedQuota = data[0]

    // יצירת התראה למנהלי החברה
    await createCompanyNotification(supabaseAdmin, {
      companyId: currentQuota.company_id,
      companyName: (updatedQuota as any).companies?.name || 'לא ידוע',
      newQuota: newTotal,
      oldQuota: currentQuota.used_users,
      adminId
    })

    return NextResponse.json({ 
      success: true, 
      message: `מכסת המשתמשים עודכנה בהצלחה ל-${newTotal} משתמשים`,
      data: updatedQuota
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
    oldQuota: number
    adminId: string
  }
) {
  try {
    // קבלת כל מנהלי החברה
    const { data: managers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('company_id', data.companyId)
      .in('role', ['manager', 'owner'])

    if (managers && managers.length > 0) {
      // יצירת התראה לכל מנהל בחברה
      const notifications = managers.map((manager: { id: string }) => ({
        user_id: manager.id,
        company_id: data.companyId,
        title: 'מכסת המשתמשים עודכנה',
        message: `מנהל המערכת עדכן את מכסת המשתמשים של החברה ל-${data.newQuota} משתמשים (זמינים עכשיו: ${data.newQuota - data.oldQuota})`,
        notification_type: 'red_flag_warning', // נשתמש בסוג קיים
        priority: 'normal',
        metadata: {
          newQuota: data.newQuota,
          oldQuota: data.oldQuota,
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