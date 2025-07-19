import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json()
    const supabase = createClient()

    // בדיקת אימות
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // בדיקת מנוי נוכחי
    const { data: subscription, error: subError } = await supabase
      .from('company_subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()

    // בדיקת מכסת דקות
    const { data: quota, error: quotaError } = await supabase
      .from('company_minutes_quotas')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()

    // בדיקת פרטי חברה
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single()

    return NextResponse.json({
      success: true,
      companyId,
      company: company || null,
      companyError: companyError?.message || null,
      subscription: subscription || null,
      subscriptionError: subError?.message || null,
      quota: quota || null,
      quotaError: quotaError?.message || null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Debug subscription API error:', error)
    return NextResponse.json(
      { 
        error: 'שגיאה פנימית בשרת', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 