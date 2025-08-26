import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // בדיקת אישור - מקבל גם מ-Vercel Cron וגם עם API key
    const apiKey = request.headers.get('x-api-key')
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron')
    const expectedApiKey = process.env.MONTHLY_RESET_API_KEY
    
    // מאושר אם זה מגיע מוורסל או עם API key נכון
    if (!isVercelCron && (!expectedApiKey || apiKey !== expectedApiKey)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key or not from Vercel Cron' },
        { status: 401 }
      )
    }

    const supabase = createClient()

    // לוג תחילת התהליך
    console.log(`🚀 Monthly reset triggered from: ${isVercelCron ? 'Vercel Cron' : 'Manual API'} at ${new Date().toISOString()}`)

    // הרצת פונקציית איפוס הדקות החודשית
    const { data, error } = await supabase.rpc('reset_monthly_minutes' as any)

    if (error) {
      console.error('Monthly reset error:', error)
      return NextResponse.json(
        { error: 'Failed to reset monthly minutes', details: error.message },
        { status: 500 }
      )
    }

    // לוג התוצאות
    const logData = {
      timestamp: new Date().toISOString(),
      source: isVercelCron ? 'Vercel Cron' : 'Manual API',
      companiesReset: data?.length || 0,
      details: data
    }
    
    console.log('🔄 Monthly minutes reset completed:', logData)

    // עדכון גם בטבלת company_minutes_quotas אם קיימת
    try {
      const { error: quotaError } = await supabase.rpc('sync_subscription_quotas' as any)
      if (quotaError && !quotaError.message.includes('function "sync_subscription_quotas" does not exist')) {
        console.warn('Quota sync warning:', quotaError)
      }
    } catch (e) {
      console.log('Quota sync skipped (function may not exist)')
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly minutes reset completed successfully',
      companiesReset: data?.length || 0,
      details: data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Monthly reset API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint לבדיקת סטטוס
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // שימוש בפונקציה החדשה לבדיקת סטטוס
    const { data: billingStatus, error } = await supabase.rpc('check_monthly_billing_status' as any)

    if (error) {
      throw error
    }

    const needsReset = billingStatus?.filter(sub => sub.needs_reset) || []
    const nextReset = billingStatus?.filter(sub => !sub.needs_reset)
      .sort((a, b) => a.days_until_reset - b.days_until_reset)[0]

    return NextResponse.json({
      totalActiveSubscriptions: billingStatus?.length || 0,
      subscriptionsNeedingReset: needsReset.length,
      nextResetDue: nextReset ? `${nextReset.company_name} in ${nextReset.days_until_reset} days (${nextReset.next_billing_date})` : 'None scheduled',
      details: billingStatus?.map(sub => ({
        companyName: sub.company_name,
        joinDate: sub.join_date,
        nextBillingDate: sub.next_billing_date,
        daysUntilReset: sub.days_until_reset,
        currentMinutes: sub.current_minutes,
        planMinutes: sub.plan_minutes,
        needsReset: sub.needs_reset,
        billingCycle: sub.billing_cycle
      })) || []
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check reset status' },
      { status: 500 }
    )
  }
}