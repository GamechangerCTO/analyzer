import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // בדיקת Content-Type
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        { status: 400 }
      )
    }

    const { 
      packageId, 
      packageName, 
      additionalUsers, 
      price, 
      companyId, 
      requestedBy,
      originalPrice,
      discount,
      savings,
      paymentMethod,
      transactionId,
      isPaid
    } = body

    // בדיקת נתונים בסיסיים עם הודעות ספציפיות
    const missingFields = []
    if (!packageId) missingFields.push('packageId')
    if (!packageName) missingFields.push('packageName')
    if (!additionalUsers || additionalUsers <= 0) missingFields.push('additionalUsers')
    if (!price || price <= 0) missingFields.push('price')
    if (!companyId) missingFields.push('companyId')
    if (!requestedBy) missingFields.push('requestedBy')

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields)
      return NextResponse.json(
        { 
          error: 'חסרים נתונים נדרשים', 
          missingFields,
          details: `חסרים השדות: ${missingFields.join(', ')}`
        },
        { status: 400 }
      )
    }

    // בדיקת תקינות UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(companyId) || !uuidRegex.test(requestedBy)) {
      return NextResponse.json(
        { error: 'Invalid UUID format for companyId or requestedBy' },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    let supabase
    try {
      supabase = createClient(cookieStore)
    } catch (clientError) {
      console.error('Supabase client creation error:', clientError)
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      )
    }
    
    // וודא שהמשתמש מחובר ורשאי
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Auth error:', userError)
      return NextResponse.json(
        { error: 'Authentication failed', details: userError.message },
        { status: 401 }
      )
    }

    if (!user) {
      console.error('No authenticated user')
      return NextResponse.json(
        { error: 'No authenticated user' },
        { status: 401 }
      )
    }

    if (user.id !== requestedBy) {
      console.error('User mismatch:', { userId: user.id, requestedBy })
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    // קבלת פרטי החברה והמשתמש
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id, role, full_name')
      .eq('id', requestedBy)
      .single()

    if (userDataError) {
      console.error('User data error:', userDataError)
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      )
    }

    if (!userData || userData.company_id !== companyId) {
      console.error('Company mismatch:', { userCompanyId: userData?.company_id, companyId })
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

    if (companyError) {
      console.error('Company data error:', companyError)
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // הכנת נתוני הבקשה
    const requestNotes = {
      type: 'quota_purchase',
      package_id: packageId,
      package_name: packageName,
      additional_users: additionalUsers,
      price: price,
      original_price: originalPrice || price,
      discount: discount || null,
      savings: savings || 0,
      payment_method: paymentMethod || null,
      transaction_id: transactionId || null,
      is_paid: isPaid || false,
      requester_name: userData.full_name,
      company_name: companyData.name,
      current_quota: await getCurrentQuota(supabase, companyId),
      timestamp: new Date().toISOString()
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
        notes: JSON.stringify(requestNotes)
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create purchase request', details: insertError.message },
        { status: 500 }
      )
    }

    // יצירת התראה למנהלי המערכת
    try {
      await createAdminNotification(supabase, {
        companyId,
        companyName: companyData.name,
        requesterName: userData.full_name || 'משתמש לא ידוע',
        packageName,
        additionalUsers,
        price,
        requestId: purchaseRequest.id,
        isPaid: isPaid || false,
        transactionId: transactionId || null
      })
    } catch (notificationError) {
      console.error('Notification error (non-critical):', notificationError)
      // ממשיכים גם אם יצירת ההתראה נכשלה
    }

    return NextResponse.json({
      success: true,
      message: isPaid 
        ? 'תשלום התקבל בהצלחה! המכסה תעודכן בקרוב'
        : 'בקשה לרכישת מכסה נשלחה בהצלחה',
      requestId: purchaseRequest.id
    })

  } catch (error) {
    console.error('Error in purchase-request API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
    isPaid?: boolean
    transactionId?: string | null
  }
) {
  try {
    // קבלת כל מנהלי המערכת
    const { data: admins } = await supabase
      .from('system_admins')
      .select('user_id')

    if (admins && admins.length > 0) {
      const notificationTitle = data.isPaid 
        ? 'תשלום התקבל - עדכון מכסה נדרש'
        : 'בקשה לרכישת מכסת משתמשים'
      
      const notificationMessage = data.isPaid
        ? `${data.requesterName} מחברת ${data.companyName} שילם עבור ${data.packageName} (+${data.additionalUsers} משתמשים) בסך ${data.price}₪. נדרש עדכון מכסה.`
        : `${data.requesterName} מחברת ${data.companyName} ביקש לרכוש ${data.packageName} (+${data.additionalUsers} משתמשים) בעלות ${data.price}₪`

      // יצירת התראה לכל מנהל מערכת
      const notifications = admins.map((admin: { user_id: string }) => ({
        user_id: admin.user_id,
        company_id: data.companyId,
        title: notificationTitle,
        message: notificationMessage,
        notification_type: data.isPaid ? 'quota_payment_received' : 'quota_purchase_request',
        action_url: `/dashboard/admin/agent-requests`,
        metadata: {
          requestId: data.requestId,
          companyId: data.companyId,
          companyName: data.companyName,
          requesterName: data.requesterName,
          packageName: data.packageName,
          additionalUsers: data.additionalUsers,
          price: data.price,
          type: 'quota_purchase',
          isPaid: data.isPaid || false,
          transactionId: data.transactionId || null
        }
      }))

      const { error } = await supabase
        .from('agent_notifications')
        .insert(notifications)

      if (error) {
        console.error('Error creating notifications:', error)
        throw error
      }
    }
  } catch (error) {
    console.error('Error creating admin notifications:', error)
    throw error
  }
} 