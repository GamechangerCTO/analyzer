import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  checkSimulationLimits, 
  getCompanyLimits, 
  getCompanyUsageStats,
  updateCompanyLimits
} from '@/lib/simulation-limits'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const company_id = searchParams.get('company_id')

    // בדיקת אימות
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // בדיקת הרשאות - רק אדמינים או החברה עצמה
    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    const isAdmin = userData?.role === 'admin'
    const isOwnCompany = userData?.company_id === company_id

    if (!isAdmin && !isOwnCompany) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!company_id) {
      return NextResponse.json({ error: 'Missing company_id parameter' }, { status: 400 })
    }

    switch (action) {
      case 'limits':
        const limits = await getCompanyLimits(company_id, supabase)
        return NextResponse.json({ success: true, limits })

      case 'usage-stats':
        const stats = await getCompanyUsageStats(company_id, supabase)
        return NextResponse.json({ success: true, stats })

      case 'check-simulation':
        const duration = parseInt(searchParams.get('duration') || '10')
        const check = await checkSimulationLimits(company_id, duration, supabase)
        return NextResponse.json({ success: true, check })

      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Simulation limits API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process request',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { action, company_id, duration_minutes, limits } = body

    // בדיקת אימות
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (action) {
      case 'check-simulation':
        // בדיקת הרשאות - כל משתמש יכול לבדוק עבור החברה שלו
        const { data: userData } = await supabase
          .from('users')
          .select('company_id, role')
          .eq('id', user.id)
          .single()

        const isAdmin = userData?.role === 'admin'
        const isOwnCompany = userData?.company_id === company_id

        if (!isAdmin && !isOwnCompany) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const check = await checkSimulationLimits(company_id, duration_minutes, supabase)
        return NextResponse.json({ success: true, check })

      case 'update-limits':
        // רק אדמינים יכולים לעדכן הגבלות
        const { data: adminCheck } = await supabase
          .from('system_admins')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!adminCheck) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const updated = await updateCompanyLimits(company_id, limits, supabase)
        return NextResponse.json({ success: updated })

      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Simulation limits POST error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process request',
      details: error.message
    }, { status: 500 })
  }
}


