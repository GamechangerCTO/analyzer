import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const { callId } = await request.json()
    
    if (!callId) {
      return NextResponse.json({ error: 'Call ID is required' }, { status: 400 })
    }

    // שליפת השיחה
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select(`
        id, user_id, company_id, overall_score, call_type, 
        analysis_report, created_at,
        users!inner(full_name, email, company_id, role)
      `)
      .eq('id', callId)
      .single()

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // בדיקה האם הציון מתחת ל-7 ולא נוצרה כבר סימולציה
    if (call.overall_score !== null && call.overall_score < 7) {
      // בדיקה שלא קיימת כבר סימולציה לשיחה זו
      const { data: existingSimulation } = await supabase
        .from('simulations')
        .select('id')
        .eq('triggered_by_call_id', callId)
        .single()

      if (!existingSimulation) {
        // ספירת שיחות מתחת ל-7 שלא בוצעה להן סימולציה
        const { data: lowScoreCalls, count } = await supabase
          .from('calls')
          .select('id', { count: 'exact' })
          .eq('user_id', call.user_id || '')
          .lt('overall_score', 7)
          .not('id', 'in', `(
            SELECT triggered_by_call_id 
            FROM simulations 
            WHERE triggered_by_call_id IS NOT NULL 
            AND agent_id = '${call.user_id || ''}'
          )`)

        const lowScoreCount = count || 0

        // יצירת התראה לנציג
        await supabase
          .from('agent_notifications')
          .insert({
            user_id: call.user_id || '',
            company_id: call.company_id || '',
            notification_type: 'simulation_required',
            title: 'נדרש תרגול נוסף',
            message: `קיבלת ציון ${call.overall_score} בשיחת ${call.call_type}. מומלץ לתרגל כדי לשפר את הביצועים`,
            action_url: `/simulations?call_id=${callId}`,
            priority: lowScoreCount >= 2 ? 'urgent' : 'high',
            metadata: {
              call_id: callId,
              score: call.overall_score,
              call_type: call.call_type,
              low_score_count: lowScoreCount
            }
          })

        // אם יש 2 או יותר שיחות מתחת ל-7 - דגל אדום למנהל
        if (lowScoreCount >= 2) {
          // שליפת מנהל החברה
          const { data: managers } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('company_id', call.company_id || '')
            .eq('role', 'manager')

          if (managers && managers.length > 0) {
            // יצירת התראות למנהלים
            const managerNotifications = managers.map(manager => ({
              user_id: manager.id,
              company_id: call.company_id || '',
              notification_type: 'red_flag_warning',
              title: 'דגל אדום - נציג זקוק לתמיכה',
              message: `${(call.users as any).full_name || 'נציג'} צבר ${lowScoreCount} שיחות עם ציון מתחת ל-7 ללא תרגול`,
              action_url: `/team?agent_id=${call.user_id || ''}`,
              priority: 'urgent',
              metadata: {
                agent_id: call.user_id || '',
                agent_name: (call.users as any).full_name || 'נציג',
                low_score_count: lowScoreCount,
                latest_call_id: callId
              }
            }))

            await supabase
              .from('agent_notifications')
              .insert(managerNotifications)

            // שליחת אימייל למנהלים (אופציונלי)
            try {
              await fetch('/api/notifications/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'red_flag',
                  recipients: managers.map(m => m.email),
                  data: {
                    agent_name: (call.users as any).full_name || 'נציג',
                    low_score_count: lowScoreCount,
                    company_name: call.company_id || ''
                  }
                })
              })
            } catch (emailError) {
              console.error('Failed to send email notification:', emailError)
            }
          }
        }

        return NextResponse.json({ 
          needsSimulation: true,
          lowScoreCount,
          triggerRedFlag: lowScoreCount >= 2
        })
      }
    }

    return NextResponse.json({ 
      needsSimulation: false,
      score: call.overall_score
    })

  } catch (error) {
    console.error('Error checking low score call:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 