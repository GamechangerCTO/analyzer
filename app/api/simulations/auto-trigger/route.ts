import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { extractWeakParameters, getTopWeakParameters } from '@/lib/extract-weak-parameters'

/**
 * Cron Job לסימולציה אוטומטית
 * רץ כל 24 שעות (צריך להגדיר ב-vercel.json: "0 0 * * *")
 * מזהה שיחות חדשות עם ציון < 8 ויוצר notifications לנציגים
 */
export async function POST(request: Request) {
  try {
    // אימות (אופציונלי - אפשר להוסיף secret key)
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET || 'your-secret-key'
    
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()
    
    console.log('🤖 מתחיל Cron Job - סימולציה אוטומטית')
    
    // 1. שליפת שיחות חדשות (24 שעות אחרונות) עם ציון < 8
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: recentCalls, error: callsError } = await supabase
      .from('calls')
      .select('*, users!inner(id, full_name, company_id, role)')
      .gte('created_at', twentyFourHoursAgo)
      .lt('overall_score', 8)
      .eq('processing_status', 'completed')
      .not('content_analysis', 'is', null)
      .order('created_at', { ascending: false })
    
    if (callsError) {
      console.error('❌ שגיאה בשליפת שיחות:', callsError)
      return NextResponse.json({ error: 'שגיאה בשליפת שיחות' }, { status: 500 })
    }
    
    console.log(`📊 נמצאו ${recentCalls?.length || 0} שיחות עם ציון < 8`)
    
    if (!recentCalls || recentCalls.length === 0) {
      return NextResponse.json({ 
        message: 'לא נמצאו שיחות חדשות עם ציון נמוך',
        callsProcessed: 0,
        notificationsCreated: 0
      })
    }
    
    // 2. קיבוץ לפי נציג (מקסימום 5 שיחות לנציג)
    const callsByAgent = recentCalls.reduce((acc: any, call: any) => {
      const agentId = call.user_id
      if (!acc[agentId]) {
        acc[agentId] = []
      }
      if (acc[agentId].length < 5) {
        acc[agentId].push(call)
      }
      return acc
    }, {})
    
    console.log(`👥 נמצאו ${Object.keys(callsByAgent).length} נציגים עם שיחות חלשות`)
    
    let notificationsCreated = 0
    let notificationsFailed = 0
    
    // 3. עבור כל נציג - חילוץ פרמטרים חלשים ויצירת notification
    for (const [agentId, calls] of Object.entries(callsByAgent) as [string, any[]][]) {
      try {
        // חילוץ כל הפרמטרים החלשים מכל השיחות
        const allWeakParams = calls.flatMap(call => 
          extractWeakParameters(call.content_analysis || {})
        )
        
        // קבלת 5 החלשים ביותר
        const topWeakParams = getTopWeakParameters(allWeakParams, 5)
        
        if (topWeakParams.length === 0) {
          console.log(`⏭️ נציג ${agentId}: לא נמצאו פרמטרים חלשים מספיק`)
          continue
        }
        
        const agentData = calls[0].users
        
        // בדיקה אם כבר יש notification פעילה לנציג הזה
        const { data: existingNotif } = await supabase
          .from('simulation_notifications')
          .select('id')
          .eq('agent_id', agentId)
          .is('simulation_created_at', null)
          .gte('created_at', twentyFourHoursAgo)
          .single()
        
        if (existingNotif) {
          console.log(`⏭️ נציג ${agentId}: כבר יש notification פעילה`)
          continue
        }
        
        // יצירת notification חדשה
        const { data: notification, error: notifError } = await supabase
          .from('simulation_notifications')
          .insert({
            agent_id: agentId,
            company_id: agentData.company_id,
            notification_type: 'auto_pending',
            call_ids: calls.map(c => c.id),
            parameters_to_practice: topWeakParams,
            message: `זוהו ${topWeakParams.length} תחומים לשיפור מ-${calls.length} שיחות אחרונות. מומלץ לבצע סימולציה אימון.`
          })
          .select()
          .single()
        
        if (notifError) {
          console.error(`❌ שגיאה ביצירת notification לנציג ${agentId}:`, notifError)
          notificationsFailed++
        } else {
          console.log(`✅ נוצרה notification לנציג ${agentId}`)
          notificationsCreated++
        }
        
      } catch (error) {
        console.error(`❌ שגיאה בעיבוד נציג ${agentId}:`, error)
        notificationsFailed++
      }
    }
    
    console.log(`📊 סיכום: ${notificationsCreated} notifications נוצרו, ${notificationsFailed} נכשלו`)
    
    // 4. בדיקת notifications שלא טופלו ב-24 שעות → התראה למנהל
    const { data: overdueNotifications, error: overdueError } = await supabase
      .from('simulation_notifications')
      .select('*, users!inner(id, full_name, company_id, role)')
      .eq('notification_type', 'auto_pending')
      .is('simulation_created_at', null)
      .lt('created_at', twentyFourHoursAgo)
      .is('reminded_manager_at', null)
    
    if (overdueError) {
      console.error('❌ שגיאה בשליפת notifications ישנות:', overdueError)
    }
    
    let managersNotified = 0
    
    if (overdueNotifications && overdueNotifications.length > 0) {
      console.log(`⏰ נמצאו ${overdueNotifications.length} notifications שלא טופלו`)
      
      // קיבוץ לפי חברה
      const notifsByCompany = overdueNotifications.reduce((acc: any, notif: any) => {
        const companyId = notif.company_id
        if (!acc[companyId]) {
          acc[companyId] = []
        }
        acc[companyId].push(notif)
        return acc
      }, {})
      
      // עבור כל חברה - מציאת מנהלים ויצירת התראה
      for (const [companyId, notifs] of Object.entries(notifsByCompany) as [string, any[]][]) {
        try {
          // מציאת כל המנהלים בחברה
          const { data: managers } = await supabase
            .from('users')
            .select('id')
            .eq('company_id', companyId)
            .in('role', ['manager', 'admin'])
          
          if (!managers || managers.length === 0) {
            console.log(`⏭️ חברה ${companyId}: לא נמצאו מנהלים`)
            continue
          }
          
          // יצירת notification לכל מנהל
          for (const manager of managers) {
            const agentNames = notifs.map((n: any) => n.users.full_name).join(', ')
            
            await supabase
              .from('simulation_notifications')
              .insert({
                agent_id: manager.id,
                company_id: companyId,
                notification_type: 'auto_overdue',
                call_ids: [],
                parameters_to_practice: [],
                message: `${notifs.length} נציגים לא ביצעו סימולציות מומלצות: ${agentNames}`
              })
            
            managersNotified++
          }
          
          // עדכון הנוטיפיקציות המקוריות שהודעה למנהל
          for (const notif of notifs) {
            await supabase
              .from('simulation_notifications')
              .update({ 
                reminded_manager_at: new Date().toISOString(),
                notification_type: 'auto_overdue'
              })
              .eq('id', notif.id)
          }
          
        } catch (error) {
          console.error(`❌ שגיאה בטיפול בחברה ${companyId}:`, error)
        }
      }
      
      console.log(`📧 נשלחו ${managersNotified} התראות למנהלים`)
    }
    
    // 5. סיכום
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      callsFound: recentCalls.length,
      agentsProcessed: Object.keys(callsByAgent).length,
      notificationsCreated,
      notificationsFailed,
      overdueNotifications: overdueNotifications?.length || 0,
      managersNotified
    }
    
    console.log('✅ Cron Job הסתיים בהצלחה:', summary)
    
    return NextResponse.json(summary)
    
  } catch (error) {
    console.error('💥 שגיאה כללית ב-Cron Job:', error)
    return NextResponse.json({ 
      error: 'שגיאה כללית',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint למטרות בדיקה
export async function GET() {
  return NextResponse.json({
    message: 'Auto-trigger Cron Job endpoint',
    usage: 'POST with Authorization: Bearer <CRON_SECRET>',
    schedule: 'Every 24 hours at 00:00',
    features: [
      'מזהה שיחות חדשות עם ציון < 8',
      'מחלץ פרמטרים חלשים',
      'יוצר notifications לנציגים',
      'מתריע למנהלים על נציגים שלא ביצעו'
    ]
  })
}

