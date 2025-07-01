import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, full_name, phone } = body

    if (!email || !full_name) {
      return NextResponse.json(
        { error: 'Email and full name are required' },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    const supabase = createClient()
    
    // קבלת משתמש נוכחי
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // קבלת פרטי המשתמש הנוכחי
    const { data: currentUserData, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (currentUserError || !currentUserData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      )
    }

    // בדיקה שהמשתמש הוא מנהל
    if (currentUserData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers can add agents' },
        { status: 403 }
      )
    }

    const companyId = currentUserData.company_id

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID not found' },
        { status: 400 }
      )
    }

    // בדיקת מכסה זמינה
    const { data: quotaData, error: quotaError } = await supabase
      .rpc('can_add_user_to_company', { p_company_id: companyId })

    if (quotaError) {
      console.error('Error checking quota:', quotaError)
      return NextResponse.json(
        { error: 'Error checking quota' },
        { status: 500 }
      )
    }

    if (!quotaData) {
      // אין מכסה זמינה - מחזיר שגיאה ברורה
      const { data: quotaInfo, error: quotaInfoError } = await supabase
        .rpc('get_company_user_quota', { p_company_id: companyId })

      if (quotaInfoError) {
        console.error('Error getting quota info:', quotaInfoError)
        return NextResponse.json(
          { error: 'No available quota. Please contact admin to increase your user limit.' },
          { status: 400 }
        )
      }

      const quota = quotaInfo?.[0]
      return NextResponse.json(
        { 
          error: 'No available quota',
          message: `החברה שלכם הגיעה למכסה המקסימלית של ${quota?.total_users || 'לא ידוע'} משתמשים. כרגע יש ${quota?.used_users || 'לא ידוע'} משתמשים פעילים. אנא פנו למנהל המערכת להגדלת המכסה.`,
          quota_info: quota
        },
        { status: 400 }
      )
    }

    // בדיקה אם המייל כבר קיים
    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // יש מכסה זמינה - יוצר בקשה לאישור נציג (שתאושר אוטומטית)
    const { data: newRequest, error: insertError } = await supabase
      .from('agent_approval_requests')
      .insert({
        full_name,
        email,
        company_id: companyId,
        requested_by: user.id,
        status: 'approved' // מאושר אוטומטית כי יש מכסה
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating agent request:', insertError)
      return NextResponse.json(
        { error: 'Failed to create agent request' },
        { status: 500 }
      )
    }

    // קבלת מידע מעודכן על המכסה
    const { data: updatedQuota, error: updatedQuotaError } = await supabase
      .rpc('get_company_user_quota', { p_company_id: companyId })

    const quota = updatedQuota?.[0]
    return NextResponse.json({
      success: true,
      message: `נציג ${full_name} נוסף בהצלחה! המכסה שלכם עכשיו: ${quota?.used_users || 'לא ידוע'}/${quota?.total_users || 'לא ידוע'} משתמשים.`,
      request: newRequest,
      quota_info: quota
    })

  } catch (error) {
    console.error('Error in add-agent API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 