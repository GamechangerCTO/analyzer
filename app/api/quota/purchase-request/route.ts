import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { packageId, packageName, additionalUsers, price, companyId, requestedBy } = body

    if (!packageId || !packageName || !additionalUsers || !price || !companyId || !requestedBy) {
      return NextResponse.json(
        { error: 'חסרים נתונים נדרשים' },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // וודא שהמשתמש מחובר ורשאי
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user || user.id !== requestedBy) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // קבלת פרטי החברה והמשתמש
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id, role, full_name')
      .eq('id', requestedBy)
      .single()

    if (userDataError || !userData || userData.company_id !== companyId) {
      return NextResponse.json(
        { error: 'User data mismatch' },
        { status: 403 }
      )
    }

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    if (companyError || !companyData) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // נשתמש בטבלת agent_approval_requests זמנית עם שדה מיוחד לזיהוי בקשות רכישה
    const { data: purchaseRequest, error: insertError } = await supabase
      .from('agent_approval_requests')
      .insert({
        company_id: companyId,
        requested_by: requestedBy,
        full_name: `QUOTA_PURCHASE: ${packageName}`,
        email: `quota-${packageId}@purchase.request`,
        status: 'pending',
        notes: JSON.stringify({
          type: 'quota_purchase',
          package_id: packageId,
          package_name: packageName,
          additional_users: additionalUsers,
          price: price,
          requester_name: userData.full_name,
          company_name: companyData.name,
          current_quota: await getCurrentQuota(supabase, companyId)
        })
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating purchase request:', insertError)
      return NextResponse.json(
        { error: 'Failed to create purchase request' },
        { status: 500 }
      )
    }

    // יצירת התראה למנהלי המערכת
    await createAdminNotification(supabase, {
      companyId,
      companyName: companyData.name,
      requesterName: userData.full_name || 'משתמש לא ידוע',
      packageName,
      additionalUsers,
      price,
      requestId: purchaseRequest.id
    })

    return NextResponse.json({
      success: true,
      message: 'בקשה לרכישת מכסה נשלחה בהצלחה',
      requestId: purchaseRequest.id
    })

  } catch (error) {
    console.error('Error in purchase-request API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getCurrentQuota(supabase: any, companyId: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_company_user_quota', { p_company_id: companyId })

    if (error) {
      console.error('Error getting current quota:', error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.error('Error in getCurrentQuota:', error)
    return null
  }
}

async function createAdminNotification(
  supabase: any,
  data: {
    companyId: string
    companyName: string
    requesterName: string
    packageName: string
    additionalUsers: number
    price: number
    requestId: string
  }
) {
  try {
    // קבלת כל מנהלי המערכת
    const { data: admins } = await supabase
      .from('system_admins')
      .select('user_id')

    if (admins && admins.length > 0) {
      // יצירת התראה לכל מנהל מערכת
      const notifications = admins.map((admin: { user_id: string }) => ({
        user_id: admin.user_id,
        company_id: data.companyId,
        title: 'בקשה לרכישת מכסת משתמשים',
        message: `${data.requesterName} מחברת ${data.companyName} ביקש לרכוש ${data.packageName} (+${data.additionalUsers} משתמשים) בעלות ${data.price}₪`,
        notification_type: 'quota_purchase_request',
        action_url: `/dashboard/admin/agent-requests`,
        metadata: {
          requestId: data.requestId,
          companyId: data.companyId,
          companyName: data.companyName,
          requesterName: data.requesterName,
          packageName: data.packageName,
          additionalUsers: data.additionalUsers,
          price: data.price,
          type: 'quota_purchase'
        }
      }))

      await supabase
        .from('agent_notifications')
        .insert(notifications)
    }
  } catch (error) {
    console.error('Error creating admin notifications:', error)
  }
} 