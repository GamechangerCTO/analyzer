import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createClient()

    // קריאה לפונקציה שמבצעת מחיקה של שיחות ישנות
    const { data, error } = await supabase.rpc('manual_cleanup_old_calls')

    if (error) {
      console.error('Error during cleanup:', error)
      return NextResponse.json(
        { 
          error: 'Failed to cleanup old calls', 
          details: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ...data
    })

  } catch (error: any) {
    console.error('Unexpected error during cleanup:', error)
    return NextResponse.json(
      { 
        error: 'Unexpected error occurred', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// GET endpoint לבדיקת מצב (כמה שיחות מחכות למחיקה)
export async function GET() {
  try {
    const supabase = createClient()

    // בדיקה כמה שיחות מחכות למחיקה
    const { data: callsToDelete, error: countError } = await supabase
      .from('calls')
      .select('id, created_at, deletion_date, call_type')
      .lte('deletion_date', new Date().toISOString().split('T')[0])

    if (countError) {
      return NextResponse.json(
        { error: 'Failed to check calls status', details: countError.message },
        { status: 500 }
      )
    }

    // בדיקת לוגים אחרונים
    const { data: recentLogs, error: logsError } = await supabase
      .from('cleanup_logs')
      .select('*')
      .order('execution_time', { ascending: false })
      .limit(5)

    return NextResponse.json({
      calls_waiting_for_deletion: callsToDelete?.length || 0,
      calls_details: callsToDelete || [],
      recent_cleanup_logs: recentLogs || [],
      current_date: new Date().toISOString().split('T')[0],
      message: callsToDelete?.length === 0 
        ? 'No calls need to be deleted at this time'
        : `${callsToDelete.length} calls are ready for deletion`
    })

  } catch (error: any) {
    console.error('Error checking cleanup status:', error)
    return NextResponse.json(
      { error: 'Failed to check status', details: error.message },
      { status: 500 }
    )
  }
}
